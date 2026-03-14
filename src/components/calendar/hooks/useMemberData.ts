import { useMemo, useCallback } from 'react'
import { CalendarEvent, Member, MemberHistoryItem, StaffMember } from '@/utils/calendar-constants'
import { useGlobalPassport } from '@/modules/booking/hooks/useGlobalPassport'
import { GlobalPassport } from '@/modules/core/types/omni-flow'

export interface UseMemberDataProps {
  allDatabaseEvents: CalendarEvent[]
  staffMembers: StaffMember[]
  memberSearchQuery: string
  passportCache?: Record<string, GlobalPassport>
}

export function useMemberData({ allDatabaseEvents, staffMembers, memberSearchQuery, passportCache = {} }: UseMemberDataProps) {
  const { getOrCreatePassport } = useGlobalPassport()

  const databaseMembers = useMemo(() => {
    const memberMap = new Map<string, Member>()
    
    allDatabaseEvents.forEach((event: CalendarEvent) => {
      // 优先从原子化字段提取信息
      let id = event.customer_id || '0000'
      let name = event.customer_name || ''
      let phone = event.customer_phone || ''
      
      const key = id !== '0000' ? id : (phone || name)
      if (!key) return

      const existing = memberMap.get(key)
      const eventDate = (event.service_date || '') as string
      if (!eventDate) return
      
      // Enrich with global passport data if available in cache
      const passport = phone ? passportCache[phone] : null;
      
      let amount = 0
      // 优先检查 billing_details
      if (event.billing_details?.manualTotal !== undefined) {
        amount = event.billing_details.manualTotal
      } else if (event.total_amount) {
        amount = event.total_amount
      } else {
        // 向后兼容旧逻辑 (仍然保留 staffMembers 循环，但不再使用 deprecated keys)
        staffMembers.forEach(staff => {
          if (staff.id !== 'NO') {
            const amountVal = event[`金额_${staff.name}` as keyof CalendarEvent]
            if (typeof amountVal === 'number') {
              amount += amountVal
            }
          }
        })
      }

      const notes = event.notes || ""
      const snapshot = event.context_snapshot || {}
      
      // 优先从 context_snapshot 获取金额信息
      if (!amount && snapshot.staff_amounts) {
        Object.values(snapshot.staff_amounts as Record<string, string>).forEach(val => {
          amount += Number(val) || 0
        })
      }
      
      // 降级方案：旧数据正则解析
      if (!amount) {
        const matches = Array.from(notes.matchAll(/\[([^\]]+)_AMT:(\d+)(?:_IDX:\d+)?\]/g))
        if (matches.length > 0) {
          for (const match of matches) {
            amount += Number(match[2]) || 0
          }
        }
      }

      // 优先从 context_snapshot 获取会员备注
      let currentMemberNote = snapshot.member_note || ''
      
      // 降级方案：正则解析
      if (!currentMemberNote) {
        const memberNoteMatch = notes.match(/\[MEMBER_NOTE:(.*?)\]/)
        currentMemberNote = memberNoteMatch ? memberNoteMatch[1] : ''
      }

      if (existing) {
        existing.totalSpend += amount
        existing.totalVisits += 1
        if (eventDate >= existing.lastVisit) {
          existing.lastVisit = eventDate
          if (currentMemberNote) existing.note = currentMemberNote
        }
        if (!existing.name && name) existing.name = name
        if (!existing.phone && phone) existing.phone = phone
        
        // Update level if global passport exists
        if (passport) {
          existing.level = passport.loyalty_points > 1000 ? '全球高级会员' : '全球通行证用户';
        }
        
        // 优先从 snapshot 获取技师 ID
        let staffId = snapshot.selected_staff_id
        if (!staffId) {
          staffId = notes.match(/技师:([^,\]\s]+)/)?.[1]
        }
        
        const staffName = staffMembers.find(s => s.id === staffId)?.name || 'Unknown'
        
        existing.history.push({
          date: eventDate,
          service: event.service_item || "未知服务",
          staff: staffName,
          amount: amount
        })
      } else {
        // 优先从 snapshot 获取技师 ID
        let staffId = snapshot.selected_staff_id
        if (!staffId) {
          staffId = notes.match(/技师:([^,\]\s]+)/)?.[1]
        }
        
        const staffName = staffMembers.find(s => s.id === staffId)?.name || 'Unknown'

        memberMap.set(key, {
          name: name || '',
          phone: phone || '',
          card: id,
          level: passport ? (passport.loyalty_points > 1000 ? '全球高级会员' : '全球通行证用户') : (id.startsWith('NO') ? '爽约名单' : '普通会员'),
          totalSpend: amount,
          totalVisits: 1,
          lastVisit: eventDate,
          note: currentMemberNote,
          history: [{
            date: eventDate,
            service: event.service_item || "未知服务",
            staff: staffName,
            amount: amount
          }]
        })
      }
    })
    
    return Array.from(memberMap.values())
  }, [allDatabaseEvents, staffMembers, passportCache])

  const allMembers = useMemo(() => databaseMembers, [databaseMembers])

  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery) return []
    const query = memberSearchQuery.toLowerCase()
    return allMembers.filter(m => 
      (m.name && m.name.toLowerCase().includes(query)) || 
      (m.phone && m.phone.includes(query)) || 
      (m.card && m.card.toLowerCase().includes(query))
    )
  }, [allMembers, memberSearchQuery])

  /**
   * 异步同步特定成员的全球通行证
   * 用于当用户在搜索列表中点击某个成员时，即刻触发全球画像同步
   */
  const syncGlobalData = useCallback(async (phone: string, onSync?: (passport: GlobalPassport) => void) => {
    if (!phone) return null;
    const { success, data } = await getOrCreatePassport(phone);
    if (success && data && onSync) {
      onSync(data);
    }
    return data;
  }, [getOrCreatePassport]);

  return { allMembers, filteredMembers, syncGlobalData }
}
