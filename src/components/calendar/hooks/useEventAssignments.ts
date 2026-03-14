import { useMemo } from 'react'
import { isSameDay } from 'date-fns'
import { getEventStartTime, getEventEndTime } from '@/utils/calendar-helpers'
import { CalendarEvent, StaffMember, ViewType } from '@/utils/calendar-constants'

interface UseEventAssignmentsProps {
  mode: 'admin' | 'customer'
  events: CalendarEvent[]
  currentDate: Date
  viewType: ViewType
  staffMembers: StaffMember[]
}

export function useEventAssignments({
  mode,
  events,
  currentDate,
  viewType,
  staffMembers
}: UseEventAssignmentsProps) {
  const activeStaff = useMemo(() => {
    let visibleStaff = staffMembers.filter(s => !s.hidden);
    
    if (mode === 'customer') {
      visibleStaff = visibleStaff
        .filter(s => s.id !== 'NO')
        .map((s, idx) => ({
          ...s,
          name: `预约通道 ${idx + 1}`,
          avatar: `${idx + 1}`,
          role: '在线预约'
        }));
    }

    if (viewType !== 'day') return visibleStaff;
    
    return visibleStaff.filter(s => {
      if (s.id !== 'NO') return true;
      return events.some(e => {
        if (!isSameDay(getEventStartTime(e), currentDate)) return false;
        
        // 优先从 context_snapshot 读取
        const snapshot = e.context_snapshot || {};
        if (snapshot.selected_staff_id === 'NO') return true;
        
        // 降级方案：旧数据兼容
        return (e.notes)?.includes('技师:NO');
      });
    });
  }, [viewType, events, currentDate, staffMembers, mode]);

  const eventAssignments = useMemo(() => {
    if (viewType !== 'day') return new Map<string, string>();
    
    const assignments = new Map<string, string>();
    const todayEvents = events.filter(e => isSameDay(getEventStartTime(e), currentDate));
    const regularStaff = activeStaff.filter(s => s.id !== 'NO');

    // 1. Designated appointments
    todayEvents.forEach(e => {
      // 优先从 context_snapshot 读取结构化数据
      const snapshot = e.context_snapshot || {};
      let designatedStaffId = snapshot.selected_staff_id;
      
      // 降级方案：正则解析旧数据
      if (!designatedStaffId) {
        const notes = e.notes || '';
        const staffIdMatch = notes.match(/技师:([^,\]\s]+)/);
        designatedStaffId = staffIdMatch ? staffIdMatch[1] : '';
      }
      
      if (designatedStaffId) assignments.set(e.id, designatedStaffId);
    });

    // 2. Unassigned appointments - Left-align strategy
    const unassignedEvents = todayEvents.filter(e => !assignments.has(e.id))
      .sort((a, b) => getEventStartTime(a).getTime() - getEventStartTime(b).getTime());

    unassignedEvents.forEach(e => {
      const eStart = getEventStartTime(e);
      const eEnd = getEventEndTime(e);
      
      // 优先从原子化字段获取 memberId
      const memberId = e.customer_id || '';

      const availableStaff = regularStaff.find(staff => {
        const hasConflict = Array.from(assignments.entries()).some(([otherId, assignedStaffId]) => {
          if (assignedStaffId !== staff.id) return false;
          const otherE = todayEvents.find(te => te.id === otherId);
          if (!otherE) return false;
          const oStart = getEventStartTime(otherE);
          const oEnd = getEventEndTime(otherE);
          
          const overlaps = (eStart < oEnd && eEnd > oStart);
          if (overlaps && memberId !== '') {
            const otherMemberId = otherE.customer_id || '';
            if (memberId === otherMemberId) return true;
          }
          return overlaps;
        });
        return !hasConflict;
      });

      if (availableStaff) assignments.set(e.id, availableStaff.id);
      else if (regularStaff.length > 0) assignments.set(e.id, regularStaff[0].id);
    });

    return assignments;
  }, [viewType, events, currentDate, activeStaff]);

  return { activeStaff, eventAssignments };
}
