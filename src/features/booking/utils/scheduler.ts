import { BookingService, BookingRecord } from "../api/booking";

/**
 * BookingScheduler - 智能寻位调度大脑
 * 封装从左到右寻找空闲列的核心重排算法
 */
export const BookingScheduler = {
  /**
   * 重新计算指定日期下所有“未指定”订单的落位
   */
  async reflowDayBookings(dateStr: string, shopId: string, staffs: any[]) {
    if (!shopId || shopId === 'default') return;

    try {
      // 1. 获取当天所有的订单
      const { data: allBookings } = await BookingService.getBookings(shopId);
      const todayBookings = allBookings.filter(b => b.date === dateStr);

      const timeToMinutes = (timeStr: string) => {
        const [h, m] = (timeStr || "00:00").split(':').map(Number);
        return h * 60 + m;
      };

      const assignedBookings: any[] = [];
      const unassignedBookings: any[] = [];

      // 2. 剥离并分类：指定预约（含NO）、无指定预约
      todayBookings.forEach((b) => {
        if (b.originalUnassigned && b.resourceId !== 'NO') {
          b.resourceId = undefined; // 清空它之前的坑位记忆，让它变成纯粹的“无家可归”状态
          unassignedBookings.push(b);
        } else {
          assignedBookings.push(b);
        }
      });

      if (unassignedBookings.length === 0) return; // 没啥可排的，收工

      // 3. 对无指定预约进行时间排序（先到先得），保证寻位稳定性
      unassignedBookings.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

      // 4. 核心重排：从左到右依次为无指定预约寻找第一个无冲突的列
      const placedBookings = [...assignedBookings];

      unassignedBookings.forEach(unassignedBkg => {
        const newStartMin = timeToMinutes(unassignedBkg.startTime);
        const newEndMin = newStartMin + (unassignedBkg.duration || 60);
        let foundStaffId = null;

        // 严格从左到右扫描实体员工列
        for (const staff of staffs) {
          if (staff.id === 'NEXUS' || staff.id === 'NO') continue; // 过滤特殊幽灵列

          const hasConflict = placedBookings.some(placed => {
            if (placed.resourceId !== staff.id) return false;
            if (placed.shopId && unassignedBkg.shopId && placed.shopId !== unassignedBkg.shopId) return false;

            const pStartMin = timeToMinutes(placed.startTime);
            const pEndMin = pStartMin + (placed.duration || 60);
            return Math.max(newStartMin, pStartMin) < Math.min(newEndMin, pEndMin);
          });

          if (!hasConflict) {
            foundStaffId = staff.id;
            break; // 找到即落位
          }
        }

        // 如果找到空位则落位，否则兜底放到第一个员工（允许视觉挤压）
        const fallbackId = staffs.find(s => s.id !== 'NEXUS' && s.id !== 'NO')?.id;
        unassignedBkg.resourceId = foundStaffId || fallbackId;
        
        // 落位后，加入 placedBookings 参与后续无指定预约的碰撞检测
        placedBookings.push(unassignedBkg);
      });

      // 5. 仅将重新分配过的无指定订单存盘，避免误伤和多余写入
      await BookingService.upsertBookings(unassignedBookings);

    } catch (error) {
      console.error("[BookingScheduler] reflowDayBookings Error:", error);
    }
  }
};