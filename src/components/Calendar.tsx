'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  addYears,
  subYears,
  startOfDay,
  endOfDay,
  startOfYear, 
  endOfYear, 
  eachMonthOfInterval, 
  setHours,
  setMinutes,
  isWithinInterval,
  addMinutes,
  isSameHour,
  isSameMinute
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, X, Loader2, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'

// --- Types ---
export type ViewType = 'day' | 'week' | 'month' | 'year'

interface CalendarEvent {
  id: string
  "服务项目": string
  "会员信息"?: string
  "服务日期": string
  "开始时间": string
  "持续时间": number
  "背景颜色": string
  "备注"?: string
  "金额_FANG"?: number
  "金额_SARA"?: number
  "金额_DAN"?: number
  "金额_ALEXA"?: number
  "金额_FEDE"?: number
}

const COLOR_OPTIONS = [
  { label: '蓝色', value: 'bg-blue-600' },
  { label: '红色', value: 'bg-rose-600' },
  { label: '绿色', value: 'bg-emerald-600' },
  { label: '紫色', value: 'bg-purple-600' },
  { label: '橙色', value: 'bg-orange-600' },
  { label: '黄色', value: 'bg-amber-500' },
  { label: '灰色', value: 'bg-zinc-500' },
]

// Staff data for Nail Salon
const STAFF_MEMBERS = [
  { id: '1', name: 'FANG', role: '资深美甲师', avatar: 'FA', color: 'border-rose-500', bgColor: 'bg-rose-500/10' },
  { id: '2', name: 'ALEXA', role: '创意设计', avatar: 'AL', color: 'border-emerald-500', bgColor: 'bg-emerald-500/10' },
  { id: '3', name: 'SARA', role: '美睫主管', avatar: 'SA', color: 'border-purple-500', bgColor: 'bg-purple-500/10' },
  { id: '4', name: 'DAN', role: '高级技师', avatar: 'DA', color: 'border-orange-500', bgColor: 'bg-orange-500/10' },
  { id: '5', name: 'FEDE', role: '高级技师', avatar: 'FE', color: 'border-amber-500', bgColor: 'bg-amber-500/10' },
  { id: 'NO', name: 'NO', role: '爽约', avatar: 'NO', color: 'border-zinc-500', bgColor: 'bg-zinc-500/10' },
]

interface CalendarProps {
  initialDate?: Date;
  initialView?: ViewType;
  onToggleSidebar?: () => void;
  bgIndex?: number;
}

// --- Helpers ---
// Helper to parse start time from fx_events row
const getEventStartTime = (event: CalendarEvent) => {
  if (!event["开始时间"] || !event["服务日期"]) return new Date()
  const [h, m, s] = event["开始时间"].split(':').map(Number)
  const [y, month, d] = event["服务日期"].split('-').map(Number)
  return new Date(y, month - 1, d, h, m, s)
}

const getEventEndTime = (event: CalendarEvent) => {
  return addMinutes(getEventStartTime(event), event["持续时间"])
}

