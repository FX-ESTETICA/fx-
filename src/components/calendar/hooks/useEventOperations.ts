import { useState, useCallback } from 'react'
import { format, addMinutes } from 'date-fns'
import { createClient } from '@/utils/supabase/client'
import { getItalyTime } from './useCalendarInit'
import { 
  CalendarEvent, 
  Member, 
  SERVICE_CATEGORIES, 
  FIXED_STAFF_NAMES,
  COLOR_TO_STAFF_ID
} from '@/utils/calendar-constants'
import { 
  getEventStartTime, 
  escapeRegExp
} from '@/utils/calendar-helpers'
import { 
  getStaffColorClass,
  getCleanColorName
} from '@/utils/calendar-constants'
import { useGlobalPassport } from '@/modules/booking/hooks/useGlobalPassport'

import { useCalendarStore } from '@/components/calendar/store/useCalendarStore'

interface UseEventOperationsProps {
  mode?: 'admin' | 'customer'
  allMembers: Member[]
  fetchEvents: () => Promise<void>
  fetchAllEventsForLibrary: () => Promise<void>
  checkVersion: () => Promise<boolean>
  handleSupabaseError: (error: { message?: string; code?: string; status?: number } | any, context: string) => void
}

export function useEventOperations({
  mode,
  allMembers,
  fetchEvents,
  fetchAllEventsForLibrary,
  checkVersion,
  handleSupabaseError,
}: UseEventOperationsProps) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { getOrCreatePassport, getPassportById } = useGlobalPassport()

  // --- Zustand Store (Fine-grained Selectors) ---
  const selectedDate = useCalendarStore(s => s.selectedDate)
  const setSelectedDate = useCalendarStore(s => s.setSelectedDate)
  const setSelectedEndDate = useCalendarStore(s => s.setSelectedEndDate)
  const duration = useCalendarStore(s => s.duration)
  const setDuration = useCalendarStore(s => s.setDuration)
  const newTitle = useCalendarStore(s => s.newTitle)
  const setNewTitle = useCalendarStore(s => s.setNewTitle)
  const memberInfo = useCalendarStore(s => s.memberInfo)
  const setMemberInfo = useCalendarStore(s => s.setMemberInfo)
  const selectedColor = useCalendarStore(s => s.selectedColor)
  const setSelectedColor = useCalendarStore(s => s.setSelectedColor)
  const selectedStaffId = useCalendarStore(s => s.selectedStaffId)
  const setSelectedStaffId = useCalendarStore(s => s.setSelectedStaffId)
  const clickedStaffId = useCalendarStore(s => s.clickedStaffId)
  const setClickedStaffId = useCalendarStore(s => s.setClickedStaffId)
  const itemStaffMap = useCalendarStore(s => s.itemStaffMap)
  const setItemStaffMap = useCalendarStore(s => s.setItemStaffMap)
  const staffAmounts = useCalendarStore(s => s.staffAmounts)
  const setStaffAmounts = useCalendarStore(s => s.setStaffAmounts)
  const customItemPrices = useCalendarStore(s => s.customItemPrices)
  const setCustomItemPrices = useCalendarStore(s => s.setCustomItemPrices)
  const setMemberSearchQuery = useCalendarStore(s => s.setMemberSearchQuery)
  const setIsNewMember = useCalendarStore(s => s.setIsNewMember)
  const memberId = useCalendarStore(s => s.memberId)
  const setMemberId = useCalendarStore(s => s.setMemberId)
  const memberName = useCalendarStore(s => s.memberName)
  const setMemberName = useCalendarStore(s => s.setMemberName)
  const memberNote = useCalendarStore(s => s.memberNote)
  const setMemberNote = useCalendarStore(s => s.setMemberNote)
  const setSelectedMember = useCalendarStore(s => s.setSelectedMember)
  const globalPassport = useCalendarStore(s => s.globalPassport)
  const setGlobalPassport = useCalendarStore(s => s.setGlobalPassport)
  const editingEvent = useCalendarStore(s => s.editingEvent)
  const setEditingEvent = useCalendarStore(s => s.setEditingEvent)
  const setIsModalOpen = useCalendarStore(s => s.setIsModalOpen)
  const setIsBookingModalOpen = useCalendarStore(s => s.setIsBookingModalOpen)
  const setShowServiceSelection = useCalendarStore(s => s.setShowServiceSelection)
  const setShowMemberDetail = useCalendarStore(s => s.setShowMemberDetail)
  const setShowCheckoutPreview = useCalendarStore(s => s.setShowCheckoutPreview)
  const setShowBookingSuccess = useCalendarStore(s => s.setShowBookingSuccess)
  const setShowCustomKeypad = useCalendarStore(s => s.setShowCustomKeypad)
  const allDatabaseEvents = useCalendarStore(s => s.allDatabaseEvents)
  const staffMembers = useCalendarStore(s => s.staffMembers)
  const resourceLoadFactors = useCalendarStore(s => s.resourceLoadFactors)
  const predictedOccupancy = useCalendarStore(s => s.predictedOccupancy)
  const manualTotalAmount = useCalendarStore(s => s.manualTotalAmount)
  const resetModalState = useCalendarStore(s => s.resetModalState)
  const setShowTimeSelection = useCalendarStore(s => s.setShowTimeSelection)
  const isCalendarLocked = useCalendarStore(s => s.isCalendarLocked)
  const setIsCalendarLocked = useCalendarStore(s => s.setIsCalendarLocked)
 
   // 步骤 3.2: 辅助函数 - 生成 AI 上下文快照 (建立 context_snapshot 标准)
  const generateContextSnapshot = useCallback(() => {
    return {
      timestamp: new Date().toISOString(),
      resource_load: resourceLoadFactors,
      predicted_occupancy: predictedOccupancy,
      // 核心业务数据原子化快照
      item_staff_map: itemStaffMap,
      staff_amounts: staffAmounts,
      custom_item_prices: customItemPrices,
      member_note: memberNote,
      selected_staff_id: selectedStaffId,
      clicked_staff_id: clickedStaffId,
      // 预留扩展字段
      external_factors: {
        is_weekend: new Date().getDay() === 0 || new Date().getDay() === 6,
        hour_of_day: new Date().getHours()
      }
    };
  }, [
    resourceLoadFactors, 
    predictedOccupancy, 
    itemStaffMap, 
    staffAmounts, 
    customItemPrices, 
    memberNote, 
    selectedStaffId, 
    clickedStaffId
  ]);

  const closeModal = useCallback(() => {
    resetModalState()
    setGlobalPassport(null)
    setIsSubmitting(false)
  }, [resetModalState, setGlobalPassport])

  const openEditModal = useCallback(async (event: CalendarEvent) => {
    setIsSubmitting(false)
    // 核心：优先从 context_snapshot 读取结构化数据，彻底根除正则依赖
    const snapshot = event.context_snapshot || {};
    
    setEditingEvent(event)
    const currentService = event.service_item || ""
    setNewTitle(currentService)
    
    const start = getEventStartTime(event)
    setSelectedDate(start)
    const eventDuration = event.duration ?? 30
    setDuration(eventDuration)
    setSelectedEndDate(addMinutes(start, eventDuration))
    setSelectedColor(event.bg_color || 'bg-zinc-500')
    
    // 全球服务护照加载
    if (event.global_id) {
      const { success, data } = await getPassportById(event.global_id)
      if (success && data) {
        setGlobalPassport(data)
      }
    } else {
      const memberInfoStr = event.customer_phone || ""
      if (memberInfoStr) {
        // 降级方案：从备注中提取手机号加载
        const phoneMatch = memberInfoStr.match(/\d{10,}/)
        if (phoneMatch) {
          const { success, data } = await getOrCreatePassport(phoneMatch[0])
          if (success && data) {
            setGlobalPassport(data)
          }
        }
      }
    }
    
    const memberInfoStr = event.customer_id ? `(${event.customer_id})${event.customer_name || ""} (${event.customer_phone || ""})` : "";
    if (memberInfoStr) {
      const match = memberInfoStr.match(/^\(([^)]+)\)(.*)$/)
      if (match) {
        const id = match[1]
        const info = match[2].trim()
        setMemberId(id)
        setMemberInfo(info)
        
        let extractedName = ''
        const namePhoneMatch = info.match(/^(.*?)\s*\((.*?)\)$/)
        if (namePhoneMatch) {
          extractedName = namePhoneMatch[1]
          setMemberInfo(namePhoneMatch[2])
        } else if (!/^\d+$/.test(info)) {
          extractedName = info
        }
        
        if (extractedName) {
          setMemberName(extractedName)
        }

        setShowMemberDetail(true)
        const existingMember = allMembers.find(m => m.card === id)
        if (existingMember) {
          setSelectedMember(existingMember)
          setMemberNote(snapshot.member_note || existingMember.note || '')
        } else {
          // 优先使用 snapshot，否则回退到正则 (旧数据兼容)
          let noteFromEvent = snapshot.member_note;
          if (!noteFromEvent) {
            const notes = event.notes || ""
            const memberNoteMatch = notes.match(/\[MEMBER_NOTE:(.*?)\]/)
            noteFromEvent = memberNoteMatch ? memberNoteMatch[1] : ''
          }
          setMemberNote(noteFromEvent || '')
          
          setSelectedMember({
            name: extractedName || (id === '0000' ? '散客' : ''),
            phone: info,
            card: id,
            level: id === '0000' ? '散客' : (id.startsWith('NO') ? '爽约名单' : '普通会员'),
            totalSpend: 0,
            totalVisits: 0,
            lastVisit: event.service_date || "",
            note: noteFromEvent || '',
            history: []
          })
        }
      } else {
        setMemberInfo(memberInfoStr)
        setSelectedMember({
          name: memberInfoStr || '未知',
          phone: '',
          card: '0000',
          level: '普通会员',
          totalSpend: 0,
          totalVisits: 0,
          lastVisit: event.service_date || "",
          note: snapshot.member_note || '',
          history: []
        })
        setShowMemberDetail(true)
      }
    } else {
      setSelectedMember({
        name: '散客',
        phone: '',
        card: '0000',
        level: '普通会员',
        totalSpend: 0,
        totalVisits: 0,
        lastVisit: event.service_date || "",
        note: snapshot.member_note || '',
        history: []
      })
      setShowMemberDetail(true)
    }

    // --- 结构化数据解析：ItemStaffMap ---
    if (snapshot.item_staff_map) {
      setItemStaffMap(snapshot.item_staff_map)
    } else {
      const itemStaffMapping: Record<string, string> = {}
      const items = currentService.split(',').map(s => s.trim()).filter(Boolean)
      const notes = event.notes || ""
      items.forEach((item, idx) => {
        const escapedItem = escapeRegExp(item)
        const staffMatch = notes.match(new RegExp(`\\[${escapedItem}_STAFF:([^\\]]+)\\]`))
        if (staffMatch) {
          itemStaffMapping[`${event.id}-${item}-${idx}`] = staffMatch[1]
        }
      })
      setItemStaffMap(itemStaffMapping)
    }

    // --- 结构化数据解析：StaffAmounts ---
    if (snapshot.staff_amounts) {
      setStaffAmounts(snapshot.staff_amounts)
    } else {
      const amounts: Record<string, string> = {}
      const notes = event.notes || ""
      staffMembers.forEach(staff => {
        if ((FIXED_STAFF_NAMES as readonly string[]).includes(staff.name)) {
          const val = event[`金额_${staff.name}` as keyof CalendarEvent]
          if (val) amounts[staff.name] = String(val)
        } else {
          const amtMatch = notes.match(new RegExp(`\\[${staff.name}_AMT:(\\d+)\\]`))
          if (amtMatch) amounts[staff.name] = amtMatch[1]
        }
      })
      setStaffAmounts(amounts)
    }

    // --- 结构化数据解析：CustomItemPrices ---
    if (snapshot.custom_item_prices) {
      setCustomItemPrices(snapshot.custom_item_prices)
    } else {
      const prices: Record<string, string> = {}
      const items = currentService.split(',').map(s => s.trim()).filter(Boolean)
      const notes = event.notes || ""
      items.forEach((item, idx) => {
        const amtMatch = notes.match(new RegExp(`\\[${escapeRegExp(item)}_AMT:(\\d+)_IDX:${idx}\\]`))
        if (amtMatch) {
          prices[`${event.id}-${item}-${idx}`] = amtMatch[1]
        }
      })
      setCustomItemPrices(prices)
    }

    // --- 结构化数据解析：StaffSelection ---
    if (snapshot.selected_staff_id) {
      setSelectedStaffId(snapshot.selected_staff_id)
    } else {
      const notes = event.notes || ""
      const staffMatch = notes.match(/技师:([^, \]\s]+)/)
      if (staffMatch) {
        setSelectedStaffId(staffMatch[1])
      } else {
        const colorName = getCleanColorName(event.bg_color || "")
        if (colorName && COLOR_TO_STAFF_ID[colorName]) {
          setSelectedStaffId(COLOR_TO_STAFF_ID[colorName])
        }
      }
    }

    if (snapshot.clicked_staff_id) {
      setClickedStaffId(snapshot.clicked_staff_id)
    } else {
      const notes = event.notes || ""
      const suggestMatch = notes.match(/建议:([^, \]\s]+)/)
      if (suggestMatch) {
        setClickedStaffId(suggestMatch[1])
      }
    }

    setIsModalOpen(true)
    
    // Automatically show checkout preview for completed events OR events that have passed midpoint
    const isCompleted = event.status === 'completed';
    
    let shouldShowBilling = isCompleted;
    const startTime = event.start_time;
    const durationVal = event.duration;
    if (!isCompleted && startTime && durationVal) {
      const it = getItalyTime();
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date(it);
      startDate.setHours(hours, minutes, 0, 0);
      
      const midpoint = addMinutes(startDate, durationVal / 2);
      if (it >= midpoint) {
        shouldShowBilling = true;
      }
    }

    if (shouldShowBilling) {
      setShowCheckoutPreview(true)
      setShowMemberDetail(false)
      setShowServiceSelection(false)
    } else {
      setShowCheckoutPreview(false)
      setShowMemberDetail(true)
      setShowServiceSelection(false)
    }
    
    setShowTimeSelection(false)
    setShowCustomKeypad(false)
  }, [
    allMembers, 
    setEditingEvent, 
    setNewTitle, 
    setSelectedDate, 
    setDuration, 
    setSelectedEndDate, 
    setSelectedColor, 
    setMemberId, 
    setMemberInfo, 
    setMemberName, 
    setShowMemberDetail, 
    setSelectedMember, 
    setMemberNote, 
    setItemStaffMap, 
    setStaffAmounts, 
    setCustomItemPrices, 
    setSelectedStaffId, 
    setClickedStaffId, 
    setIsModalOpen,
    setShowCheckoutPreview,
    setShowServiceSelection,
    setShowTimeSelection,
    setShowCustomKeypad,
    handleSupabaseError,
    closeModal,
    fetchEvents,
    staffMembers,
    staffAmounts,
    manualTotalAmount,
    isCalendarLocked,
    setIsCalendarLocked,
    FIXED_STAFF_NAMES,
    SERVICE_CATEGORIES,
    getPassportById,
    getOrCreatePassport,
    setGlobalPassport
  ])

  const handleSelectMember = useCallback(async (member: Member) => {
    setMemberInfo(member.phone || member.name)
    setSelectedMember(member)
    setShowMemberDetail(true)
    setShowServiceSelection(false)
    setShowCheckoutPreview(false)
    setShowTimeSelection(false)
    setMemberSearchQuery('')
    setIsNewMember(false)
    setMemberId(member.card)
    setMemberName(member.name)
    setMemberNote(member.note || '')

    if (member.phone) {
      const { success, data } = await getOrCreatePassport(member.phone)
      if (success && data) {
        setGlobalPassport(data)
      }
    }
  }, [
    setMemberInfo, 
    setSelectedMember, 
    setShowMemberDetail, 
    setShowServiceSelection, 
    setShowCheckoutPreview, 
    setShowTimeSelection, 
    setMemberSearchQuery, 
    setIsNewMember, 
    setMemberId, 
    setMemberName, 
    setMemberNote,
    getOrCreatePassport,
    setGlobalPassport
  ])

  const handleNewMember = useCallback((query: string) => {
    const isPhone = /^\d+$/.test(query)
    const newMember: Member = { 
      name: '', 
      phone: isPhone ? query : '', 
      card: '0000', 
      level: '新会员', 
      totalSpend: 0, 
      totalVisits: 0, 
      lastVisit: new Date().toISOString(), 
      note: '', 
      history: [] 
    }
    setSelectedMember(newMember)
    setMemberId('0000')
    setMemberName('')
    setMemberNote('')
    setIsNewMember(true)
    setShowMemberDetail(true)
    setShowServiceSelection(false)
    setShowCheckoutPreview(false)
    setMemberSearchQuery('')
    setMemberInfo(query)
  }, [
    setSelectedMember, 
    setMemberId, 
    setMemberName, 
    setMemberNote, 
    setIsNewMember, 
    setShowMemberDetail, 
    setShowServiceSelection, 
    setShowCheckoutPreview, 
    setMemberSearchQuery, 
    setMemberInfo
  ])

  const toggleService = useCallback((service: string) => {
    setNewTitle(prev => {
      const items = prev.split(',').map(s => s.trim()).filter(Boolean)
      const index = items.lastIndexOf(service)
      const newItems = [...items]
      
      const eventId = editingEvent?.id || 'new';

      if (index > -1) {
        newItems.splice(index, 1)
        setItemStaffMap(prevMap => {
          const newMap = { ...prevMap }
          const itemKey = `${eventId}-${service}-${index}`;
          delete newMap[itemKey]
          delete newMap[service]
          return newMap
        })
      } else {
        const newIndex = newItems.length;
        newItems.push(service)
        if (selectedStaffId && selectedStaffId !== 'NO') {
          setItemStaffMap(prevMap => ({
            ...prevMap,
            [`${eventId}-${service}-${newIndex}`]: selectedStaffId
          }))
        }
      }
      
      return newItems.join(', ')
    })
  }, [editingEvent?.id, selectedStaffId, setNewTitle, setItemStaffMap])

  const generateMemberId = useCallback(async (category: 'young' | 'middle' | 'senior' | 'male' | 'noshow') => {
    setMemberId('...')
    
    const ranges: Record<'young' | 'middle' | 'senior' | 'male' | 'noshow', { min: number; max: number; prefix: string }> = {
      young: { prefix: 'GIO ', min: 1, max: 3000 },
      middle: { prefix: 'ADU ', min: 3001, max: 6000 },
      senior: { prefix: 'ANZ ', min: 6001, max: 9000 },
      male: { prefix: 'U ', min: 9001, max: 9999 },
      noshow: { prefix: 'NO ', min: 1, max: 999 }
    }
    
    const config = ranges[category]
    
    try {
      const { data, error } = await supabase
        .from('fx_events')
        .select('customer_id')
        .not('customer_id', 'is', null)
      
      if (error) throw error

      const existingIds = new Set<number>()
      const existingNoShowIds = new Set<number>()
      
      data.forEach((item: any) => {
        const id = item.customer_id as string | null
        if (!id) return
        
        const match = id.match(/(?:[A-Z.\s]+)?(\d+)/)
        if (match) {
          const num = parseInt(match[1])
          if (id.startsWith('NO')) {
            existingNoShowIds.add(num)
          } else {
            existingIds.add(num)
          }
        }
      })

      const targetSet = category === 'noshow' ? existingNoShowIds : existingIds
      const idsInRange = Array.from(targetSet).filter(id => id >= config.min && id <= config.max)
      
      let nextId = config.min
      if (idsInRange.length > 0) {
        nextId = Math.max(...idsInRange) + 1
      }
      
      if (nextId > config.max) {
        for (let i = config.min; i <= config.max; i++) {
          if (!targetSet.has(i)) {
            nextId = i
            break
          }
        }
      }
      
      const formattedId = category === 'noshow' 
        ? `NO ${nextId}` 
        : `${config.prefix}${nextId.toString().padStart(4, '0')}`
        
      setMemberId(formattedId)
      setSelectedMember(prev => (prev ? { ...prev, card: formattedId } : null))
    } catch (err) {
      console.error('Error generating member ID:', err)
      const randomId = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min
      const formattedId = category === 'noshow' 
        ? `NO ${randomId}` 
        : `${config.prefix}${randomId.toString().padStart(4, '0')}`
      setMemberId(formattedId)
    }
  }, [supabase, setMemberId, setSelectedMember])

  const handleDeleteEvent = useCallback(async () => {
    if (!editingEvent) return
    setIsSubmitting(true)

    const deletionTime = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const snapshot = editingEvent.context_snapshot || {};
    const updatedSnapshot = {
      ...snapshot,
      deleted_at: deletionTime
    };

    const { error, count } = await supabase
      .from('fx_events')
      .update({ 
        status: 'deleted',
        context_snapshot: updatedSnapshot
      })
      .eq('id', editingEvent.id)
      .select()

    if (error) {
      handleSupabaseError(error, '移动至回收站');
    } else {
      console.log('Soft delete result count:', count);
      window.dispatchEvent(new CustomEvent('appointment_deleted'));
      closeModal()
      fetchEvents()
      fetchAllEventsForLibrary()
    }
    setIsSubmitting(false)
  }, [supabase, editingEvent, handleSupabaseError, closeModal, fetchEvents, fetchAllEventsForLibrary])

  const handleSubmit = useCallback(async (
    e?: React.FormEvent | React.MouseEvent, 
    forcedMode?: 'normal' | 'sequential' | 'parallel', 
    isCheckout?: boolean,
    aiDynamicPriceFactor?: number,
    aiStrategyId?: string
  ) => {
    e?.preventDefault()
    
    setIsModalOpen(false)
    setIsBookingModalOpen(false)

    if (isSubmitting) return
    setIsSubmitting(true)

    // 获取当前商户/管理员信息
    const { data: { session } } = await supabase.auth.getSession()
    const metadata = session?.user?.user_metadata
    const merchantId = metadata?.mc_id || metadata?.ad_id || metadata?.rp_id
    const merchantName = metadata?.full_name || metadata?.name || '未知商户'

    if (!newTitle || !selectedDate) {
      setIsSubmitting(false);
      return;
    }

    // 步骤 3.1: 护照 ID 强制化 - 如果没有 globalPassport，则通过手机号获取或创建
    let finalGlobalId = globalPassport?.id;
    if (!finalGlobalId && memberInfo) {
      const phoneMatch = memberInfo.match(/\d{8,15}/);
      if (phoneMatch) {
        const { success, data } = await getOrCreatePassport(phoneMatch[0]);
        if (success && data) {
          finalGlobalId = data.id;
          setGlobalPassport(data);
        }
      }
    }

    if (mode === 'customer') {
      let bookingDuration = 30;
      const items = newTitle.split(',').map(s => s.trim()).filter(Boolean);
      if (items.length > 0) {
        for (const cat of SERVICE_CATEGORIES) {
          const found = cat.items.find((i: any) => i.name === items[0]);
          if (found && found.duration) {
            bookingDuration = found.duration;
            break;
          }
        }
      }

      const eventData: Partial<CalendarEvent> = {
        service_item: newTitle,
        customer_id: 'NEW',
        customer_name: memberName,
        customer_phone: memberInfo,
        service_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: format(selectedDate, 'HH:mm:ss'),
        duration: bookingDuration,
        bg_color: 'bg-zinc-500',
        notes: `技师:${selectedStaffId || 'NO'}, [CUSTOMER_BOOKING]${aiDynamicPriceFactor ? `, AI调价因子:${aiDynamicPriceFactor}` : ''}`,
        dynamic_price_factor: aiDynamicPriceFactor || 1.0,
        ai_strategy_id: aiStrategyId || undefined,
        status: 'pending',
        merchant_id: merchantId,
        merchant_name: merchantName,
        original_merchant_id: globalPassport?.home_merchant_id || merchantId, // 优先使用护照归属店
        global_id: finalGlobalId, // 强制注入护照 ID
        context_snapshot: generateContextSnapshot(), // 注入 AI 预测因子快照
        billing_details: { // 结构化分账记录原子化
          items: [{ name: newTitle, price: bookingDuration * 0.5, staffId: selectedStaffId || 'NO' }],
          staff: selectedStaffId && selectedStaffId !== 'NO' ? { [selectedStaffId]: 0 } : {},
        }
      }

      const { error } = await supabase
        .from('fx_events')
        .insert([eventData]);

      if (error) {
        console.error('Booking error:', error);
        alert('预约失败，请稍后重试或拨打电话联系商家。');
      } else {
        setShowBookingSuccess(true);
        setTimeout(() => setShowBookingSuccess(false), 5000);
        closeModal();
        fetchEvents();
      }
      setIsSubmitting(false);
      return;
    }

    const isVersionOk = await checkVersion();
    if (!isVersionOk) {
      setIsSubmitting(false);
      return;
    }

    if (!newTitle || !selectedDate) {
      closeModal()
      setIsSubmitting(false)
      return
    }
    
    const isAlreadyCompleted = editingEvent?.status === 'completed';
    const startTimeStr = format(selectedDate, 'HH:mm:ss')
    const serviceDateStr = format(selectedDate, 'yyyy-MM-dd')
    
    let finalInfo = memberInfo.trim()
    const trimmedName = memberName.trim()
    
    let processedName = trimmedName;
    let finalMemberId = memberId;
    const isNoShow = selectedStaffId === 'NO';
    
    if ((memberId === '0000' || memberId.startsWith('C.P') || memberId.startsWith('NO')) && !processedName && !finalInfo) {
      processedName = '散客';
    }

    if ((memberId === '0000' || memberId.startsWith('C.P') || memberId.startsWith('NO')) && (processedName === '散客' || processedName === '')) {
      if (isNoShow) {
        if (memberId.startsWith('NO ')) {
          finalMemberId = memberId;
        } else {
          const allNoNumbers = allDatabaseEvents.map(e => {
            const id = e.customer_id || '';
            const m = id.match(/NO\s*(\d+)/);
            return m ? parseInt(m[1]) : null;
          }).filter((n): n is number => n !== null);

          let nextNo = 1;
          const sortedNo = [...new Set(allNoNumbers)].sort((a, b) => a - b);
          for (const n of sortedNo) {
            if (n === nextNo) nextNo++;
            else if (n > nextNo) break;
          }
          finalMemberId = `NO ${nextNo}`;
        }
        processedName = '散客';
      } else if (!editingEvent || memberId === '0000' || memberId.startsWith('NO')) {
        const allUsedNumbers = allDatabaseEvents.map(e => {
          const id = e.customer_id || '';
          const m = id.match(/(?:\D+)?(\d+)/);
          const notes = e.notes || '';
          const staffMatch = notes.match(/技师:([^,\]\s]+)/);
          const isNoShowEvent = staffMatch ? staffMatch[1] === 'NO' : false;
          
          if (m && !isNoShowEvent) {
            return parseInt(m[1]);
          }
          return null;
        }).filter((n): n is number => n !== null);

        let nextNumber = 1;
        const sortedNumbers = [...new Set(allUsedNumbers)].sort((a, b) => a - b);
        for (const n of sortedNumbers) {
          if (n === nextNumber) nextNumber++;
          else if (n > nextNumber) break;
        }
        
        finalMemberId = `C.P ${nextNumber.toString().padStart(4, '0')}`;
        processedName = '散客';
      } else {
        finalMemberId = memberId;
        processedName = '散客';
      }
    }

    if (processedName) {
      if (finalInfo && finalInfo !== processedName) {
        if (/^\d+$/.test(finalInfo)) {
          finalInfo = `${processedName} (${finalInfo})`
        } else {
          finalInfo = processedName
        }
      } else {
        finalInfo = processedName
      }
    }
    
    const formattedMemberInfo = `(${finalMemberId})${finalInfo}`

    const items = newTitle.split(',').map(s => s.trim()).filter(Boolean);
    const effectiveMode = forcedMode || 'normal';
    
    const assignedStaffIds = new Set(items.map((item, idx) => {
      const itemKey = `${editingEvent?.id || 'new'}-${item}-${idx}`;
      return itemStaffMap[itemKey] || itemStaffMap[item] || selectedStaffId;
    }).filter(id => id && id !== ''));

    const hasMultipleStaff = assignedStaffIds.size > 1;
    const isExplicitSplitMode = effectiveMode === 'sequential' || effectiveMode === 'parallel';
    
    const shouldSplit = items.length > 1 && (hasMultipleStaff || isExplicitSplitMode);
    const splitMode = effectiveMode !== 'normal' ? effectiveMode : 'parallel';

    if (shouldSplit) {
      const eventsToInsert = [];
      let currentStartTime = new Date(selectedDate);
      
      if (splitMode === 'sequential') {
        let currentItemIdx = 0;
        for (const itemName of items) {
          const itemKey = `${editingEvent?.id || 'new'}-${itemName}-${currentItemIdx}`;
          const itemStaffId = itemStaffMap[itemKey] || itemStaffMap[itemName] || selectedStaffId;
          
          const itemStaff = staffMembers.find(s => s.id === itemStaffId);
          const customPriceVal = customItemPrices[itemKey];
          
          let itemPrice = customPriceVal ? Number(customPriceVal) : 0;
          let itemDuration = duration;
          
          if (!customPriceVal) {
            for (const cat of SERVICE_CATEGORIES) {
              const found = cat.items.find((i: any) => i.name === itemName);
              if (found) {
                itemPrice = found.price;
                if (found.duration) {
                  itemDuration = found.duration;
                }
                break;
              }
            }
          } else {
            for (const cat of SERVICE_CATEGORIES) {
              const found = cat.items.find((i: any) => i.name === itemName);
              if (found && found.duration) {
                itemDuration = found.duration;
                break;
              }
            }
          }

          const startTimeStr = format(currentStartTime, 'HH:mm:ss');
          const serviceDateStr = format(currentStartTime, 'yyyy-MM-dd');
          
          const itemColor = getStaffColorClass(itemStaffId, staffMembers, 'bg');

          const eventData: Partial<CalendarEvent> = {
            service_item: itemName,
            customer_id: finalMemberId,
            customer_name: processedName,
            customer_phone: finalInfo,
            service_date: serviceDateStr,
            start_time: startTimeStr,
            duration: itemDuration,
            bg_color: itemColor,
            notes: `技师:${itemStaffId}${clickedStaffId ? `,建议:${clickedStaffId}` : ''}`,
            dynamic_price_factor: aiDynamicPriceFactor || 1.0,
            ai_strategy_id: aiStrategyId || undefined,
            total_amount: itemPrice,
            status: (isCheckout || isAlreadyCompleted) ? 'completed' : 'pending',
            merchant_id: merchantId,
            merchant_name: merchantName,
            context_snapshot: generateContextSnapshot(), // 建立 snapshot 标准
            billing_details: {
              items: [{ name: itemName, price: itemPrice, staffId: itemStaffId }],
              staff: itemStaff ? { [itemStaff.name]: itemPrice } : {},
              manualTotal: undefined
            }
          };

          if (itemStaff && itemPrice > 0) {
            if ((FIXED_STAFF_NAMES as readonly string[]).includes(itemStaff.name)) {
              (eventData as any)[`金额_${itemStaff.name}`] = itemPrice;
            }
          }

          eventsToInsert.push(eventData);
          currentStartTime = addMinutes(currentStartTime, itemDuration);
          currentItemIdx++;
        }
      } else {
        const staffGroups: Record<string, { items: Array<{ name: string, price: number, duration: number }>, duration: number, totalPrice: number }> = {};
        
        items.forEach((itemName, idx) => {
          const itemKey = `${editingEvent?.id || 'new'}-${itemName}-${idx}`;
          const itemStaffId = itemStaffMap[itemKey] || itemStaffMap[itemName] || selectedStaffId;
          const customPriceVal = customItemPrices[itemKey];
          
          let itemPrice = customPriceVal ? Number(customPriceVal) : 0;
          let itemDuration = duration;
          
          for (const cat of SERVICE_CATEGORIES as any[]) {
            const found = cat.items.find((i: any) => i.name === itemName);
            if (found) {
              if (!customPriceVal) itemPrice = found.price;
              if (found.duration) itemDuration = found.duration;
              break;
            }
          }
          
          if (!staffGroups[itemStaffId]) {
            staffGroups[itemStaffId] = { items: [], duration: 0, totalPrice: 0 };
          }
          staffGroups[itemStaffId].items.push({ name: itemName, price: itemPrice, duration: itemDuration });
          staffGroups[itemStaffId].duration += itemDuration;
          staffGroups[itemStaffId].totalPrice += itemPrice;
        });

        for (const [staffId, group] of Object.entries(staffGroups)) {
          const itemStaff = staffMembers.find(s => s.id === staffId);
          const startTimeStr = format(selectedDate, 'HH:mm:ss');
          const serviceDateStr = format(selectedDate, 'yyyy-MM-dd');
          const itemColor = getStaffColorClass(staffId, staffMembers, 'bg');

          const eventData: Partial<CalendarEvent> = {
            service_item: group.items.map(i => i.name).join(', '),
            customer_id: finalMemberId,
            customer_name: processedName,
            customer_phone: finalInfo,
            service_date: serviceDateStr,
            start_time: startTimeStr,
            duration: group.duration,
            bg_color: itemColor,
            notes: `技师:${staffId}${clickedStaffId ? `,建议:${clickedStaffId}` : ''}`,
            dynamic_price_factor: aiDynamicPriceFactor || 1.0,
            ai_strategy_id: aiStrategyId || undefined,
            total_amount: group.totalPrice,
            status: (isCheckout || isAlreadyCompleted) ? 'completed' : 'pending',
            merchant_id: merchantId,
            merchant_name: merchantName,
            context_snapshot: generateContextSnapshot(), // 建立 snapshot 标准
            billing_details: {
              items: group.items.map(i => ({ name: i.name, price: i.price, staffId: staffId })),
              staff: itemStaff ? { [itemStaff.name]: group.totalPrice } : {},
              manualTotal: undefined
            }
          };

          if (itemStaff && group.totalPrice > 0) {
            if ((FIXED_STAFF_NAMES as readonly string[]).includes(itemStaff.name)) {
              (eventData as any)[`金额_${itemStaff.name}`] = group.totalPrice;
            }
          }
          eventsToInsert.push(eventData);
        }
      }

      if (eventsToInsert.length > 0) {
        if (editingEvent) {
          const { error: deleteError } = await supabase
            .from('fx_events')
            .delete()
            .eq('id', editingEvent.id);
          
          if (!deleteError) {
            window.dispatchEvent(new CustomEvent('appointment_deleted'));
          } else {
            handleSupabaseError(deleteError, '更新拆分预约(删除旧项)');
            setIsSubmitting(false);
            return;
          }
        }

        const { error } = await supabase
          .from('fx_events')
          .insert(eventsToInsert);

        if (error) {
          handleSupabaseError(error, '预约拆分');
        } else {
          closeModal();
          fetchEvents();
        }
      }
      
      setIsSubmitting(false);
      return;
    }

    const billingDetails: {
      items: Array<{ name: string; price: number; staffId: string }>;
      staff: Record<string, number>;
      manualTotal?: number;
    } = { 
      items: [], 
      staff: {}, 
      manualTotal: manualTotalAmount ? Number(manualTotalAmount) : undefined 
    };
    
    const eventIdForKeys = editingEvent?.id || 'new';
    newTitle.split(',').map(s => s.trim()).filter(Boolean).forEach((itemName, itemIdx) => {
      const itemKey = `${eventIdForKeys}-${itemName}-${itemIdx}`;
      const customPrice = customItemPrices[itemKey];
      const itemData = SERVICE_CATEGORIES.flatMap(c => c.items).find(i => i.name === itemName);
      const price = customPrice ? Number(customPrice) : (itemData?.price || 0);
      
      const staffId = itemStaffMap[itemKey] || selectedStaffId;
      billingDetails.items.push({ name: itemName, price, staffId });
    });

    staffMembers.forEach(staff => {
      if (staff.id !== 'NO') {
        const amount = Number(staffAmounts[staff.name]) || 0;
        if (amount > 0) {
          billingDetails.staff[staff.name] = amount;
        }
      }
    });

    let finalColor = selectedColor;
    if (!selectedStaffId || selectedStaffId === '') {
      finalColor = 'bg-sky-400';
    } else if (selectedStaffId === 'NO') {
      finalColor = 'bg-zinc-500';
    }

    const eventData: Partial<CalendarEvent> = {
      service_item: newTitle,
      customer_id: finalMemberId,
      customer_name: processedName,
      customer_phone: finalInfo,
      service_date: serviceDateStr,
      start_time: startTimeStr,
      duration: duration,
      bg_color: finalColor,
      notes: `技师:${selectedStaffId}${clickedStaffId ? `,建议:${clickedStaffId}` : ''}`,
      dynamic_price_factor: aiDynamicPriceFactor || 1.0,
      ai_strategy_id: aiStrategyId || undefined,
      status: (isCheckout || isAlreadyCompleted) ? 'completed' : 'pending',
      merchant_id: merchantId,
      merchant_name: merchantName,
      original_merchant_id: globalPassport?.home_merchant_id || merchantId,
      global_id: globalPassport?.id,
      context_snapshot: generateContextSnapshot(),
      billing_details: billingDetails,
      total_amount: Object.values(billingDetails.staff as Record<string, number>).reduce((a, b) => a + b, 0)
    }

    staffMembers.forEach(staff => {
      if (staff.id !== 'NO') {
        const amount = Number(staffAmounts[staff.name]) || 0
        if (amount > 0) {
          if ((FIXED_STAFF_NAMES as readonly string[]).includes(staff.name)) {
            (eventData as any)[`金额_${staff.name}`] = amount
          }
        }
      }
    })

    if (editingEvent) {
      const { error } = await supabase
        .from('fx_events')
        .update(eventData)
        .eq('id', editingEvent.id)

      if (error) {
        handleSupabaseError(error, '更新预约');
      } else {
        closeModal()
        fetchEvents()
      }
    } else {
      const { error } = await supabase
        .from('fx_events')
        .insert([eventData])

      if (error) {
        handleSupabaseError(error, '新建预约');
      } else {
        closeModal()
        fetchEvents()
      }
    }

    setIsSubmitting(false)
  }, [
    supabase,
    mode, 
    selectedDate, 
    newTitle, 
    memberName, 
    memberInfo, 
    selectedStaffId, 
    checkVersion, 
    editingEvent, 
    memberId, 
    allDatabaseEvents, 
    itemStaffMap, 
    customItemPrices, 
    duration, 
    clickedStaffId, 
    memberNote, 
    handleSupabaseError, 
    closeModal, 
    fetchEvents, 
    selectedColor, 
    staffMembers,
    resourceLoadFactors,
    predictedOccupancy,
    staffAmounts, 
    manualTotalAmount, 
    isSubmitting, 
    setIsBookingModalOpen, 
    setIsModalOpen, 
    setShowBookingSuccess,
    fetchAllEventsForLibrary,
    globalPassport,
    generateContextSnapshot
  ])

  return {
    isSubmitting,
    openEditModal,
    closeModal,
    handleSelectMember,
    handleNewMember,
    toggleService,
    generateMemberId,
    handleDeleteEvent,
    handleSubmit
  }
}
