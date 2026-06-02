import { BookingService } from "../api/booking";

/**
 * BookingScheduler - 智能寻位调度大脑
 * 封装从左到右寻找空闲列与时间顺延的核心重排算法
 */
export const BookingScheduler = {
  /**
   * 重新计算指定日期下订单的落位（包含无指定寻位、冲突顺延、连单自愈合并）
   */
  async reflowDayBookings(dateStr: string, shopId: string, staffs: any[], manualOverrides?: Record<string, any>) {
    if (!shopId || shopId === 'default') return;

    try {
      // 1. 只获取当天订单，避免全店超过 1000 条时被 Supabase 默认行数上限截断
      const { data: todayBookings } = await BookingService.getBookingsByDates(shopId, [dateStr]);

      // 【终极排爆过滤记录】：记录每个订单进场前的原始 resourceId 和 startTime
      // 必须在应用 manualOverrides 之前记录，否则会把拖拽后的新时间当成旧时间，导致存盘被跳过！
      const originalStateMap = new Map(todayBookings.map(b => [b.id, {
        resourceId: b.resourceId,
        startTime: b.startTime,
        duration: b.duration // 引入 duration 检查，防止连单合并后的时长变化被忽略
      }]));

      // 应用手动内存覆盖 (防止视图延迟导致读取到旧状态)
      if (manualOverrides) {
        todayBookings.forEach(b => {
          // 【核心修复】：新建订单在入库时被换发了真实的 UUID，导致 b.id 无法匹配覆盖字典。
          // 必须去认它的 order_no（临时 BKG- 快照），这样才能成功挂载 _needsTimeReflow 标记！
          const orderNo = b.order_no as string;
          const overrideData = manualOverrides[b.id] || (orderNo && manualOverrides[orderNo]);
          if (overrideData) {
             Object.assign(b, overrideData);
          }
        });
      }

      const timeToMinutes = (timeStr: string) => {
        const [h, m] = (timeStr || "00:00").split(':').map(Number);
        return h * 60 + m;
      };

      const minutesToTime = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      };

      // 辅助函数：计算两个时间段的重叠分钟数
      const calculateOverlap = (startA: number, endA: number, startB: number, endB: number) => {
        const overlapStart = Math.max(startA, startB);
        const overlapEnd = Math.min(endA, endB);
        return Math.max(0, overlapEnd - overlapStart);
      };

      const absoluteBookings: any[] = [];
      const floatingBookings: any[] = [];
      const softBookings: any[] = [];

      // 2. 剥离并分类
      todayBookings.forEach((b) => {
        // 【突发请假订单被动剥离法则】：如果这单有指定的员工，但该员工今天休息/请假，强制剥离降维为 TBD！
        let isStaffOff = false;
        if (b.resourceId && b.resourceId !== 'NO') {
          const staffInfo = staffs.find(s => s.id === b.resourceId);
          if (staffInfo && staffInfo.scheduleExceptions && staffInfo.scheduleExceptions.length > 0) {
            isStaffOff = staffInfo.scheduleExceptions.some((exc: any) => {
              if (exc.type === 'day_off' || exc.type === 'leave') {
                return exc.startDate === dateStr;
              } else if (exc.type === 'vacation') {
                const start = exc.startDate;
                const end = exc.endDate || exc.startDate;
                return dateStr >= start && dateStr <= end;
              }
              return false;
            });
          }
        }

        if (isStaffOff) {
          // 剥离原主，降维打击为纯正 TBD 散客单，交给调度大脑重新分发
          b.resourceId = undefined;
          b.originalUnassigned = true;
          floatingBookings.push(b);
          console.log(`[BookingScheduler] Evicted booking ${b.id} due to staff off on ${dateStr}`);
        } else if (b.resourceId === 'NO') {
          absoluteBookings.push(b);
        } else if (!b.resourceId) {
          // 完全没有 resourceId，必须寻找
          floatingBookings.push(b);
        } else if (b.originalUnassigned && b._needsTimeReflow) {
          // 刚创建的散客或被明确要求重新寻位的散客
          b.resourceId = undefined;
          floatingBookings.push(b);
        } else if (b.originalUnassigned && !b._needsTimeReflow) {
          // 【柔性实体（老散客）】：可能需要为新指定订单让位
          softBookings.push(b);
        } else {
          // 【绝对实体】：明确指定的订单，或者是被锁死的订单
          absoluteBookings.push(b);
        }
      });

      // 2.5 【驱逐检测】：检查柔性实体是否与绝对实体冲突
      // 如果冲突，则剥离 resourceId，打入浮动池，并记住它原本的主人
      softBookings.forEach((b) => {
        const startMin = timeToMinutes(b.startTime);
        const endMin = startMin + (b.duration || 60);
        
        const isConflicting = absoluteBookings.some(hard => {
          if (hard.resourceId !== b.resourceId) return false;
          if (hard.shopId && b.shopId && hard.shopId !== b.shopId) return false;
          
          const hStart = timeToMinutes(hard.startTime);
          const hEnd = hStart + (hard.duration || 60);
          return calculateOverlap(startMin, endMin, hStart, hEnd) > 0;
        });

        if (isConflicting) {
          // 发生冲突，被硬塞的指定订单挤掉了！
          b._evictedFromResourceId = b.resourceId; // 记住被驱逐前的归属
          b.resourceId = undefined;
          floatingBookings.push(b);
        } else {
          // 没有冲突，原地钉死
          absoluteBookings.push(b);
        }
      });

      // 【散客路权保护法则】：浮动池（无指定）排序必须引入“资历”优先级。
      // _needsTimeReflow 为假的（老散客）排在前面，优先占坑。
      // 其次再按时间排序。
      floatingBookings.sort((a: any, b: any) => {
        const aIsNew = !!a._needsTimeReflow;
        const bIsNew = !!b._needsTimeReflow;
        if (aIsNew !== bIsNew) {
          return aIsNew ? 1 : -1; // 老的 (false) 在前，新的 (true) 在后
        }
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      });

      const placedBookings = [...absoluteBookings];

      // 辅助函数：时间降维归一化 (截断秒数，统一为 HH:mm)
      const normalizeTime = (t: string | undefined | null) => t ? t.substring(0, 5) : "00:00";

      // 辅助函数：在一个员工列上寻找空位 (仅供散客初始寻位使用)
       // 【核心重构：废除顺延】即使是散客寻位，我们也只找“当前时间点是否空闲”。如果被占了，我们不再向后推延（不再计算 conflictEndMin），
       // 而是直接报告“这个点被占了”，让散客去别的员工那里找。如果所有员工都没空，散客才被迫接受重叠或者等待（这里保留基础寻位以确保它能降落）
       const findSlotOnStaff = (booking: any, staffId: string, startMin: number, toleranceMins: number) => {
         const duration = booking.duration || 60;
         const currentEnd = startMin + duration;
         
         const conflict = placedBookings.find(placed => {
           if (placed.resourceId !== staffId) return false;
           if (placed.shopId && booking.shopId && placed.shopId !== booking.shopId) return false;
           
           const pStartMin = timeToMinutes(placed.startTime);
           const pEndMin = pStartMin + (placed.duration || 60);
           
           const overlapMins = calculateOverlap(startMin, currentEnd, pStartMin, pEndMin);
           return overlapMins > toleranceMins;
         });
         
         // 返回冲突发生的时间点，如果没有冲突，则返回原始时间点
         return conflict ? Infinity : startMin; 
       };

      // 3. 处理未指定员工的订单 (Floating - 轨道一：散客绝对防撞)
      floatingBookings.forEach(bkg => {
        const originalStartMin = timeToMinutes(bkg.startTime);
        let foundStaffId = null;
        let bestStartMin = originalStartMin;

        // 【核心修复：水平堆叠 BUG】
        // 如果当前时间点 (originalStartMin) 已经被别的无指定单抢占了，
        // 我们不能让它们像幽灵一样全部挤在同一个坐标上。
        // 所以我们必须把之前已经放置好的所有订单 (placedBookings) 作为障碍物，
        // 强迫每一个新无指定单去进行真实的空位扫描。
        
        // 从左到右扫描员工，看能不能在原始时间塞下
        for (const staff of staffs) {
          if (staff.id === 'NEXUS' || staff.id === 'NO') continue;
          if (staff.status === 'resigned' || staff.status === 'spectator') continue;
          
          // 【物理阻断法则】：检查该员工在当前日期是否处于休息/请假状态
          let isStaffOff = false;
          if (staff.scheduleExceptions && staff.scheduleExceptions.length > 0) {
            isStaffOff = staff.scheduleExceptions.some((exc: any) => {
              if (exc.type === 'day_off' || exc.type === 'leave') {
                return exc.startDate === dateStr;
              } else if (exc.type === 'vacation') {
                const start = exc.startDate;
                const end = exc.endDate || exc.startDate;
                return dateStr >= start && dateStr <= end;
              }
              return false;
            });
          }
          // 如果该员工今天休息，直接跳过这列，绝对不排给他
          if (isStaffOff) continue;

          // 散客自己找位置，必须绝对无重叠 (容忍度 = 0)
          // 这里的 findSlotOnStaff 内部会遍历 placedBookings 进行防撞检测
          const newStartMin = findSlotOnStaff(bkg, staff.id, originalStartMin, 0);
          
          // 如果 newStartMin === originalStartMin，说明在这个员工列，当前时间是绝对空闲的！
          if (newStartMin === originalStartMin) {
            foundStaffId = staff.id;
            bestStartMin = newStartMin;
            break;
          }
        }

        // 如果在 originalStartMin 的时间，所有员工列都满了！
         if (!foundStaffId) {
           // 【兜底逻辑重构】：如果它是被驱逐出来的老散客，且全场都找不到空位了，
           // 它必须回到被驱逐前的员工身上，接受重叠！
           if (bkg._evictedFromResourceId) {
             foundStaffId = bkg._evictedFromResourceId;
             bestStartMin = originalStartMin; // 原地强塞
           } else {
             // 其他新散客，依然强塞给第一个没有休息的员工
             for (const staff of staffs) {
               if (staff.id === 'NEXUS' || staff.id === 'NO') continue;
               if (staff.status === 'resigned' || staff.status === 'spectator') continue;
               let isStaffOff = false;
               if (staff.scheduleExceptions && staff.scheduleExceptions.length > 0) {
                 isStaffOff = staff.scheduleExceptions.some((exc: any) => {
                   if (exc.type === 'day_off' || exc.type === 'leave') { return exc.startDate === dateStr; }
                   else if (exc.type === 'vacation') { return dateStr >= exc.startDate && dateStr <= (exc.endDate || exc.startDate); }
                   return false;
                 });
               }
               if (!isStaffOff) {
                 foundStaffId = staff.id;
                 bestStartMin = originalStartMin; // 原地强塞
                 break;
               }
             }
           }
         }
 
         bkg.resourceId = foundStaffId;
        bkg.startTime = minutesToTime(bestStartMin);
        // 【核心修复：非常关键】必须将它 push 进 placedBookings，这样下一个无指定单就能看见它并绕开它！
        placedBookings.push(bkg);
      });

      // ==========================================
      // 5. 【核心修复：连单同化/自愈 (Super Booking Assimilation)】
      // ==========================================
      const finalUpdatedBookings: any[] = [];
      const idsToDelete: string[] = [];

      // 按 masterOrderId + resourceId 分组
      const mergeGroups: Record<string, any[]> = {};
      
      placedBookings.forEach(b => {
        if (!b.masterOrderId) {
           // 非连单，直接判断是否需要更新
           const originalState = originalStateMap.get(b.id);
           if (!originalState || b.resourceId !== originalState.resourceId || normalizeTime(b.startTime) !== normalizeTime(originalState.startTime)) {
             finalUpdatedBookings.push(b);
           }
           return;
        }

        const groupKey = `${b.masterOrderId}_${b.resourceId}`;
        if (!mergeGroups[groupKey]) mergeGroups[groupKey] = [];
        mergeGroups[groupKey].push(b);
      });

      Object.values(mergeGroups).forEach(group => {
        if (group.length === 1) {
           const b = group[0];
           const originalState = originalStateMap.get(b.id);
           if (!originalState || b.resourceId !== originalState.resourceId || normalizeTime(b.startTime) !== normalizeTime(originalState.startTime)) {
             finalUpdatedBookings.push(b);
           }
        } else {
           // 有多个同根兄弟分配到了同一个员工，必须进行物理缝合 (Merge)
           // 1. 找出基准订单（按时间排序）
           group.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
           
           // 2. 将它们划分为连续的时间块 (Contiguous Sub-groups)
           // 如果两个服务之间被别的客人的预约切断了，我们不应该把它们强行合并成一个超长订单，否则会发生重叠
           const subGroups: any[][] = [[group[0]]];
           
           for (let i = 1; i < group.length; i++) {
             const prev = subGroups[subGroups.length - 1];
             const lastInPrev = prev[prev.length - 1];
             
             const lastEnd = timeToMinutes(lastInPrev.startTime) + (lastInPrev.duration || 60);
             const currentStart = timeToMinutes(group[i].startTime);
             
             // 如果它们是相连的（或者重叠的），归为同一组
             if (currentStart <= lastEnd) {
               prev.push(group[i]);
             } else {
               subGroups.push([group[i]]); // 出现断层，开启新的一组
             }
           }
           
           // 3. 分别合并每一个连续的子组
           subGroups.forEach(subGroup => {
             if (subGroup.length === 1) {
               const b = subGroup[0];
               const originalState = originalStateMap.get(b.id);
               if (!originalState || b.resourceId !== originalState.resourceId || normalizeTime(b.startTime) !== normalizeTime(originalState.startTime)) {
                 finalUpdatedBookings.push(b);
               }
             } else {
               const baseBooking = subGroup[0];
               let totalDuration = 0;
               const mergedServices: any[] = [];
               const serviceNames: string[] = [];
               
               subGroup.forEach(b => {
                 totalDuration += (b.duration || 60);
                 if (Array.isArray(b.services)) {
                    mergedServices.push(...b.services);
                 }
                 if (b.serviceName) {
                    serviceNames.push(b.serviceName);
                 }
                 
                 // 将多余的兄弟躯壳送入销毁队列
                 if (b.id !== baseBooking.id) {
                   idsToDelete.push(b.id);
                 }
               });

               // 去重并拼接服务名
               const uniqueServiceNames = Array.from(new Set(serviceNames.join(' + ').split(' + '))).filter(Boolean);
               
               baseBooking.duration = totalDuration;
               baseBooking.services = mergedServices;
               baseBooking.serviceName = uniqueServiceNames.join(' + ');
               
               // 【极度纯净检查】：在这个庞然大物组装完毕后，再检查它跟之前到底有没有发生物理变化
               const originalState = originalStateMap.get(baseBooking.id);
               if (!originalState || baseBooking.resourceId !== originalState.resourceId || normalizeTime(baseBooking.startTime) !== normalizeTime(originalState.startTime) || baseBooking.duration !== originalState.duration) {
                 finalUpdatedBookings.push(baseBooking);
               }
             }
           });
        }
      });

      // 6. 并发存盘：更新状态并销毁多余躯壳
      if (finalUpdatedBookings.length > 0) {
        // 【数据纯净法则】：入库前抹除所有内存计算专用的瞬态标记，防止永久污染数据库
        finalUpdatedBookings.forEach(b => {
          delete b._needsTimeReflow;
          delete b._isForceInsert;
          delete b._evictedFromResourceId;
        });
        
        await BookingService.upsertBookings(finalUpdatedBookings);
        
        // 【闪烁反馈法则】：向全网广播刚刚被重排或修改的订单ID，触发视觉高亮
        if (typeof window !== 'undefined') {
          const flashedIds = finalUpdatedBookings.map(b => b.id);
          window.dispatchEvent(new CustomEvent('bookings-flashed', { detail: { ids: flashedIds } }));
        }
      }
      if (idsToDelete.length > 0) {
        await BookingService.deleteBookings(idsToDelete);
      }

    } catch (error) {
      console.error("[BookingScheduler] reflowDayBookings Error:", error);
    }
  }
};
