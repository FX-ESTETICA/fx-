import { useMemo } from 'react'
import { isSameDay, format } from 'date-fns'
import { useCalendarStore } from '../store/useCalendarStore'
import { 
  SERVICE_CATEGORIES, 
  COLOR_TO_STAFF_ID, 
  getCleanColorName,
  CalendarEvent 
} from '@/utils/calendar-constants'
import { calculateTotalPrice, getEventStartTime } from '@/utils/calendar-helpers'

export function useBillingState() {
  const {
    selectedDate,
    editingEvent,
    events,
    staffMembers,
    itemStaffMap,
    manualTotalAmount,
    customItemPrices,
    selectedMember,
    memberInfo,
    newTitle,
    selectedColor,
    duration
  } = useCalendarStore()

  const memberId = selectedMember?.card || '';

  // Merged events for checkout (same member, same day)
  const mergedEvents = useMemo(() => {
    if (!selectedDate || !memberId) return [];
    
    // Get all events from the database for this member on this day
    const otherEvents = events.filter(e => {
      // Exclude the current editing event if it's already in the list to avoid duplication
      if (editingEvent && e.id === editingEvent.id) return false;
      
      const eDate = getEventStartTime(e);
      // Check if same day and same member ID
      // 优先从原子化字段提取信息
      let eventMemberId = e.customer_id;
      let eventMemberName = e.customer_name || '';
      
      let isSameMember = eventMemberId === memberId;
      
      // If it's a walk-in (0000), also ensure the names match exactly
      if (isSameMember && memberId === '0000') {
        const currentName = memberInfo.trim();
        if (currentName === '') {
          isSameMember = false;
        } else {
          isSameMember = eventMemberName === currentName;
        }
      }
      
      return isSameMember && isSameDay(eDate, selectedDate);
    });

    // Combine with current form state as a pseudo-event
    const currentEventState: CalendarEvent = {
      id: editingEvent?.id || 'new',
      service_item: newTitle,
      service_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(selectedDate, 'HH:mm:ss'),
      duration: duration || 30,
      bg_color: selectedColor,
      // 不再使用 notes 拼接，改为结构化 context_snapshot
      context_snapshot: {
        item_staff_map: itemStaffMap,
        selected_staff_id: COLOR_TO_STAFF_ID[getCleanColorName(selectedColor) || ''] || 'NO'
      },
      customer_name: memberInfo,
      customer_id: memberId,
    };

    return [...otherEvents, currentEventState].filter(e => {
      const title = e.service_item;
      return title && title.trim() !== '';
    });
  }, [selectedDate, memberId, events, editingEvent, newTitle, itemStaffMap, memberInfo, selectedColor, duration]);

  // Total price for all merged events and split calculations
  const { mergedTotalPrice, atomicSplits } = useMemo(() => {
    const PLATFORM_FEE_RATE = 0.05; // 5% 平台服务费
    let total = 0;
    const splits = {
      merchant: 0,
      staff: 0,
      platform: 0
    };

    mergedEvents.forEach((event) => {
      const ev = event as CalendarEvent;
      const serviceItem = ev.service_item || '';
      const eventItems = serviceItem.split(',').map((s: string) => s.trim()).filter(Boolean);
      const factor = ev.dynamic_price_factor || 1.0;
      
      const snapshot = ev.context_snapshot || {};
      
      eventItems.forEach((itemName: string, idx: number) => {
        const itemKey = `${ev.id}-${itemName}-${idx}`;
        const customPrice = customItemPrices[itemKey];
        let itemPrice = 0;
        
        if (customPrice !== undefined && customPrice !== null && customPrice !== '') {
          itemPrice = Number(customPrice);
        } else {
          itemPrice = calculateTotalPrice(itemName, SERVICE_CATEGORIES);
        }

        const adjustedPrice = itemPrice * factor;
        total += adjustedPrice;

        // Find staff for this item to get commission rate
        // 优先从 context_snapshot 读取
        const staffId = snapshot.item_staff_map?.[itemKey] || 
                        snapshot.item_staff_map?.[itemName] || 
                        snapshot.selected_staff_id || 
                        COLOR_TO_STAFF_ID[getCleanColorName(ev.bg_color) || ''] || 
                        'NO';
        
        const staff = staffMembers.find(s => s.id === staffId || s.name === staffId);
        const commissionRate = staff?.commission_rate || 0;

        // Atomic split calculation (Value Protocol)
        const platformCut = adjustedPrice * PLATFORM_FEE_RATE;
        const remaining = adjustedPrice - platformCut;
        const staffCut = remaining * commissionRate;
        const merchantCut = remaining - staffCut;

        splits.platform += platformCut;
        splits.staff += staffCut;
        splits.merchant += merchantCut;
      });
    });

    if (manualTotalAmount !== null) {
      const manualTotal = Number(manualTotalAmount);
      // If manual total is set, we redistribute the splits proportionally
      const ratio = total > 0 ? manualTotal / total : 1;
      return {
        mergedTotalPrice: manualTotal,
        atomicSplits: {
          merchant: splits.merchant * ratio,
          staff: splits.staff * ratio,
          platform: splits.platform * ratio
        }
      };
    }

    return { 
      mergedTotalPrice: total, 
      atomicSplits: splits 
    };
  }, [mergedEvents, manualTotalAmount, customItemPrices, itemStaffMap, staffMembers]);

  const involvedStaffIds = useMemo(() => {
    const ids = new Set<string>();
    
    mergedEvents.forEach(event => {
      const ev = event as CalendarEvent;
      const snapshot = ev.context_snapshot || {};

      // 0. Check billing_details
      if (ev.billing_details?.items) {
        ev.billing_details.items.forEach((item) => {
          if (item.staffId && item.staffId !== 'NO') ids.add(item.staffId);
        });
      }
      if (ev.billing_details?.staff) {
        Object.keys(ev.billing_details.staff).forEach(name => {
          const staff = staffMembers.find(s => s.name === name);
          if (staff) ids.add(staff.id);
        });
      }

      // 1. 优先检查 context_snapshot
      if (snapshot.item_staff_map) {
        Object.values(snapshot.item_staff_map as Record<string, string>).forEach(sId => {
          if (sId && sId !== 'NO') ids.add(sId);
        });
      }
      if (snapshot.selected_staff_id && snapshot.selected_staff_id !== 'NO') {
        ids.add(snapshot.selected_staff_id);
      }

      // 2. 降级方案：旧数据正则解析
      const notes = ev.notes || '';
      const staffMatches = Array.from(notes.matchAll(/\[(.*?)_STAFF:([^\]]+)\]/g)) as RegExpExecArray[];
      for (const match of staffMatches) {
        if (match[2] !== 'NO') ids.add(match[2]);
      }

      // 3. Check background color
      const colorName = getCleanColorName(ev.bg_color || '');
      if (colorName) {
        const staffId = COLOR_TO_STAFF_ID[colorName];
        if (staffId && staffId !== 'NO') ids.add(staffId);
      }
    });
    
    return Array.from(ids);
  }, [mergedEvents, staffMembers]);

  return { mergedEvents, mergedTotalPrice, atomicSplits, involvedStaffIds }
}