export default function Calendar({ initialDate, initialView = 'day', onToggleSidebar, bgIndex = 0 }: CalendarProps) {
  const supabase = createClient()
  
  // --- State ---
  const [currentDate, setCurrentDate] = useState(initialDate || new Date())
  const [viewType, setViewType] = useState<ViewType>(initialView)
  const [isResizing, setIsResizing] = useState(false)
  const [isHeaderVisible, setIsHeaderVisible] = useState(false)
  
  // Handle prop updates
  useEffect(() => {
    if (initialDate) setCurrentDate(initialDate)
  }, [initialDate])

  useEffect(() => {
    if (initialView) setViewType(initialView)
  }, [initialView])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [showServiceSelection, setShowServiceSelection] = useState(false)
  const [showMemberDetail, setShowMemberDetail] = useState(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [isNewMember, setIsNewMember] = useState(false)
  const [memberId, setMemberId] = useState('0000')
  const [memberName, setMemberName] = useState('')
  const [memberNote, setMemberNote] = useState('')
  
  // Form State
  const [newTitle, setNewTitle] = useState('')
  const [memberInfo, setMemberInfo] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null)
  const [duration, setDuration] = useState<number>(60)
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].value)
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [clickedStaffId, setClickedStaffId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [staffAmounts, setStaffAmounts] = useState<Record<string, string>>({
    'FANG': '',
    'SARA': '',
    'DAN': '',
    'ALEXA': '',
    'FEDE': ''
  })

  // Derived state for active staff columns
  const activeStaff = useMemo(() => {
    if (viewType !== 'day') return STAFF_MEMBERS;
    
    return STAFF_MEMBERS.filter(s => {
      if (s.id !== 'NO') return true;
      // Only show NO column if there are NO show events today
      return events.some(e => 
        isSameDay(getEventStartTime(e), currentDate) && 
        e["备注"]?.includes('技师:NO')
      );
    });
  }, [viewType, events, currentDate]);

  // Pre-calculate which column each event should go to (for day view)
  const eventAssignments = useMemo(() => {
    if (viewType !== 'day') return new Map<string, string>();
    
    const assignments = new Map<string, string>();
    const todayEvents = events.filter(e => isSameDay(getEventStartTime(e), currentDate));
    
    // Sort events by start time to process them in order
    const sortedEvents = [...todayEvents].sort((a, b) => 
      getEventStartTime(a).getTime() - getEventStartTime(b).getTime()
    );

    const regularStaff = activeStaff.filter(s => s.id !== 'NO');

    // 1. First pass: Assign all DESIGNATED appointments (including NO)
    todayEvents.forEach(e => {
      const staffIdMatch = e["备注"]?.match(/技师:([^,]+)/);
      const designatedStaffId = staffIdMatch ? staffIdMatch[1] : '';
      
      if (designatedStaffId && designatedStaffId !== '') {
        assignments.set(e.id, designatedStaffId);
      }
    });

    // 2. Second pass: Assign UNASSIGNED appointments - PURE LEFT-ALIGN STRATEGY
    // We process all unassigned events and place them in the EARLIEST available column (left-to-right).
    // This satisfies the "in order from front to back" requirement.
    const unassignedEvents = todayEvents.filter(e => !assignments.has(e.id))
      .sort((a, b) => getEventStartTime(a).getTime() - getEventStartTime(b).getTime());

    unassignedEvents.forEach(e => {
      const eStart = getEventStartTime(e);
      const eEnd = getEventEndTime(e);

      // Find the first available column (index 0, 1, 2...)
      const availableStaff = regularStaff.find(staff => {
        // Check if this specific column has a conflict at this time
        const hasConflict = Array.from(assignments.entries()).some(([otherId, assignedStaffId]) => {
          if (assignedStaffId !== staff.id) return false;
          const otherE = todayEvents.find(te => te.id === otherId);
          if (!otherE) return false;
          const oStart = getEventStartTime(otherE);
          const oEnd = getEventEndTime(otherE);
          // Standard overlap check
          return (eStart < oEnd && eEnd > oStart);
        });
        return !hasConflict;
      });

      if (availableStaff) {
        assignments.set(e.id, availableStaff.id);
      } else if (regularStaff.length > 0) {
        // Fallback to first column if everything is full (shouldn't happen with enough staff)
        assignments.set(e.id, regularStaff[0].id);
      }
    });

    return assignments;
  }, [viewType, events, currentDate, activeStaff]);

  // View cycling logic
  const VIEW_CYCLE: ViewType[] = ['day', 'week', 'month', 'year']
  const VIEW_LABELS: Record<ViewType, string> = {
    day: '日',
    week: '周',
    month: '月',
    year: '年'
  }

  const cycleView = () => {
    const currentIndex = VIEW_CYCLE.indexOf(viewType)
    const nextIndex = (currentIndex + 1) % VIEW_CYCLE.length
    setViewType(VIEW_CYCLE[nextIndex])
  }

  // --- Fetch Data ---
  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    let start, end
    
    if (viewType === 'day') {
      start = startOfDay(currentDate)
      end = endOfDay(currentDate)
    } else if (viewType === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 })
      end = endOfWeek(currentDate, { weekStartsOn: 1 })
    } else if (viewType === 'year') {
      start = startOfYear(currentDate)
      end = endOfYear(currentDate)
    } else {
      const monthStart = startOfMonth(currentDate)
      start = startOfWeek(monthStart, { weekStartsOn: 1 })
      end = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 })
    }
    
    const { data, error } = await supabase
      .from('fx_events')
      .select('*')
      .or(`and("服务日期".gte.${format(start, 'yyyy-MM-dd')},"服务日期".lte.${format(end, 'yyyy-MM-dd')})`)

    if (error) {
      console.error('Error fetching events:', error)
    } else {
      setEvents(data || [])
    }
    setIsLoading(false)
  }, [currentDate, viewType, supabase])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // --- Actions ---
  const handleNext = () => {
    if (viewType === 'day') setCurrentDate(addDays(currentDate, 1))
    else if (viewType === 'week') setCurrentDate(addWeeks(currentDate, 1))
    else if (viewType === 'year') setCurrentDate(addYears(currentDate, 1))
    else setCurrentDate(addMonths(currentDate, 1))
  }

  const handlePrev = () => {
    if (viewType === 'day') setCurrentDate(subDays(currentDate, 1))
    else if (viewType === 'week') setCurrentDate(subWeeks(currentDate, 1))
    else if (viewType === 'year') setCurrentDate(subYears(currentDate, 1))
    else setCurrentDate(subMonths(currentDate, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle || !selectedDate) return

    setIsSubmitting(true)
    
    const startTimeStr = format(selectedDate, 'HH:mm:ss')
    const serviceDateStr = format(selectedDate, 'yyyy-MM-dd')
    
    // Format member_info as (memberId)memberInfo (which is phone)
    const formattedMemberInfo = memberId ? `(${memberId})${memberInfo}` : memberInfo

    const eventData = {
      "服务项目": newTitle,
      "会员信息": formattedMemberInfo,
      "服务日期": serviceDateStr,
      "开始时间": startTimeStr,
      "持续时间": duration,
      "背景颜色": selectedColor,
      "备注": `技师:${selectedStaffId}${clickedStaffId ? `,建议:${clickedStaffId}` : ''}`,
      "金额_FANG": Number(staffAmounts['FANG']) || 0,
      "金额_SARA": Number(staffAmounts['SARA']) || 0,
      "金额_DAN": Number(staffAmounts['DAN']) || 0,
      "金额_ALEXA": Number(staffAmounts['ALEXA']) || 0,
      "金额_FEDE": Number(staffAmounts['FEDE']) || 0,
    }

    if (editingEvent) {
      // Update existing event
      const { error } = await supabase
        .from('fx_events')
        .update(eventData)
        .eq('id', editingEvent.id)

      if (error) {
        alert('更新失败: ' + error.message)
      } else {
        closeModal()
        fetchEvents()
      }
    } else {
      // Insert new event
      const { error } = await supabase
        .from('fx_events')
        .insert([eventData])

      if (error) {
        alert('添加失败: ' + error.message)
      } else {
        closeModal()
        fetchEvents()
      }
    }
    setIsSubmitting(false)
  }

  const handleDeleteEvent = async () => {
    if (!editingEvent) return
    if (!confirm('确定要删除这个事件吗？')) return

    setIsSubmitting(true)
    const { error } = await supabase
      .from('fx_events')
      .delete()
      .eq('id', editingEvent.id)

    if (error) {
      alert('删除失败: ' + error.message)
    } else {
      closeModal()
      fetchEvents()
    }
    setIsSubmitting(false)
  }

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event)
    setNewTitle(event["服务项目"])
    
    // Parse service_date and start_time back into selectedDate
    const start = getEventStartTime(event)
    
    setSelectedDate(start)
    setDuration(event["持续时间"])
    setSelectedEndDate(addMinutes(start, event["持续时间"]))
    setSelectedColor(event["背景颜色"])
    
    // Parse member_info back
    if (event["会员信息"]) {
      const match = event["会员信息"].match(/^\(([^)]+)\)(.*)$/)
      if (match) {
        setMemberId(match[1])
        setMemberInfo(match[2])
      } else {
        setMemberInfo(event["会员信息"])
      }
    }

    // Set amounts
    setStaffAmounts({
      'FANG': event["金额_FANG"]?.toString() || '',
      'SARA': event["金额_SARA"]?.toString() || '',
      'DAN': event["金额_DAN"]?.toString() || '',
      'ALEXA': event["金额_ALEXA"]?.toString() || '',
      'FEDE': event["金额_FEDE"]?.toString() || ''
    })

    const staffMatch = event["备注"]?.match(/技师:([^,]+)/)
    setSelectedStaffId(staffMatch ? staffMatch[1] : '')
    
    const suggestedMatch = event["备注"]?.match(/建议:([^,]+)/)
    setClickedStaffId(suggestedMatch ? suggestedMatch[1] : '')
    
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingEvent(null)
    setNewTitle('')
    setMemberInfo('')
    setSelectedDate(null)
    setSelectedEndDate(null)
    setDuration(60)
    setSelectedColor(COLOR_OPTIONS[0].value)
    setSelectedStaffId('')
    setClickedStaffId('')
    setStaffAmounts({
      'FANG': '',
      'SARA': '',
      'DAN': '',
      'ALEXA': '',
      'FEDE': ''
    })
    setShowServiceSelection(false)
    setShowMemberDetail(false)
    setMemberSearchQuery('')
    setSelectedMember(null)
    setIsNewMember(false)
    setMemberId('0000')
    setMemberName('')
    setMemberNote('')
  }

  // --- Mock Member Data ---
  const MOCK_MEMBERS = [
    { 
      id: 1, 
      name: '张三', 
      phone: '13800138000', 
      card: 'VIP888',
      level: '尊享VIP',
      totalSpend: 5800,
      totalVisits: 12,
      lastVisit: '2026-02-28',
      note: '喜欢安静，做指甲比较细心',
      history: [
        { date: '2026-02-28', service: 'Mani + Ms', staff: 'Elena', amount: 450 },
        { date: '2026-02-15', service: 'Piedi', staff: 'Sofia', amount: 380 },
        { date: '2026-01-20', service: 'Viso', staff: 'Elena', amount: 1200 },
      ]
    },
    { 
      id: 2, 
      name: '李四', 
      phone: '13911112222', 
      card: 'REG001',
      level: '普通会员',
      totalSpend: 1200,
      totalVisits: 3,
      lastVisit: '2026-03-01',
      note: '对酒精过敏',
      history: [
        { date: '2026-03-01', service: 'Ceretta', staff: 'Sofia', amount: 200 },
      ]
    }
  ]

  const filteredMembers = memberSearchQuery 
    ? MOCK_MEMBERS.filter(m => 
        m.name.includes(memberSearchQuery) || 
        m.phone.includes(memberSearchQuery) || 
        m.card.toLowerCase().includes(memberSearchQuery.toLowerCase())
      )
    : []

  const handleSelectMember = (member: any) => {
    setMemberInfo(`${member.name} (${member.phone})`)
    setSelectedMember(member)
    setShowMemberDetail(true)
    setShowServiceSelection(false)
    setMemberSearchQuery('')
    setIsNewMember(false)
    setMemberId(member.card)
    setMemberName(member.name)
    setMemberNote(member.note)
  }

  const handleNewMember = (query: string) => {
    const isPhone = /^\d+$/.test(query)
    const newMember = { 
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
    setMemberSearchQuery('')
    setMemberInfo(query)
  }

  const generateMemberId = (category: string) => {
    // Logic based on user's specification:
    // 年轻人 0001+ | 中年人 3001+ | 老年人 6001+ | 男人 9001+ | 爽约 NO 1+
    const ranges: any = {
      young: { min: 1, max: 3000 },
      middle: { min: 3001, max: 6000 },
      senior: { min: 6001, max: 9000 },
      male: { min: 9001, max: 9999 },
      noshow: { prefix: 'NO ', min: 1, max: 999 }
    }
    
    const config = ranges[category]
    // For now, let's pick a random number in the range that isn't in MOCK_MEMBERS
    // In a real app, this would be a database call.
    let nextId = config.min
    if (category === 'middle') nextId = 3046 // User's example
    
    const formattedId = category === 'noshow' 
      ? `NO ${nextId}` 
      : nextId.toString().padStart(4, '0')
      
    setMemberId(formattedId)
    setSelectedMember((prev: any) => ({ ...prev, card: formattedId }))
  }

  // --- Calendar Helpers ---
  const getCalendarDays = () => {
    if (viewType === 'day') {
      return [currentDate]
    }
    if (viewType === 'week') {
      return eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 })
      })
    }
    if (viewType === 'year') {
      // In year view, we'll return the first day of each month
      return eachMonthOfInterval({
        start: startOfYear(currentDate),
        end: endOfYear(currentDate)
      })
    }
    // Month view (default)
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd,
    })
  }

  const days = getCalendarDays()
  const monthStart = startOfMonth(currentDate)

  const getHeaderLabel = () => {
    if (viewType === 'day') return format(currentDate, 'yyyy / MM / dd', { locale: zhCN })
    if (viewType === 'year') return format(currentDate, 'yyyy', { locale: zhCN })
    return format(currentDate, 'yyyy / MM', { locale: zhCN })
  }

  const TIME_SLOTS: string[] = []
  for (let hour = 8; hour <= 21; hour++) {
    TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`)
  }
  // We don't push 22:00 to TIME_SLOTS for cells, we handle it as the bottom label

  return (
    <div className="flex flex-col h-full w-full bg-transparent text-zinc-100 overflow-hidden relative">
      {/* Header */}
      <div className={cn(
        "flex flex-col sm:flex-row items-center justify-between px-2 md:px-4 lg:px-6 gap-4 bg-transparent z-20 overflow-hidden transition-all duration-500 ease-in-out",
        isHeaderVisible ? "max-h-[100px] py-1 md:py-1.5 opacity-100" : "max-h-0 py-0 opacity-0"
      )}>
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <div className="flex items-center gap-4 md:gap-5 group ml-2 md:ml-4">
            <div 
              onClick={onToggleSidebar}
              className={cn(
                "w-2.5 h-2.5 md:w-3 md:h-3 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)] shrink-0 transition-all duration-500 cursor-pointer hover:scale-125 active:scale-90", 
                isLoading ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
              )} 
            />
            <div className="relative group/year">
              {/* Year Label with High-End Artistic Style */}
              <h2 
                onClick={onToggleSidebar}
                className={cn(
                  "text-xl md:text-2xl lg:text-3xl font-sans font-black italic tracking-[0.4em] select-none cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300",
                  "bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-shine",
                  "drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                )}
              >
                {format(currentDate, 'yyyy')}
              </h2>
              {/* Subtle underline for elegance */}
              <div className="absolute -bottom-1 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent scale-x-0 group-hover/year:scale-x-100 transition-transform duration-700" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
          {/* Merged Navigation and View Switcher */}
          <div className="flex-1 sm:flex-none flex bg-transparent rounded-xl p-1 border-none">
            <button onClick={handlePrev} className="flex-1 sm:flex-none p-1.5 md:p-2 hover:bg-white/5 rounded-lg transition-all active:scale-90">
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-zinc-400 mx-auto" />
            </button>
            <button 
              onClick={cycleView} 
              className="px-6 md:px-10 py-1.5 text-sm md:text-base font-black hover:bg-white/10 rounded-lg transition-all text-white bg-transparent min-w-[60px]"
            >
              {VIEW_LABELS[viewType]}
            </button>
            <button onClick={handleNext} className="flex-1 sm:flex-none p-1.5 md:p-2 hover:bg-white/5 rounded-lg transition-all active:scale-90">
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-zinc-400 mx-auto" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid - Stretching to fill remaining space */}
      <div className={cn(
        "flex-1 flex flex-col min-h-0 relative overflow-hidden",
        (viewType === 'day' || viewType === 'week') && "overflow-y-auto"
      )}>
        {(viewType === 'day' || viewType === 'week') ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* 1. Staff Columns Header - Fixed at top */}
            <div className="flex flex-col px-1 md:px-2 lg:px-3 bg-transparent shrink-0">
              {/* Added Date Display for Day View */}
              {viewType === 'day' && (
                <div className="flex items-center gap-4 pl-24 md:pl-32 py-2">
                  <span 
                    onClick={() => setIsHeaderVisible(!isHeaderVisible)}
                    className="text-sm md:text-base font-black text-white/80 tracking-widest uppercase cursor-pointer hover:text-white transition-colors select-none"
                    title={isHeaderVisible ? "点击隐藏顶部栏" : "点击显示顶部栏"}
                  >
                    {format(currentDate, 'M月d日 EEEE', { locale: zhCN })}
                  </span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-white/20 to-transparent" />
                </div>
              )}
              
              <div className="flex w-full">
                <div className="w-20 md:w-28 flex flex-col items-end pr-3 md:pr-4 pt-4 pb-2 bg-transparent shrink-0" />
                <div 
                  className={cn(
                    "flex-1 grid",
                    viewType === 'day' ? "" : "grid-cols-7 gap-1.5 md:gap-3 lg:gap-4"
                  )}
                  style={viewType === 'day' ? { gridTemplateColumns: `repeat(${activeStaff.length}, minmax(0, 1fr))` } : {}}
                >
                  {viewType === 'day' ? (
                    activeStaff.map(staff => (
                      <div key={staff.id} className="py-3 md:py-4 text-center flex flex-col items-center">
                        <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300">
                          <span className="text-[10px] md:text-xs font-black text-white tracking-tighter">{staff.avatar}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    days.map((day) => (
                      <div key={day.toString()} className="py-2 md:py-3 flex flex-col items-center">
                        <div className={cn(
                          "flex flex-col items-center justify-center transition-all duration-300 w-12 h-12 md:w-16 md:h-16 rounded-full",
                          isSameDay(day, new Date()) ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]" : "hover:bg-white/5"
                        )}>
                          <div className={cn(
                            "text-[10px] md:text-xs font-bold uppercase tracking-widest mb-0.5",
                            isSameDay(day, new Date()) ? "text-zinc-900/70" : "text-white"
                          )}>
                            {format(day, 'EEE', { locale: zhCN })}
                          </div>
                          <div className={cn(
                            "text-lg md:text-xl font-black",
                            isSameDay(day, new Date()) ? "text-zinc-900" : "text-white"
                          )}>
                            {format(day, 'd', { locale: zhCN })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 2. Scrollable Body (Time Axis + Grid) */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
              <div className="flex px-1 md:px-2 lg:px-3 min-h-fit pb-20 pt-4">
                {/* Time Axis Column */}
                <div className="w-20 md:w-28 shrink-0">
                  {TIME_SLOTS.map((time) => (
                    <div key={time} className="h-[4rem] relative">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] md:text-xs font-bold text-white tabular-nums bg-transparent px-1">
                        {time}
                      </div>
                    </div>
                  ))}
                  {/* Bottom Label for 22:00 */}
                  <div className="relative h-0">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] md:text-xs font-bold text-white tabular-nums bg-transparent px-1">
                      22:00
                    </div>
                  </div>
                </div>

                {/* Slots Grid - Staff Columns */}
                <div 
                  className={cn(
                    "flex-1 grid relative z-0",
                    viewType === 'day' ? "" : "grid-cols-7 gap-1.5 md:gap-3 lg:gap-4"
                  )}
                  style={viewType === 'day' ? { 
                    gridTemplateColumns: `repeat(${activeStaff.length}, minmax(0, 1fr))` 
                  } : {}}
                >
                  {(viewType === 'day' ? activeStaff : days).map((item, idx) => {
                    // Filter events for this staff (in day view) or this day (in week view)
                    const filteredEvents = viewType === 'day' 
                      ? events.filter(e => {
                          const isCurrentDay = isSameDay(getEventStartTime(e), currentDate);
                          if (!isCurrentDay) return false;
                          
                          const staffId = (item as any).id;
                          const assignedStaffId = eventAssignments.get(e.id);
                          
                          return assignedStaffId === staffId;
                        })
                      : events.filter(e => isSameDay(getEventStartTime(e), item as Date))

                    return (
                      <div 
                        key={viewType === 'day' ? (item as any).id : item.toString()} 
                        className={cn(
                          "relative",
                          viewType === 'day' ? "border-l border-white/5 first:border-l-0" : "border-none"
                        )}
                      >
                        {/* 1. Background Slots (for interaction) */}
                        {TIME_SLOTS.map((time) => {
                          const [hour, minute] = time.split(':').map(Number)
                          const slotStart = setMinutes(setHours(viewType === 'day' ? currentDate : (item as Date), hour), minute)
                          
                          return (
                            <div 
                              key={time} 
                              onClick={() => {
                                setSelectedDate(slotStart)
                                setSelectedEndDate(addMinutes(slotStart, duration))
                                setClickedStaffId(viewType === 'day' ? (item as any).id : '')
                                setIsModalOpen(true)
                                setShowServiceSelection(true)
                              }}
                              className="h-[4rem] group/slot relative cursor-pointer"
                            >
                              {/* Faint hover indicator */}
                              <div className="absolute inset-0 bg-white/0 group-hover/slot:bg-white/10 transition-colors" />
                            </div>
                          )
                        })}

                        {/* 2. Absolute Positioned Event Cards (for day/week view) */}
                        {(viewType === 'day' || viewType === 'week') && filteredEvents.map(event => {
                          const start = getEventStartTime(event)
                          const end = getEventEndTime(event)
                          const totalStartMinutes = (start.getHours() - 8) * 60 + start.getMinutes()
                          const durationInMinutes = (end.getTime() - start.getTime()) / 60000
                          
                          // 1 hour = 4rem
                          const top = (totalStartMinutes / 60) * 4
                          const height = (durationInMinutes / 60) * 4
                          
                          const staffIdMatch = event["备注"]?.match(/技师:([^,]+)/)
                          const staffId = staffIdMatch ? staffIdMatch[1] : null
                          const staff = STAFF_MEMBERS.find(s => s.id === staffId)
                          
                          return (
                            <div 
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditModal(event)
                              }}
                              style={{ 
                                top: `calc(${top}rem + 2px)`, 
                                height: `calc(${height}rem - 4px)`,
                                left: '4px',
                                right: '4px'
                              }}
                              className={cn(
                                "absolute z-10 rounded-lg px-2.5 py-2 text-xs font-black italic text-white shadow-2xl overflow-hidden",
                                "backdrop-blur-md border-l-4 border-l-black/60 ring-1 ring-white/10",
                                "hover:brightness-110 hover:-translate-y-0.5 transition-all active:scale-[0.98] flex flex-col gap-1 uppercase tracking-wider",
                                event["背景颜色"] || 'bg-blue-600'
                              )}
                            >
                              <div className="flex items-center gap-1.5 truncate leading-tight">
                                {staffId === 'NO' && <span className="text-[9px] bg-zinc-800 px-1 rounded border border-zinc-700 not-italic">NO</span>}
                                <span className="text-[13px]">{event["服务项目"]}</span>
                              </div>
                              {durationInMinutes >= 45 && (
                                <div className="text-[10px] opacity-85 font-bold tracking-tight">
                                  {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Weekdays Header - Only show in month view */}
            {viewType === 'month' && (
              <div className="flex bg-transparent sticky top-0 z-20">
                <div className="flex-1 grid grid-cols-7 gap-1 md:gap-2 lg:gap-2.5 px-1 md:px-2 lg:px-3">
                  {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day) => (
                    <div key={day} className="py-3 md:py-4 text-center">
                      <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-[0.2em]">
                        {day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className={cn(
              "flex-1 grid min-h-0 relative p-1 md:p-2 lg:p-3",
              viewType === 'year' 
                ? "grid-cols-3 md:grid-cols-4 grid-rows-4 md:grid-rows-3 gap-1 md:gap-2" 
                : "grid-cols-7 grid-rows-6 gap-1 md:gap-2 lg:gap-2.5"
            )}>
              {days.map((day, idx) => {
                const isCurrentMonth = viewType === 'month' ? isSameMonth(day, monthStart) : true
                const isToday = isSameDay(day, new Date())
                
                const dayEvents = events.filter(event => {
                  const eventDate = getEventStartTime(event)
                  if (viewType === 'year') {
                    return isSameMonth(eventDate, day)
                  }
                  return isSameDay(eventDate, day)
                })

                return (
                  <div 
                    key={day.toString()}
                    onClick={() => {
                      if (viewType === 'year') {
                        setCurrentDate(day)
                        setViewType('month')
                        return
                      }
                      setSelectedDate(day)
                      setSelectedEndDate(addMinutes(day, duration))
                      setIsModalOpen(true)
                    }}
                    className={cn(
                      "relative flex flex-col p-1.5 md:p-3 lg:p-4 rounded-xl md:rounded-2xl lg:rounded-3xl transition-all cursor-pointer group/cell overflow-hidden",
                      !isCurrentMonth ? "opacity-20" : "hover:bg-white/5",
                      isToday && "bg-white/10 ring-1 ring-white/20",
                      viewType === 'year' && "items-center justify-center text-center"
                    )}
                  >
                    <div className={cn(
                      "flex justify-center items-center mb-1 relative",
                      viewType === 'year' && "flex-col"
                    )}>
                      <span className={cn(
                        "font-bold transition-all duration-300 group-hover/cell:scale-110 flex items-center justify-center rounded-xl",
                        viewType === 'year' ? "text-lg md:text-xl p-2" : "text-[10px] md:text-sm w-6 h-6 md:w-8 md:h-8",
                        isToday 
                          ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]" 
                          : (isCurrentMonth ? "text-zinc-300" : "text-zinc-600")
                      )}>
                        {viewType === 'year' ? format(day, 'MMM', { locale: zhCN }) : format(day, 'd', { locale: zhCN })}
                      </span>
                      {isCurrentMonth && viewType !== 'year' && (
                        <Plus className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 transition-opacity w-3 h-3 md:w-4 md:h-4 text-zinc-700 mr-1" />
                      )}
                    </div>
                    
                    <div className={cn(
                      "flex-1 overflow-y-auto scrollbar-none",
                      viewType === 'year' ? "flex flex-wrap justify-center gap-1 mt-2" : "space-y-0.5 md:space-y-1"
                    )}>
                      {dayEvents.slice(0, viewType === 'year' ? 6 : undefined).map(event => {
                        const staffIdMatch = event["备注"]?.match(/技师:([^,]+)/)
                        const staffId = staffIdMatch ? staffIdMatch[1] : null
                        const staff = STAFF_MEMBERS.find(s => s.id === staffId)
                        
                        return (
                          <div 
                            key={event.id}
                            onClick={(e) => {
                              if (viewType === 'year') return
                              e.stopPropagation()
                              openEditModal(event)
                            }}
                            className={cn(
                              "rounded-lg border border-white/10 transition-all shadow-md cursor-pointer hover:brightness-110",
                              viewType === 'year' ? "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" : "text-[8px] md:text-[10px] px-1.5 md:px-2 py-0.5 md:py-1 truncate text-white font-black flex items-center gap-1",
                              event["背景颜色"] || 'bg-blue-600',
                              "border-l-2 border-l-black/60 backdrop-blur-sm"
                            )}
                          >
                            {viewType !== 'year' && (
                              <>
                                {staffId === 'NO' && <span className="text-[7px] bg-zinc-800 px-0.5 rounded border border-zinc-700">NO</span>}
                                <span className="truncate">{event["服务项目"]}</span>
                              </>
                            )}
                          </div>
                        )
                      })}
                      {viewType === 'year' && dayEvents.length > 6 && (
                        <div className="text-[8px] text-zinc-500 font-bold">+{dayEvents.length - 6}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* --- Event Modal --- */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300"
          onClick={closeModal}
        >
          <div 
            className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
                {/* Left Column - Core Info */}
                <div className="p-6 space-y-4">
                  {/* Title Section - Centered */}
                  <div className="flex flex-col items-center justify-center mb-6 space-y-1.5">
                    <h2 className="text-xl font-black italic tracking-[0.4em] text-white">FX ESTETICA</h2>
                    <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  </div>

                  {/* Row 2: Service & Member */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        服务内容
                      </label>
                      <input 
                        autoFocus
                        type="text"
                        placeholder="输入服务项目..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all text-xs placeholder:text-zinc-700"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onFocus={() => {
                          setShowServiceSelection(true)
                          setShowMemberDetail(false)
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-1.5 relative">
                      <label className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        会员信息
                      </label>
                      <input 
                        type="text"
                        placeholder="姓名/卡号/电话"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all text-xs placeholder:text-zinc-700"
                        value={memberInfo}
                        onChange={(e) => {
                          setMemberInfo(e.target.value)
                          setMemberSearchQuery(e.target.value)
                        }}
                        onFocus={() => {
                          setShowServiceSelection(false)
                          if (selectedMember) setShowMemberDetail(true)
                        }}
                      />
                      {/* Search Results Dropdown */}
                      {(filteredMembers.length > 0 || memberSearchQuery) && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 max-h-40 overflow-y-auto overflow-x-hidden backdrop-blur-xl">
                          {filteredMembers.map((member) => (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => handleSelectMember(member)}
                              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                            >
                              <div className="flex flex-col items-start">
                                <span className="text-xs font-bold text-white">{member.name}</span>
                                <span className="text-[10px] text-zinc-500">{member.phone}</span>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                                {member.card}
                              </span>
                            </button>
                          ))}
                          {memberSearchQuery && !filteredMembers.some(m => m.phone === memberSearchQuery) && (
                            <button
                              type="button"
                              onClick={() => handleNewMember(memberSearchQuery)}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-500/10 transition-colors text-emerald-500"
                            >
                              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <span className="text-lg">+</span>
                              </div>
                              <div className="flex flex-col items-start">
                                <span className="text-[10px] font-bold uppercase tracking-widest">创建新会员</span>
                                <span className="text-xs font-black">{memberSearchQuery}</span>
                              </div>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Date & Start Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        服务日期
                      </label>
                      <input 
                        type="date"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all text-xs [color-scheme:dark]"
                        value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                        onChange={(e) => {
                          const [y, m, d] = e.target.value.split('-').map(Number)
                          if (selectedDate) {
                            const newDate = new Date(selectedDate)
                            newDate.setFullYear(y, m - 1, d)
                            setSelectedDate(newDate)
                            setSelectedEndDate(addMinutes(newDate, duration))
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        开始时间
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all text-xs [color-scheme:dark] appearance-none cursor-pointer text-center font-bold"
                          value={selectedDate ? format(selectedDate, 'HH') : '08'}
                          onChange={(e) => {
                            const h = Number(e.target.value)
                            if (selectedDate) {
                              const newDate = new Date(selectedDate)
                              newDate.setHours(h)
                              setSelectedDate(newDate)
                              setSelectedEndDate(addMinutes(newDate, duration))
                            }
                          }}
                        >
                          {Array.from({ length: 15 }, (_, i) => i + 8).map(h => (
                            <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')} 时</option>
                          ))}
                        </select>
                        <select 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all text-xs [color-scheme:dark] appearance-none cursor-pointer text-center font-bold"
                          value={selectedDate ? format(selectedDate, 'mm') : '00'}
                          onChange={(e) => {
                            const m = Number(e.target.value)
                            if (selectedDate) {
                              const newDate = new Date(selectedDate)
                              newDate.setMinutes(m)
                              setSelectedDate(newDate)
                              setSelectedEndDate(addMinutes(newDate, duration))
                            }
                          }}
                        >
                          {['00', '15', '30', '45'].map(m => (
                            <option key={m} value={m}>{m} 分</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Duration & End Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        持续时间
                      </label>
                      <select 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all text-xs [color-scheme:dark] appearance-none cursor-pointer font-bold"
                        value={duration}
                        onChange={(e) => {
                          const newDuration = Number(e.target.value)
                          setDuration(newDuration)
                          if (selectedDate) {
                            setSelectedEndDate(addMinutes(new Date(selectedDate), newDuration))
                          }
                        }}
                      >
                        {[15, 30, 45, 60, 75, 90, 105, 120, 150].map(m => (
                          <option key={m} value={m}>{m} 分钟</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        结束时间
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all text-xs [color-scheme:dark] appearance-none cursor-pointer text-center font-bold"
                          value={selectedEndDate ? format(selectedEndDate, 'HH') : (selectedDate ? format(selectedDate, 'HH') : '08')}
                          onChange={(e) => {
                            const h = Number(e.target.value)
                            if (selectedEndDate) {
                              const newDate = new Date(selectedEndDate)
                              newDate.setHours(h)
                              setSelectedEndDate(newDate)
                            } else if (selectedDate) {
                              const newDate = new Date(selectedDate)
                              newDate.setHours(h)
                              setSelectedEndDate(newDate)
                            }
                          }}
                        >
                          {Array.from({ length: 15 }, (_, i) => i + 8).map(h => (
                            <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')} 时</option>
                          ))}
                        </select>
                        <select 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all text-xs [color-scheme:dark] appearance-none cursor-pointer text-center font-bold"
                          value={selectedEndDate ? format(selectedEndDate, 'mm') : (selectedDate ? format(selectedDate, 'mm') : '00')}
                          onChange={(e) => {
                            const m = Number(e.target.value)
                            if (selectedEndDate) {
                              const newDate = new Date(selectedEndDate)
                              newDate.setMinutes(m)
                              setSelectedEndDate(newDate)
                            } else if (selectedDate) {
                              const newDate = new Date(selectedDate)
                              newDate.setMinutes(m)
                              setSelectedEndDate(newDate)
                            }
                          }}
                        >
                          {['00', '15', '30', '45'].map(m => (
                            <option key={m} value={m}>{m} 分</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Row 5: Staff */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      服务人员
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {STAFF_MEMBERS.map((staff) => (
                        <button
                          key={staff.id}
                          type="button"
                          onClick={() => {
                            setSelectedStaffId(staff.id)
                            const colorMap: Record<string, string> = {
                              '': 'bg-blue-600',
                              '1': 'bg-rose-600',
                              '2': 'bg-emerald-600',
                              '3': 'bg-purple-600',
                              '4': 'bg-orange-600',
                              '5': 'bg-amber-600',
                              'NO': 'bg-zinc-500'
                            }
                            setSelectedColor(colorMap[staff.id])
                          }}
                          className={cn(
                            "px-4 py-2 rounded-full text-[11px] font-black transition-all border-2 shrink-0 tracking-widest uppercase",
                            selectedStaffId === staff.id 
                              ? `bg-white text-black ${staff.color} shadow-lg scale-105` 
                              : "bg-zinc-950 text-zinc-500 border-zinc-800/50 hover:border-zinc-700"
                          )}
                        >
                          {staff.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Row 6: Amounts */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        服务金额
                      </label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {STAFF_MEMBERS.filter(s => s.id !== 'NO').map((staff) => (
                          <div key={staff.id} className="flex flex-col gap-1">
                            <input 
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="€"
                              value={staffAmounts[staff.name] || ''}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setStaffAmounts(prev => ({ ...prev, [staff.name]: val }));
                              }}
                              className={cn(
                                "w-full bg-zinc-950 border rounded-lg px-0 py-2.5 text-white text-center focus:outline-none focus:ring-1 focus:ring-white/10 transition-all text-[10px] placeholder:text-zinc-800 placeholder:text-center",
                                staff.id === '1' && "border-rose-500",
                                staff.id === '2' && "border-emerald-500",
                                staff.id === '3' && "border-purple-500",
                                staff.id === '4' && "border-orange-500",
                                staff.id === '5' && "border-amber-500",
                                !['1', '2', '3', '4', '5'].includes(staff.id) && "border-zinc-800"
                              )}
                            />
                            <span className="text-[7px] text-center font-bold text-zinc-600 uppercase tracking-tighter truncate">{staff.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                </div>

                {/* Right Column - Member Detail or Service Selection */}
                <div className="p-6 space-y-4 bg-white/[0.01]">
                  {showMemberDetail && selectedMember ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                      {/* Member Info Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <h2 className="text-xl font-black text-white shrink-0">{memberId}</h2>
                            <input 
                              type="text"
                              placeholder="输入姓名..."
                              value={memberName}
                              onChange={(e) => {
                                setMemberName(e.target.value)
                                setSelectedMember((prev: any) => ({ ...prev, name: e.target.value }))
                              }}
                              className="bg-transparent border-none text-lg font-bold text-zinc-400 focus:outline-none focus:text-white transition-all placeholder:text-zinc-800 flex-1 min-w-0"
                            />
                          </div>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider truncate">{selectedMember.level}</span>
                        </div>
                        <div className="text-right shrink-0 pt-1">
                          <div className="text-xl font-black text-white leading-none">€{selectedMember.totalSpend}</div>
                          <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">总消费</div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-1">
                          <div className="text-xs font-black text-white">{selectedMember.totalVisits} 次</div>
                          <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">总消费次数</div>
                        </div>
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-1">
                          <div className="text-xs font-black text-white">
                            {isNewMember ? '0' : Math.floor((new Date().getTime() - new Date(selectedMember.lastVisit).getTime()) / (1000 * 60 * 60 * 24))} 天
                          </div>
                          <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">距离上次</div>
                        </div>
                      </div>

                      {/* Middle Section: Classification Tags or History */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                          {isNewMember ? '分类建议' : '消费记录'}
                        </label>
                        
                        {isNewMember ? (
                          <div className="grid grid-cols-5 gap-2 pt-2">
                            {[
                              { id: 'young', label: '青', name: '年轻人', color: 'bg-blue-500' },
                              { id: 'middle', label: '绿', name: '中年人', color: 'bg-emerald-500' },
                              { id: 'senior', label: '橙', name: '老年人', color: 'bg-orange-500' },
                              { id: 'male', label: '蓝', name: '男人', color: 'bg-indigo-500' },
                              { id: 'noshow', label: '红', name: '爽约', color: 'bg-rose-500' }
                            ].map((tag) => (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => generateMemberId(tag.id)}
                                className="flex flex-col items-center gap-1.5 group"
                              >
                                <div className={cn(
                                  "w-10 h-10 rounded-full flex items-center justify-center text-white text-[10px] font-black transition-all group-hover:scale-110 shadow-lg",
                                  tag.color
                                )}>
                                  {tag.label}
                                </div>
                                <span className="text-[8px] font-bold text-zinc-500 group-hover:text-zinc-300 uppercase tracking-tighter">
                                  {tag.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {selectedMember.history.map((item: any, idx: number) => (
                              <div key={idx} className="bg-zinc-950/50 border border-white/5 rounded-xl p-3 flex items-center justify-between group hover:border-white/10 transition-all">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-zinc-300">{item.date}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">{item.staff}</span>
                                  </div>
                                  <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">{item.service}</span>
                                </div>
                                <span className="text-sm font-black text-white">€{item.amount}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Notes Section */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">备注</label>
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus-within:border-amber-500/50 transition-all">
                          <input 
                            type="text"
                            placeholder="填写备注信息..."
                            value={memberNote}
                            onChange={(e) => {
                              setMemberNote(e.target.value)
                              setSelectedMember((prev: any) => ({ ...prev, note: e.target.value }))
                            }}
                            className="w-full bg-transparent border-none text-xs text-zinc-300 italic focus:outline-none placeholder:text-zinc-800"
                          />
                        </div>
                      </div>
                    </div>
                  ) : showServiceSelection ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                      {/* Title Section - Centered (Matching Left) */}
                      <div className="flex flex-col items-center justify-center mb-6 space-y-1.5">
                        <h2 className="text-xl font-black italic tracking-[0.4em] text-white">FX ESTETICA</h2>
                        <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                      </div>

                      {/* Service Categories - 4 Columns */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { title: 'Mani', color: 'from-pink-500/20 to-rose-500/20', items: ['Mn', 'Ms', 'Rc', 'Rt', 'Cop'] },
                          { title: 'Piedi', color: 'from-emerald-500/20 to-teal-500/20', items: ['Pn', 'Ps'] },
                          { title: 'Ceretta', color: 'from-amber-500/20 to-orange-500/20', items: [] },
                          { title: 'Viso', color: 'from-blue-500/20 to-indigo-500/20', items: [] }
                        ].map((category) => (
                          <div key={category.title} className="space-y-2">
                            <div 
                              onClick={() => setNewTitle(category.title)}
                              className={cn(
                                "aspect-[1/1.2] rounded-xl bg-gradient-to-br border border-white/10 flex flex-col items-center justify-center p-1.5 group cursor-pointer hover:border-white/30 transition-all",
                                category.color
                              )}
                            >
                              <h4 className="text-[9px] font-black italic tracking-widest text-white uppercase group-hover:scale-110 transition-transform">
                                {category.title}
                              </h4>
                              <div className="mt-1 w-4 h-[1px] bg-white/20 group-hover:w-8 transition-all" />
                            </div>
                            
                            {/* Sub Items */}
                            <div className="flex flex-col gap-1">
                              {category.items.map((item) => (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => setNewTitle(item)}
                                  className="w-full py-1.5 px-2 rounded-lg bg-white/[0.03] border border-white/5 text-[10px] font-bold text-zinc-400 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all active:scale-95"
                                >
                                  {item}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20">
                      <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                        <span className="text-white/20 text-xl font-black">?</span>
                      </div>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">请选择服务或会员</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-5 bg-zinc-950/50 border-t border-white/5 flex flex-col md:flex-row gap-3 items-center">
                <div className="flex-1 flex gap-2 w-full md:w-auto">
                  {editingEvent && (
                    <button 
                      type="button" 
                      onClick={handleDeleteEvent}
                      disabled={isSubmitting}
                      className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-rose-500 hover:bg-rose-500/10 transition-all text-xs border border-rose-500/20 active:scale-95"
                    >
                      删除
                    </button>
                  )}
                  <button type="button" onClick={closeModal} className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-800 transition-all text-xs active:scale-95">
                    取消
                  </button>
                </div>
                <button 
                  disabled={isSubmitting} 
                  type="submit" 
                  className="w-full md:w-auto md:px-10 py-3 bg-white text-black rounded-xl font-black hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs shadow-[0_8px_30px_rgb(255,255,255,0.1)] active:scale-95"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingEvent ? '保存修改' : '确认创建')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
