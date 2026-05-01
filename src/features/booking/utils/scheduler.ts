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
      // 1. 获取当天所有的订单
      const { data: allBookings } = await BookingService.getBookings(shopId);
      const todayBookings = allBookings.filter(b => b.date === dateStr);

      // 【终极排爆过滤记录】：记录每个订单进场前的原始 resourceId 和 startTime
      // 必须在应用 manualOverrides 之前记录，否则会把拖拽后的新时间当成旧时间，导致存盘被跳过！
      const originalStateMap = new Map(todayBookings.map(b => [b.id, {
        resourceId: b.resourceId,
        startTime: b.startTime
      }]));

      // 应用手动内存覆盖 (防止视图延迟导致读取到旧状态)
      if (manualOverrides) {
        todayBookings.forEach(b => {
          // 【核心修复】：新建订单在入库时被换发了真实的 UUID，导致 b.id 无法匹配覆盖字典。
          // 必须去认它的 order_no（临时 BKG- 快照），这样才能成功挂载 _needsTimeReflow 标记！
          const overrideData = manualOverrides[b.id] || (b.order_no && manualOverrides[b.order_no]);
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

      const absoluteBookings: any[] = [];
      const pushdownBookings: any[] = [];
      const floatingBookings: any[] = [];

      // 2. 剥离并分类
      todayBookings.forEach((b) => {
        if (b.resourceId === 'NO') {
          absoluteBookings.push(b);
        } else if (b._needsTimeReflow && b.resourceId && !b.originalUnassigned) {
          // 明确指定了员工，且被标记需要重新排盘（例如弹窗分配给 ALEXA）
          pushdownBookings.push(b);
        } else if (b.originalUnassigned) {
          // 真正的未指定订单，清空记忆重新寻位
          b.resourceId = undefined;
          floatingBookings.push(b);
        } else if (b._needsTimeReflow && b.resourceId) {
          // 原本无指定但刚刚被分配了目标，且需要顺延检测
          pushdownBookings.push(b);
        } else {
          // 正常已固定订单
          absoluteBookings.push(b);
        }
      });

      // 排序函数，优先按开始时间排
      const sortByTime = (a: any, b: any) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      pushdownBookings.sort(sortByTime);
      floatingBookings.sort(sortByTime);

      const placedBookings = [...absoluteBookings];

      // 辅助函数：计算两个时间段的重叠分钟数
      const calculateOverlap = (startA: number, endA: number, startB: number, endB: number) => {
        const overlapStart = Math.max(startA, startB);
        const overlapEnd = Math.min(endA, endB);
        return Math.max(0, overlapEnd - overlapStart);
      };

      // 辅助函数：在一个员工列上寻找/顺延空位 (引入重叠容忍度法则)
      // toleranceMins: 允许与旧订单重叠的最大分钟数（例如 20）。如果是 0，代表绝对防撞（散客）。
      const findSlotOnStaff = (booking: any, staffId: string, startMin: number, toleranceMins: number) => {
        let currentStart = startMin;
        const duration = booking.duration || 60;
        
        while (true) {
          const currentEnd = currentStart + duration;
          
          // 检查该员工的所有已放置订单是否与我们发生碰撞
          const conflict = placedBookings.find(placed => {
            if (placed.resourceId !== staffId) return false;
            if (placed.shopId && booking.shopId && placed.shopId !== booking.shopId) return false;
            
            const pStartMin = timeToMinutes(placed.startTime);
            const pEndMin = pStartMin + (placed.duration || 60);
            
            // 计算新老订单的重叠时间
            const overlapMins = calculateOverlap(currentStart, currentEnd, pStartMin, pEndMin);
            
            // 【核心重构：废弃起点检测，引入面积容忍度】
            // 只要重叠时间大于容忍度，就判定为冲突（碍事了）
            return overlapMins > toleranceMins;
          });
          
          if (!conflict) {
            return currentStart; // 找到空位，允许放置
          } else {
            // 发生不可容忍的冲突，必须顺延
            // 【核心重构：绝对不许挤压别人，只能改变自己的落点】
            // 我们把自己顺延到那个挡路订单的结束时间，然后再次循环检测
            const conflictEndMin = timeToMinutes(conflict.startTime) + (conflict.duration || 60);
            currentStart = conflictEndMin;
          }
        }
      };

      // 3. 处理指定了员工，但需要顺延检测的订单 (Pushdown - 轨道二：店长强塞容忍重叠)
      pushdownBookings.forEach(bkg => {
        const targetStaffId = bkg.resourceId;
        const originalStartMin = timeToMinutes(bkg.startTime);
        
        // 店长指定的，允许软穿透，容忍度设为 15 分钟 (符合门店实际可容忍等待时间)
        // 如果是多项任务并发 (带有 _siblingIndex)，我们需要根据兄弟的情况进行接力判定
        let actualStartMin = originalStartMin;
        
        if (bkg.masterOrderId && bkg._siblingIndex > 0) {
          // 这是同一个客人的第 N 个项目。我们先去看看它的“前一个兄弟”目前被排到了什么时候
          const prevSibling = placedBookings.find(p => p.masterOrderId === bkg.masterOrderId && p._siblingIndex === bkg._siblingIndex - 1);
          if (prevSibling) {
             // 我们先尝试让它和前一个兄弟“并发”（即使用原始时间 originalStartMin）
             // 去看一眼如果放在 originalStartMin，会不会与员工的已有订单严重冲突
             const testConflict = placedBookings.find(placed => {
                if (placed.resourceId !== targetStaffId) return false;
                if (placed.shopId && bkg.shopId && placed.shopId !== bkg.shopId) return false;
                const pStartMin = timeToMinutes(placed.startTime);
                const pEndMin = pStartMin + (placed.duration || 60);
                const currentEnd = originalStartMin + (bkg.duration || 60);
                return calculateOverlap(originalStartMin, currentEnd, pStartMin, pEndMin) > 15;
             });

             if (testConflict) {
               // 如果严重冲突，说明无法并发！触发【智能接力】，它的起点必须在前一个兄弟结束之后
               actualStartMin = timeToMinutes(prevSibling.startTime) + (prevSibling.duration || 60);
             }
          }
        }

        const newStartMin = findSlotOnStaff(bkg, targetStaffId, actualStartMin, 15);
        bkg.startTime = minutesToTime(newStartMin);
        
        placedBookings.push(bkg);
      });

      // 4. 处理未指定员工的订单 (Floating - 轨道一：散客绝对防撞)
      floatingBookings.forEach(bkg => {
        const originalStartMin = timeToMinutes(bkg.startTime);
        let foundStaffId = null;
        let bestStartMin = originalStartMin;

        // 从左到右扫描员工，看能不能在原始时间塞下
        for (const staff of staffs) {
          if (staff.id === 'NEXUS' || staff.id === 'NO') continue;
          
          // 散客自己找位置，必须绝对无重叠 (容忍度 = 0)
          const newStartMin = findSlotOnStaff(bkg, staff.id, originalStartMin, 0);
          if (newStartMin === originalStartMin) {
            foundStaffId = staff.id;
            bestStartMin = newStartMin;
            break;
          }
        }

        if (!foundStaffId) {
          // 如果所有人都放不下（都会顺延），那就选第一个员工强制顺延
          const fallbackStaff = staffs.find(s => s.id !== 'NEXUS' && s.id !== 'NO');
          if (fallbackStaff) {
            foundStaffId = fallbackStaff.id;
            bestStartMin = findSlotOnStaff(bkg, fallbackStaff.id, originalStartMin, 0);
          }
        }

        bkg.resourceId = foundStaffId;
        bkg.startTime = minutesToTime(bestStartMin);
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
           if (!originalState || b.resourceId !== originalState.resourceId || b.startTime !== originalState.startTime) {
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
           if (!originalState || b.resourceId !== originalState.resourceId || b.startTime !== originalState.startTime) {
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
               if (!originalState || b.resourceId !== originalState.resourceId || b.startTime !== originalState.startTime) {
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
               
               finalUpdatedBookings.push(baseBooking);
             }
           });
        }
      });

      // 6. 并发存盘：更新状态并销毁多余躯壳
      if (finalUpdatedBookings.length > 0) {
        await BookingService.upsertBookings(finalUpdatedBookings);
      }
      if (idsToDelete.length > 0) {
        await BookingService.deleteBookings(idsToDelete);
      }

    } catch (error) {
      console.error("[BookingScheduler] reflowDayBookings Error:", error);
    }
  }
};
