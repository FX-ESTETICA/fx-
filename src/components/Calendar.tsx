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
import { zhCN, it as itLocale } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, X, Loader2, Calendar as CalendarIcon, Clock, Settings2, GripVertical, Eye, EyeOff } from 'lucide-react'
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

interface StaffMember {
  id: string
  name: string
  role: string
  avatar: string
  color: string
  bgColor: string
  hidden?: boolean
}

interface MemberHistoryItem {
  date: string
  service: string
  staff: string
  amount: number
}

interface Member {
  id?: number
  name: string
  phone: string
  card: string
  level: string
  totalSpend: number
  totalVisits: number
  lastVisit: string
  note: string
  history: MemberHistoryItem[]
}

const COLOR_OPTIONS = [
  { label: '玫瑰红', value: 'bg-rose-500' },
  { label: '红色', value: 'bg-red-500' },
  { label: '橙色', value: 'bg-orange-500' },
  { label: '琥珀黄', value: 'bg-amber-500' },
  { label: '黄色', value: 'bg-yellow-400' },
  { label: '柠檬绿', value: 'bg-lime-400' },
  { label: '绿色', value: 'bg-green-500' },
  { label: '翡翠绿', value: 'bg-emerald-500' },
  { label: '青色', value: 'bg-teal-400' },
  { label: '水色', value: 'bg-cyan-400' },
  { label: '天蓝色', value: 'bg-sky-400' },
  { label: '蓝色', value: 'bg-blue-500' },
  { label: '靛蓝色', value: 'bg-indigo-500' },
  { label: '紫罗兰', value: 'bg-violet-500' },
  { label: '紫色', value: 'bg-purple-500' },
  { label: '洋红色', value: 'bg-fuchsia-500' },
  { label: '粉红色', value: 'bg-pink-500' },
  { label: '亮玫瑰', value: 'bg-rose-400' },
  { label: '板岩灰', value: 'bg-slate-400' },
  { label: '锌灰色', value: 'bg-zinc-500' },
]

// Staff data for Nail Salon
const STAFF_MEMBERS: StaffMember[] = [
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
  lang?: 'zh' | 'it';
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

const I18N = {
  zh: {
    viewLabels: { day: '日', week: '周', month: '月', year: '年' } as Record<ViewType, string>,
    startTime: '开始时间',
    duration: '持续时间',
    endTime: '结束时间',
    staff: '服务人员',
    notes: '备注',
    notesPlaceholder: '填写备注信息...',
    choosePrompt: '请选择服务或会员',
    serviceDate: '服务日期',
    amount: '服务金额',
    hourSuffix: ' 时',
    minuteSuffix: ' 分',
    minutesSuffix: ' 分钟',
    dayHeaderFormat: 'M月d日 EEEE',
    headerDayFmt: 'yyyy / MM / dd',
    headerMonthFmt: 'yyyy / MM',
    headerYearFmt: 'yyyy',
    weekdays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  },
  it: {
    viewLabels: { day: 'Giorno', week: 'Settimana', month: 'Mese', year: 'Anno' } as Record<ViewType, string>,
    startTime: 'Ora di inizio',
    duration: 'Durata',
    endTime: 'Ora di fine',
    staff: 'Staff',
    notes: 'Note',
    notesPlaceholder: 'Inserisci note...',
    choosePrompt: 'Seleziona servizio o membro',
    serviceDate: 'Data',
    amount: 'Importo',
    hourSuffix: ' h',
    minuteSuffix: ' min',
    minutesSuffix: ' minuti',
    dayHeaderFormat: 'd MMMM EEEE',
    headerDayFmt: 'dd / MM / yyyy',
    headerMonthFmt: 'MM / yyyy',
    headerYearFmt: 'yyyy',
    weekdays: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
  }
}

export default function Calendar({ initialDate, initialView = 'day', onToggleSidebar, bgIndex = 0, lang = 'zh' }: CalendarProps) {
  const supabase = createClient()
  
  // Use a stable initial date for SSR to avoid hydration mismatch
  const [currentDate, setCurrentDate] = useState(initialDate || new Date(2024, 0, 1))
  
  // Update to real "today" only on client
  useEffect(() => {
    if (!initialDate) {
      setCurrentDate(new Date())
    }
  }, [initialDate])
  const [viewType, setViewType] = useState<ViewType>(initialView)
  const [isResizing, setIsResizing] = useState(false)
  const [isHeaderVisible, setIsHeaderVisible] = useState(false)
  
  // Handle prop updates intentionally omitted to avoid cascading renders
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [allDatabaseEvents, setAllDatabaseEvents] = useState<CalendarEvent[]>([])
  const [today, setToday] = useState<Date | null>(null)
  useEffect(() => {
    setToday(new Date())
  }, [])

  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [showServiceSelection, setShowServiceSelection] = useState(false)
  const [showMemberDetail, setShowMemberDetail] = useState(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [isNewMember, setIsNewMember] = useState(false)
  const [memberId, setMemberId] = useState('0000')
  const [memberName, setMemberName] = useState('')
  const [memberNote, setMemberNote] = useState('')
  const [showCheckoutPreview, setShowCheckoutPreview] = useState(false)
  const [showStaffSelector, setShowStaffSelector] = useState(false)
  
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(STAFF_MEMBERS)
  const [isMounted, setIsMounted] = useState(false)
  
  // Set isMounted to true after the component mounts
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load staff from localStorage on mount
  useEffect(() => {
    if (!isMounted) return
    const saved = localStorage.getItem('staff_members')
    if (saved) {
      try {
        setStaffMembers(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse staff_members from localStorage', e)
      }
    }
  }, [isMounted])
  const [isStaffManagerOpen, setIsStaffManagerOpen] = useState(false)
  const [newStaffName, setNewStaffName] = useState('')
  const [activeColorPickerStaffId, setActiveColorPickerStaffId] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  
  // Save staff to localStorage when changed
  useEffect(() => {
    localStorage.setItem('staff_members', JSON.stringify(staffMembers))
  }, [staffMembers])
  
  // Form State
  const [newTitle, setNewTitle] = useState('')
  const [memberInfo, setMemberInfo] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null)
  const [duration, setDuration] = useState<number>(60)
  const [selectedColor, setSelectedColor] = useState('bg-sky-400')
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])
  const [clickedStaffId, setClickedStaffId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Define service categories with prices outside render for easier access
  const serviceCategories = [
    { title: 'Mani', color: 'from-pink-500/20 to-rose-500/20', items: [
      { name: 'Mn', price: 15, duration: 20 },
      { name: 'Ms', price: 35, duration: 45 },
      { name: 'Rc', price: 60, duration: 90 },
      { name: 'Rt', price: 46, duration: 75 },
      { name: 'Cop', price: 49, duration: 75 },
      { name: 'T.s', price: 8, duration: 5 },
      { name: 'T.g', price: 15, duration: 15 }
    ] },
    { title: 'Piedi', color: 'from-emerald-500/20 to-teal-500/20', items: [
      { name: 'Pn', price: 23, duration: 30 },
      { name: 'Ps', price: 38, duration: 60 }
    ] },
    { title: 'Ceretta', color: 'from-amber-500/20 to-orange-500/20', items: [
      { name: 'Sop', price: 5, duration: 5 },
      { name: 'Baf', price: 5, duration: 5 },
      { name: 'Asc', price: 9, duration: 10 },
      { name: 'Bra', price: 15, duration: 20 },
      { name: 'Gam', price: 24, duration: 30 },
      { name: 'In', price: 15, duration: 20 },
      { name: 'Sch', price: 19, duration: 20 },
      { name: 'Pet', price: 18, duration: 20 },
      { name: 'Pan', price: 6, duration: 10 }
    ] },
    { title: 'Viso', color: 'from-blue-500/20 to-indigo-500/20', items: [
      { name: 'EX.ciglia', price: 65, duration: 120 },
      { name: 'Rt.ciglia', price: 40, duration: 75 },
      { name: 'L.ciglia', price: 50, duration: 60 },
      { name: 'C.ciglia', price: 30, duration: 60 },
      { name: 'L.sop', price: 30, duration: 60 },
      { name: 'C.sop', price: 30, duration: 60 },
      { name: 'P.viso', price: 35, duration: 60 }
    ] }
  ];

  // Calculate total price based on selected items in newTitle
  const calculateTotalPrice = () => {
    const selectedItems = newTitle.split(',').map(s => s.trim()).filter(Boolean);
    let total = 0;
    selectedItems.forEach(itemName => {
      // Find item in any category
      for (const cat of serviceCategories) {
        const item = cat.items.find(i => i.name === itemName);
        if (item) {
          total += item.price;
          break;
        }
      }
    });
    return total;
  };

  const [staffAmounts, setStaffAmounts] = useState<Record<string, string>>(() => {
    return {}
  })
  const [itemStaffMap, setItemStaffMap] = useState<Record<string, string>>({})
  const [serviceMode, setServiceMode] = useState<'normal' | 'sequential' | 'parallel'>('normal')

  // Helper to get staff color class
  const getStaffColorClass = (staffId: string | undefined, type: 'text' | 'bg' | 'border' = 'text') => {
    // If no staff is selected (unassigned), use sky-400 (Blue)
    if (!staffId || staffId === '') return type === 'text' ? 'text-sky-400' : (type === 'bg' ? 'bg-sky-400' : 'border-sky-400')
    
    const staff = staffMembers.find(s => s.id === staffId)
    const fixedColorMap: Record<string, string> = {
      '1': 'rose-500',
      '2': 'emerald-500',
      '3': 'purple-500',
      '4': 'orange-500',
      '5': 'amber-500',
      'NO': 'zinc-500' // NO (No Show) should be Zinc/Grey
    }
    
    const colorName = staff?.bgColor?.match(/bg-([a-z0-9-]+)/)?.[1] || fixedColorMap[staffId] || 'sky-400'
    return `${type}-${colorName}`
  }

  // Derived state for active staff columns
  const activeStaff = useMemo(() => {
    // Filter out hidden staff first
    const visibleStaff = staffMembers.filter(s => !s.hidden);
    
    if (viewType !== 'day') return visibleStaff;
    
    return visibleStaff.filter(s => {
      if (s.id !== 'NO') return true;
      // Only show NO column if there are NO show events today
      return events.some(e => 
        isSameDay(getEventStartTime(e), currentDate) && 
        e["备注"]?.includes('技师:NO')
      );
    });
  }, [viewType, events, currentDate, staffMembers]);

  // Pre-calculate which column each event should go to (for day view)
  const eventAssignments = useMemo(() => {
    if (viewType !== 'day') return new Map<string, string>();
    
    const assignments = new Map<string, string>();
    const todayEvents = events.filter(e => isSameDay(getEventStartTime(e), currentDate));
    
    // Sort events by start time to process them in order (in unassigned pass below)

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
  const VIEW_LABELS: Record<ViewType, string> = I18N[lang].viewLabels

  // View cycling handled by segmented control buttons

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

  const fetchAllEventsForLibrary = useCallback(async () => {
    const { data, error } = await supabase
      .from('fx_events')
      .select('*')
    
    if (error) {
      console.error('Error fetching all events for library:', error)
    } else {
      setAllDatabaseEvents(data || [])
    }
  }, [supabase])

  useEffect(() => {
    const t = setTimeout(() => {
      fetchEvents()
      fetchAllEventsForLibrary()
    }, 0)
    return () => clearTimeout(t)
  }, [fetchEvents, fetchAllEventsForLibrary])
  
  useEffect(() => {
    const channel = supabase
      .channel('fx_events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fx_events' }, () => {
        fetchEvents()
        fetchAllEventsForLibrary()
      })
    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchEvents])

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

  // Quick-jump to today handled via the “今/OGGI” button in header

  const handleSubmit = async (e: React.FormEvent, forcedMode?: 'normal' | 'sequential' | 'parallel') => {
    e.preventDefault()
    if (!newTitle || !selectedDate) return

    setIsSubmitting(true)
    
    const startTimeStr = format(selectedDate, 'HH:mm:ss')
    const serviceDateStr = format(selectedDate, 'yyyy-MM-dd')
    
    // Format member_info as (memberId)Name (Phone)
    let finalInfo = memberInfo.trim()
    const trimmedName = memberName.trim()
    
    if (trimmedName) {
      // If we have a name, combine it with the info (which might be phone)
      if (finalInfo && finalInfo !== trimmedName) {
        // Check if finalInfo is just the phone number (to avoid saving Name (Name))
        if (/^\d+$/.test(finalInfo)) {
          finalInfo = `${trimmedName} (${finalInfo})`
        } else {
          // If finalInfo is not just digits, it might be the name already or some other info
          // Just use the provided name as primary
          finalInfo = trimmedName
        }
      } else {
        finalInfo = trimmedName
      }
    }
    
    const formattedMemberInfo = memberId && memberId !== '0000' ? `(${memberId})${finalInfo}` : `(0000)${finalInfo}`

    const items = newTitle.split(',').map(s => s.trim()).filter(Boolean);
    const effectiveMode = forcedMode || serviceMode;
    
    // Determine if we should split: 
    // 1. Not editing an existing event
    // 2. Multiple items OR explicitly in split mode
    const shouldSplit = !editingEvent && (items.length > 1 || effectiveMode === 'sequential' || effectiveMode === 'parallel');
    const splitMode = effectiveMode !== 'normal' ? effectiveMode : 'parallel';

    if (shouldSplit) {
      const eventsToInsert = [];
      let currentStartTime = new Date(selectedDate);

      for (const itemName of items) {
        const itemStaffId = itemStaffMap[itemName] || selectedStaffId;
        const itemStaff = staffMembers.find(s => s.id === itemStaffId);
        
        // Find item price and duration
        let itemPrice = 0;
        let itemDuration = duration; // Default to current duration state if not found
        for (const cat of serviceCategories) {
          const found = cat.items.find(i => i.name === itemName);
          if (found) {
            itemPrice = found.price;
            if (found.duration) {
              itemDuration = found.duration;
            }
            break;
          }
        }

        const startTimeStr = format(currentStartTime, 'HH:mm:ss');
        const serviceDateStr = format(currentStartTime, 'yyyy-MM-dd');
        
        // Final background color determination:
        // Map of specific IDs to the new 20 colors
        const fixedColorMap: Record<string, string> = {
          '1': 'bg-rose-500',
          '2': 'bg-emerald-500',
          '3': 'bg-purple-500',
          '4': 'bg-orange-500',
          '5': 'bg-amber-500',
          'NO': 'bg-zinc-500'
        }
        const itemColor = !itemStaffId || itemStaffId === '' 
          ? 'bg-sky-400' 
          : (itemStaffId === 'NO' ? 'bg-zinc-500' : (itemStaff?.bgColor?.replace('/10', '') || fixedColorMap[itemStaffId] || 'bg-sky-400'));

        const eventData: any = {
          "服务项目": itemName,
          "会员信息": formattedMemberInfo,
          "服务日期": serviceDateStr,
          "开始时间": startTimeStr,
          "持续时间": itemDuration,
          "背景颜色": itemColor,
          "备注": `技师:${itemStaffId}${clickedStaffId ? `,建议:${clickedStaffId}` : ''}`,
        };

        // Add amount for the specific staff member assigned to this item
        if (itemStaff && itemPrice > 0) {
          const existingColumns = ['FANG', 'SARA', 'DAN', 'ALEXA', 'FEDE'];
          if (existingColumns.includes(itemStaff.name)) {
            eventData[`金额_${itemStaff.name}`] = itemPrice;
          } else {
            eventData["备注"] += `, [${itemStaff.name}_AMT:${itemPrice}]`;
          }
        }

        eventsToInsert.push(eventData);

        // If sequential, increment start time for next item
        if (splitMode === 'sequential') {
          currentStartTime = addMinutes(currentStartTime, itemDuration);
        }
      }

      if (eventsToInsert.length > 0) {
        const { error } = await supabase
          .from('fx_events')
          .insert(eventsToInsert);

        if (error) {
          alert('批量添加失败: ' + error.message);
        } else {
          closeModal();
          fetchEvents();
        }
      }
      
      // Reset service mode after use
      setServiceMode('normal');
      setIsSubmitting(false);
      return;
    }

    const eventData: any = {
      "服务项目": newTitle,
      "会员信息": formattedMemberInfo,
      "服务日期": serviceDateStr,
      "开始时间": startTimeStr,
      "持续时间": duration,
      "背景颜色": selectedColor,
      "备注": `技师:${selectedStaffId}${clickedStaffId ? `,建议:${clickedStaffId}` : ''}`,
    }

    // List of columns that actually exist in the database
    const existingColumns = ['FANG', 'SARA', 'DAN', 'ALEXA', 'FEDE']
    let extraNotes = ''

    // Final background color determination:
    // If no staff is selected (unassigned), force Blue
    // If NO (No Show) is selected, force Grey
    let finalColor = selectedColor;
    if (!selectedStaffId || selectedStaffId === '') {
      finalColor = 'bg-sky-400';
    } else if (selectedStaffId === 'NO') {
      finalColor = 'bg-zinc-500';
    }
    eventData["背景颜色"] = finalColor;

    // Add amounts for each staff member
    staffMembers.forEach(staff => {
      if (staff.id !== 'NO') {
        const amount = Number(staffAmounts[staff.name]) || 0
        if (amount > 0) {
          if (existingColumns.includes(staff.name)) {
            // Store in dedicated column if it exists
            eventData[`金额_${staff.name}`] = amount
          } else {
            // Otherwise, append to a special format in notes for retrieval
            extraNotes += `, [${staff.name}_AMT:${amount}]`
          }
        }
      }
    })

    eventData["备注"] = `技师:${selectedStaffId}${clickedStaffId ? `,建议:${clickedStaffId}` : ''}${extraNotes}`

    if (editingEvent) {
      console.log('Updating event:', editingEvent.id, eventData);
      // Update existing event
      const { error, count, data } = await supabase
        .from('fx_events')
        .update(eventData)
        .eq('id', editingEvent.id)
        .select()

      if (error) {
        alert('更新失败: ' + error.message)
      } else if (data && data.length === 0) {
        console.warn('Update affected 0 rows. Possible ID mismatch:', editingEvent.id);
        alert('更新未生效，请刷新页面重试。')
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

    setIsSubmitting(true)
    console.log('Attempting to delete event:', editingEvent.id);
    const { error, count } = await supabase
      .from('fx_events')
      .delete()
      .eq('id', editingEvent.id)
      .select()

    if (error) {
      alert('删除失败: ' + error.message)
    } else {
      console.log('Delete result count:', count);
      closeModal()
      fetchEvents()
    }
    setIsSubmitting(false)
  }

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event)
    const currentService = event["服务项目"]
    setNewTitle(currentService)
    
    // Parse service_date and start_time back into selectedDate
    const start = getEventStartTime(event)
    
    setSelectedDate(start)
    setDuration(event["持续时间"])
    setSelectedEndDate(addMinutes(start, event["持续时间"]))
    setSelectedColor(event["背景颜色"])
    
    // ... (parsing member info logic)
    if (event["会员信息"]) {
      const match = event["会员信息"].match(/^\(([^)]+)\)(.*)$/)
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

        if (id !== '0000') {
          setShowMemberDetail(true)
          const existingMember = allMembers.find(m => m.card === id)
          if (existingMember) {
            setSelectedMember(existingMember)
          } else {
            setSelectedMember({
              name: extractedName || '',
              phone: info,
              card: id,
              level: id.startsWith('NO') ? '爽约名单' : '普通会员',
              totalSpend: 0,
              totalVisits: 0,
              lastVisit: event["服务日期"],
              note: '',
              history: []
            })
          }
        }
      } else {
        setMemberInfo(event["会员信息"])
      }
    }

    // Set amounts dynamically
    const amounts: Record<string, string> = {}
    staffMembers.forEach(staff => {
      if (staff.id !== 'NO') {
        const colAmount = event[`金额_${staff.name}` as keyof CalendarEvent]
        if (colAmount !== undefined && colAmount !== null && colAmount !== 0) {
          amounts[staff.name] = colAmount.toString()
        } else {
          const noteMatch = event["备注"]?.match(new RegExp(`\\[${staff.name}_AMT:(\\d+)\\]`))
          if (noteMatch) {
            amounts[staff.name] = noteMatch[1]
          }
        }
      }
    })
    setStaffAmounts(amounts)

    const staffMatch = event["备注"]?.match(/技师:([^,]+)/)
    const parsedStaffId = staffMatch ? staffMatch[1] : ''
    setSelectedStaffId(parsedStaffId)
    
    // CRITICAL: Restore itemStaffMap for split events
    if (currentService && parsedStaffId) {
      setItemStaffMap({ [currentService]: parsedStaffId })
    }

    if (parsedStaffId && parsedStaffId !== 'NO') {
      setSelectedStaffIds([parsedStaffId])
    } else {
      setSelectedStaffIds([])
    }
    
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
    setSelectedStaffIds([])
    setClickedStaffId('')
    setStaffAmounts({})
    setItemStaffMap({})
    setShowServiceSelection(false)
    setShowMemberDetail(false)
    setMemberSearchQuery('')
    setSelectedMember(null)
    setIsNewMember(false)
    setMemberId('0000')
    setMemberName('')
    setMemberNote('')
    setShowCheckoutPreview(false)
  }

  // --- Derived Member Data ---
   const databaseMembers = useMemo(() => {
     const memberMap = new Map<string, Member>()
     
     allDatabaseEvents.forEach(event => {
       const info = event["会员信息"]
       if (!info) return
       
       let id = '0000'
       let name = ''
       let phone = ''
       
       const match = info.match(/^\(([^)]+)\)(.*)$/)
       if (match) {
         id = match[1]
         const remaining = match[2].trim()
         // Try to parse "Name (Phone)"
         const namePhoneMatch = remaining.match(/^(.*?)\s*\((.*?)\)$/)
         if (namePhoneMatch) {
           name = namePhoneMatch[1].trim()
           phone = namePhoneMatch[2].trim()
         } else {
           // If no parentheses, treat remaining as phone or name
           if (/^\d+$/.test(remaining)) phone = remaining
           else name = remaining
         }
       } else {
         // Fallback for non-bracketed info
         if (/^\d+$/.test(info)) phone = info
         else name = info
       }
       
       const key = id !== '0000' ? id : (phone || name)
       if (!key) return
 
       const existing = memberMap.get(key)
       const eventDate = event["服务日期"]
       
       // Calculate total amount from both fixed columns and dynamic amounts in notes
       let amount = 0
       const fixedStaffNames = ['FANG', 'SARA', 'DAN', 'ALEXA', 'FEDE']
       fixedStaffNames.forEach(name => {
         amount += (event[`金额_${name}` as keyof CalendarEvent] as number || 0)
       })

       // Parse dynamic amounts from notes [NAME_AMT:100]
       const matches = event["备注"]?.matchAll(/\[([^\]]+)_AMT:(\d+)\]/g)
       if (matches) {
         for (const match of matches) {
           amount += Number(match[2]) || 0
         }
       }
 
       if (existing) {
         existing.totalSpend += amount
         existing.totalVisits += 1
         if (eventDate > existing.lastVisit) {
           existing.lastVisit = eventDate
         }
         // Only update name if current is empty
         if (!existing.name && name) existing.name = name
         if (!existing.phone && phone) existing.phone = phone
         
         // Add to history
         existing.history.push({
           date: eventDate,
           service: event["服务项目"],
           staff: event["备注"]?.match(/技师:([^,]+)/)?.[1] || 'Unknown',
           amount: amount
         })
       } else {
         memberMap.set(key, {
          name: name || '',
          phone: phone || '',
          card: id,
          level: id.startsWith('NO') ? '爽约名单' : '普通会员',
          totalSpend: amount,
          totalVisits: 1,
          lastVisit: eventDate,
          note: '',
          history: [{
            date: eventDate,
            service: event["服务项目"],
            staff: event["备注"]?.match(/技师:([^,]+)/)?.[1] || 'Unknown',
            amount: amount
          }]
        })
       }
     })
     
     return Array.from(memberMap.values())
   }, [allDatabaseEvents])

  const allMembers = useMemo(() => {
    // Only use database members since MOCK_MEMBERS is empty
    return databaseMembers
  }, [databaseMembers])

  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery) return []
    const query = memberSearchQuery.toLowerCase()
    return allMembers.filter(m => 
      (m.name && m.name.toLowerCase().includes(query)) || 
      (m.phone && m.phone.includes(query)) || 
      (m.card && m.card.toLowerCase().includes(query))
    )
  }, [allMembers, memberSearchQuery])

  const handleSelectMember = (member: Member) => {
    setMemberInfo(member.phone || member.name)
    setSelectedMember(member)
    setShowMemberDetail(true)
    setShowServiceSelection(false)
    setShowCheckoutPreview(false)
    setMemberSearchQuery('')
    setIsNewMember(false)
    setMemberId(member.card)
    setMemberName(member.name)
    setMemberNote(member.note || '')
  }

  const handleNewMember = (query: string) => {
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
  }

  const toggleService = (service: string) => {
    setNewTitle(prev => {
      const items = prev.split(',').map(s => s.trim()).filter(Boolean)
      const index = items.indexOf(service)
      if (index > -1) {
        items.splice(index, 1)
        // Remove from itemStaffMap if exists
        setItemStaffMap(prevMap => {
          const newMap = { ...prevMap }
          delete newMap[service]
          return newMap
        })
      } else {
        items.push(service)
        // Scheme A: Immediate binding to the currently selected staff
        if (selectedStaffId && selectedStaffId !== 'NO') {
          setItemStaffMap(prevMap => ({
            ...prevMap,
            [service]: selectedStaffId
          }))
        }
      }
      
      return items.join(', ')
    })
  }

  useEffect(() => {
    if (!newTitle) return;
    
    const items = newTitle.split(',').map(s => s.trim()).filter(Boolean)
    let totalDuration = 0
    
    items.forEach(itemName => {
      for (const cat of serviceCategories) {
        // Find case-insensitive match
        const item = cat.items.find(i => i.name.toLowerCase() === itemName.toLowerCase())
        if (item && item.duration) {
          totalDuration += item.duration
          break
        }
      }
    })
    
    if (totalDuration > 0) {
      setDuration(totalDuration)
      if (selectedDate) {
        setSelectedEndDate(addMinutes(new Date(selectedDate), totalDuration))
      }
    }
  }, [newTitle, selectedDate])

  // Scheme B: Sequential mapping effect
  useEffect(() => {
    // If we have multiple staff selected, or if we want to re-map based on current order
    if (selectedStaffIds.length > 0) {
      const items = newTitle.split(',').map(s => s.trim()).filter(Boolean)
      if (items.length > 0) {
        const newMap: Record<string, string> = { ...itemStaffMap }
        items.forEach((item, index) => {
          // Use the staff at the corresponding index, or fallback to the last one if fewer staff than items
          const targetStaffId = selectedStaffIds[index] || selectedStaffIds[selectedStaffIds.length - 1]
          if (targetStaffId) {
            newMap[item] = targetStaffId
          }
        })
        
        // Only update if it's different to avoid loops
        const isChanged = Object.keys(newMap).length !== Object.keys(itemStaffMap).length || 
                          items.some(it => newMap[it] !== itemStaffMap[it])
        if (isChanged) {
          setItemStaffMap(newMap)
        }
      }
    }
  }, [selectedStaffIds, newTitle])

  const generateMemberId = async (category: 'young' | 'middle' | 'senior' | 'male' | 'noshow') => {
    setMemberId('...') // Loading feedback
    
    const ranges: Record<'young' | 'middle' | 'senior' | 'male' | 'noshow', { min: number; max: number; prefix?: string }> = {
      young: { min: 1, max: 3000 },
      middle: { min: 3001, max: 6000 },
      senior: { min: 6001, max: 9000 },
      male: { min: 9001, max: 9999 },
      noshow: { prefix: 'NO ', min: 1, max: 999 }
    }
    
    const config = ranges[category]
    
    try {
      // 1. Fetch all member info strings from the database to find existing IDs
      const { data, error } = await supabase
        .from('fx_events')
        .select('会员信息')
        .not('会员信息', 'is', null)
      
      if (error) throw error

      // 2. Extract unique numeric IDs
      const existingIds = new Set<number>()
      const existingNoShowIds = new Set<number>()
      
      data.forEach((item: any) => {
        const info = item['会员信息']
        if (!info) return
        
        // Check for regular ID: (1234)
        const match = info.match(/\((\d+)\)/)
        if (match) {
          existingIds.add(parseInt(match[1]))
        }
        
        // Check for NoShow ID: (NO 123)
        const noShowMatch = info.match(/\(NO (\d+)\)/)
        if (noShowMatch) {
          existingNoShowIds.add(parseInt(noShowMatch[1]))
        }
      })

      // 3. Find the max ID in the target range and increment
      const targetSet = category === 'noshow' ? existingNoShowIds : existingIds
      const idsInRange = Array.from(targetSet).filter(id => id >= config.min && id <= config.max)
      
      let nextId = config.min
      if (idsInRange.length > 0) {
        nextId = Math.max(...idsInRange) + 1
      }
      
      // Safety check to not exceed range max
      if (nextId > config.max) {
        // Find first gap if max reached
        for (let i = config.min; i <= config.max; i++) {
          if (!targetSet.has(i)) {
            nextId = i
            break
          }
        }
      }
      
      const formattedId = category === 'noshow' 
        ? `NO ${nextId}` 
        : nextId.toString().padStart(4, '0')
        
      setMemberId(formattedId)
      setSelectedMember(prev => (prev ? { ...prev, card: formattedId } : prev))
    } catch (err) {
      console.error('Error generating member ID:', err)
      // Fallback
      const randomId = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min
      const formattedId = category === 'noshow' 
        ? `NO ${randomId}` 
        : randomId.toString().padStart(4, '0')
      setMemberId(formattedId)
    }
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

  const locale = lang === 'zh' ? zhCN : itLocale
  // Header label formatting is inlined where needed based on lang

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
          <div className="flex items-center gap-2">
            <button onClick={handlePrev} className="p-2 rounded-full border border-white/20 bg-transparent hover:border-white/30 text-zinc-400/80 transition-all">
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <div className="flex bg-transparent rounded-full p-1 border border-white/20">
              {(['day','week','month','year'] as ViewType[]).map(v => (
                <button
                  key={v}
                  onClick={() => setViewType(v)}
                  className={cn(
                    "px-3 md:px-4 py-1 text-xs md:text-sm font-bold rounded-full transition-all bg-transparent",
                    viewType === v ? "border border-white/30 text-white" : "text-zinc-400 hover:text-white"
                  )}
                  style={{ fontFamily: 'var(--font-noto-sans-sc)' }}
                >
                  {VIEW_LABELS[v]}
                </button>
              ))}
            </div>
            <button onClick={handleNext} className="p-2 rounded-full border border-white/20 bg-transparent hover:border-white/30 text-zinc-400/80 transition-all">
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
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
                <div className="flex items-center gap-4 pl-[24px] md:pl-[40px] py-2">
                  <span 
                    onClick={() => setIsHeaderVisible(!isHeaderVisible)}
                    className="text-base md:text-xl lg:text-2xl font-black tracking-[0.28em] cursor-pointer transition-all select-none drop-shadow-[0_0_16px_rgba(255,255,255,0.35)]"
                    title={isHeaderVisible ? "点击隐藏顶部栏" : "点击显示顶部栏"}
                  >
                    {[...format(currentDate, I18N[lang].dayHeaderFormat, { locale })].map((ch, i) => (
                      /\d/.test(ch)
                        ? <span
                            key={i}
                            className="bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-shine"
                            style={{ fontFamily: 'var(--font-orbitron)' }}
                          >
                            {ch}
                          </span>
                        : <span
                            key={i}
                            className="bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-shine"
                            style={{ fontFamily: 'var(--font-noto-sans-sc)' }}
                          >
                            {ch}
                          </span>
                    ))}
                  </span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-white/20 to-transparent" />
                </div>
              )}
              
              <div className="flex w-full">
                <div className="w-20 md:w-28 flex flex-col items-center pt-4 pb-2 bg-transparent shrink-0">
                  {viewType === 'day' && (
                    <button
                      type="button"
                      onClick={() => setCurrentDate(new Date())}
                      className={cn(
                        "w-9 h-9 md:w-11 md:h-11 rounded-full border flex items-center justify-center transition-all active:scale-95",
                        isSameDay(currentDate, today || new Date(2024, 0, 1))
                          ? "bg-gradient-to-br from-white/20 to-white/5 border-white/10 shadow-lg"
                          : "bg-transparent border-white/15 hover:border-white/30"
                      )}
                      title={lang === 'zh' ? '回到今天' : 'Torna a oggi'}
                    >
                      <span
                        className={cn(
                          "text-[10px] md:text-xs font-black text-white tracking-tighter",
                          lang === 'it' && "text-[9px] md:text-[10px] tracking-tight"
                        )}
                        style={{ fontFamily: 'var(--font-zcool-kuaile)' }}
                      >
                        {lang === 'zh' ? '今' : 'OGGI'}
                      </span>
                    </button>
                  )}
                </div>
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
                          isSameDay(day, today || new Date(2024, 0, 1)) ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]" : "hover:bg-white/5"
                        )}>
                          <div className={cn(
                            "text-[10px] md:text-xs font-bold uppercase tracking-widest mb-0.5",
                            isSameDay(day, today || new Date(2024, 0, 1)) ? "text-zinc-900/70" : "text-white"
                          )}>
                            {format(day, 'EEE', { locale: zhCN })}
                          </div>
                          <div className={cn(
                            "text-lg md:text-xl font-black",
                            isSameDay(day, today || new Date(2024, 0, 1)) ? "text-zinc-900" : "text-white"
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
                  {viewType === 'day' ? activeStaff.map((staff) => {
                    const filteredEvents = events.filter(e => {
                      const isCurrentDay = isSameDay(getEventStartTime(e), currentDate)
                      if (!isCurrentDay) return false
                      const assignedStaffId = eventAssignments.get(e.id)
                      return assignedStaffId === staff.id
                    })

                    return (
                      <div key={staff.id} className="relative border-l border-white/5 first:border-l-0">
                        {TIME_SLOTS.map((time) => {
                          const [hour, minute] = time.split(':').map(Number)
                          const slotStart = setMinutes(setHours(currentDate, hour), minute)
                          
                          return (
                            <div 
                              key={time} 
                              onClick={() => {
                                setSelectedDate(slotStart)
                                setSelectedEndDate(addMinutes(slotStart, duration))
                                setClickedStaffId(staff.id)
                                setIsModalOpen(true)
                                setShowServiceSelection(true)
                              }}
                              className="h-[4rem] group/slot relative cursor-pointer"
                            >
                              <div className="absolute inset-0 bg-white/0 group-hover/slot:bg-white/10 transition-colors" />
                            </div>
                          )
                        })}

                        {filteredEvents.map(event => {
                          const start = getEventStartTime(event)
                          const end = getEventEndTime(event)
                          const totalStartMinutes = (start.getHours() - 8) * 60 + start.getMinutes()
                          const durationInMinutes = (end.getTime() - start.getTime()) / 60000
                          
                          const top = (totalStartMinutes / 60) * 4
                          const height = (durationInMinutes / 60) * 4
                          
                          const staffIdMatch = event["备注"]?.match(/技师:([^,]+)/)
                          const staffId = staffIdMatch ? staffIdMatch[1] : null
                          const staffFromEvent = staffMembers.find(s => s.id === staffId)
                          
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
                              {staffFromEvent && (
                                <div className="mt-auto text-[9px] font-black opacity-80">{staffFromEvent.name}</div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  }) : days.map((day) => {
                    const filteredEvents = events.filter(e => isSameDay(getEventStartTime(e), day))

                    return (
                      <div key={day.toString()} className="relative border-none">
                        {TIME_SLOTS.map((time) => {
                          const [hour, minute] = time.split(':').map(Number)
                          const slotStart = setMinutes(setHours(day, hour), minute)
                          
                          return (
                            <div 
                              key={time} 
                              onClick={() => {
                                setSelectedDate(slotStart)
                                setSelectedEndDate(addMinutes(slotStart, duration))
                                setClickedStaffId('')
                                setIsModalOpen(true)
                                setShowServiceSelection(true)
                              }}
                              className="h-[4rem] group/slot relative cursor-pointer"
                            >
                              <div className="absolute inset-0 bg-white/0 group-hover/slot:bg-white/10 transition-colors" />
                            </div>
                          )
                        })}

                        {filteredEvents.map(event => {
                          const start = getEventStartTime(event)
                          const end = getEventEndTime(event)
                          const totalStartMinutes = (start.getHours() - 8) * 60 + start.getMinutes()
                          const durationInMinutes = (end.getTime() - start.getTime()) / 60000
                          
                          const top = (totalStartMinutes / 60) * 4
                          const height = (durationInMinutes / 60) * 4
                          
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
                  {I18N[lang].weekdays.map((day) => (
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
              {days.map((day) => {
                const isCurrentMonth = viewType === 'month' ? isSameMonth(day, monthStart) : true
                const isToday = isSameDay(day, today || new Date(2024, 0, 1))
                
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={closeModal}
        >
          <div 
            className="w-full max-w-2xl bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Left Column - Core Info */}
                <div className="p-6 space-y-4">
                  {/* Title Section - Centered */}
                  <div className="flex flex-col items-center justify-center mb-6 space-y-1.5">
                    <h2 className="text-xl font-black italic tracking-[0.4em] text-white">FX ESTETICA</h2>
                  </div>

                  {/* Row 2: Service & Member */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        服务内容
                      </label>
                      <div className="relative group w-full bg-white/5 border-none rounded-xl focus-within:ring-2 focus-within:ring-white/10 transition-all shadow-inner overflow-hidden">
                        <input 
                          autoFocus
                          type="text"
                          placeholder="输入服务项目..."
                          className="w-full bg-transparent border-none px-3 py-2.5 text-transparent caret-white focus:outline-none text-xs placeholder:text-zinc-700 relative z-10"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onFocus={() => {
                            setShowServiceSelection(true)
                            setShowMemberDetail(false)
                            setShowCheckoutPreview(false)
                          }}
                          required
                        />
                        {/* Colored Content Display - Directly inside the box */}
                        <div className="absolute inset-0 flex items-center px-3 pointer-events-none z-0 overflow-hidden">
                          {newTitle ? (
                            <div className="flex items-center text-xs font-bold whitespace-pre">
                              {newTitle.split(/(\s*,\s*)/).map((part, idx) => {
                                const trimmed = part.trim()
                                const isSeparator = part.includes(',')
                                
                                if (isSeparator || !trimmed) {
                                  return <span key={idx} className="text-zinc-500">{part}</span>
                                }

                                const staffId = itemStaffMap[trimmed]
                                const colorClass = getStaffColorClass(staffId).replace('-500', '-400')
                                
                                return (
                                  <span key={idx} className={cn("font-black italic uppercase tracking-wider", colorClass)}>
                                    {part}
                                  </span>
                                )
                              })}
                            </div>
                          ) : (
                            <span className="text-zinc-700 text-xs">输入服务项目...</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 relative">
                      <label className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        会员信息
                      </label>
                      <input 
                        type="text"
                        placeholder="姓名/卡号/电话"
                        className="w-full bg-white/5 border-none rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all text-xs placeholder:text-zinc-700 shadow-inner"
                        value={memberInfo}
                        onChange={(e) => {
                          setMemberInfo(e.target.value)
                          setMemberSearchQuery(e.target.value)
                        }}
                        onFocus={() => {
                          setShowServiceSelection(false)
                          if (selectedMember) setShowMemberDetail(true)
                          setShowCheckoutPreview(false)
                        }}
                      />
                      {/* Search Results Dropdown */}
                      {(filteredMembers.length > 0 || memberSearchQuery) && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl z-50 max-h-40 overflow-y-auto overflow-x-hidden">
                          {filteredMembers.map((member) => (
                            <button
                              key={member.card}
                              type="button"
                              onClick={() => handleSelectMember(member)}
                              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors"
                            >
                              <div className="flex flex-col items-start">
                                {member.name && <span className="text-xs font-bold text-white">{member.name}</span>}
                                <span className="text-[10px] text-zinc-500">{member.phone}</span>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-zinc-400">
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
                        {I18N[lang].serviceDate}
                      </label>
                      <input 
                        type="date"
                        className="w-full bg-white/5 border-none rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all text-xs [color-scheme:dark] shadow-inner"
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
                        {I18N[lang].startTime}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select 
                          className="w-full bg-white/5 border-none rounded-xl px-2 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all text-xs [color-scheme:dark] appearance-none cursor-pointer text-center font-bold shadow-inner"
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
                            <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')}{I18N[lang].hourSuffix}</option>
                          ))}
                        </select>
                        <select 
                          className="w-full bg-white/5 border-none rounded-xl px-2 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all text-xs [color-scheme:dark] appearance-none cursor-pointer text-center font-bold shadow-inner"
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
                            <option key={m} value={m}>{m}{I18N[lang].minuteSuffix}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Duration & End Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        {I18N[lang].duration}
                      </label>
                      <select 
                        className="w-full bg-white/5 border-none rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all text-xs [color-scheme:dark] appearance-none cursor-pointer font-bold shadow-inner"
                        value={duration}
                        onChange={(e) => {
                          const newDuration = Number(e.target.value)
                          setDuration(newDuration)
                          if (selectedDate) {
                            setSelectedEndDate(addMinutes(new Date(selectedDate), newDuration))
                          }
                        }}
                      >
                        {(() => {
                          const baseOptions = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300];
                          const options = [...baseOptions];
                          if (duration && !options.includes(duration)) {
                            options.push(duration);
                          }
                          return options.sort((a, b) => a - b).map(m => (
                            <option key={m} value={m}>{m} {I18N[lang].minutesSuffix}</option>
                          ));
                        })()}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        {I18N[lang].endTime}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select 
                          className="w-full bg-white/5 border-none rounded-xl px-2 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all text-xs [color-scheme:dark] appearance-none cursor-pointer text-center font-bold shadow-inner"
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
                            <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')}{I18N[lang].hourSuffix}</option>
                          ))}
                        </select>
                        <select 
                          className="w-full bg-white/5 border-none rounded-xl px-2 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all text-xs [color-scheme:dark] appearance-none cursor-pointer text-center font-bold shadow-inner"
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
                            <option key={m} value={m}>{m}{I18N[lang].minuteSuffix}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Row 5: Staff */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        {I18N[lang].staff}
                      </label>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {staffMembers.map((staff) => {
                        const isInvolved = Object.values(itemStaffMap).includes(staff.id) || selectedStaffIds.includes(staff.id);
                        const isActive = selectedStaffId === staff.id;
                        const orderIndex = selectedStaffIds.indexOf(staff.id);
                        
                        return (
                        <button
                          key={staff.id}
                          type="button"
                          onClick={() => {
                            if (staff.id === 'NO') {
                              setSelectedStaffId('NO')
                              setSelectedStaffIds([])
                              setSelectedColor('bg-zinc-500')
                              return
                            }
                            
                            setSelectedStaffId(staff.id)
                            
                            // Sequential selection logic
                            setSelectedStaffIds(prev => {
                              if (prev.includes(staff.id)) {
                                return prev.filter(id => id !== staff.id)
                              } else {
                                return [...prev, staff.id]
                              }
                            })

                            // Map of specific IDs to the new 20 colors
                            const fixedColorMap: Record<string, string> = {
                              '1': 'bg-rose-500',
                              '2': 'bg-emerald-500',
                              '3': 'bg-purple-500',
                              '4': 'bg-orange-500',
                              '5': 'bg-amber-500',
                              'NO': 'bg-zinc-500'
                            }
                            
                            // Use the staff's custom bgColor if available, otherwise use fixed map or default
                            const color = staff.bgColor?.replace('/10', '') || fixedColorMap[staff.id] || 'bg-sky-400'
                            setSelectedColor(color)
                          }}
                          className={cn(
                            "relative w-full py-2 rounded-xl text-[10px] font-black transition-all tracking-widest uppercase truncate px-1 border-2",
                            isActive 
                              ? `bg-white text-black border-transparent shadow-lg scale-105` 
                              : isInvolved
                                ? `bg-white/10 text-white ${staff.color || 'border-white/40'}`
                                : "bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 border-transparent"
                          )}
                        >
                          {staff.name}
                          
                          {/* Order Indicator (Sequence Number) */}
                          {orderIndex > -1 && (
                            <div className={cn(
                              "absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shadow-lg border border-white/20",
                              getStaffColorClass(staff.id, 'bg').replace('/5', '')
                            )}>
                              {orderIndex + 1}
                            </div>
                          )}
                        </button>
                      )})}
                      {/* Management "Box" Button */}
                      <button 
                        type="button"
                        onClick={() => setIsStaffManagerOpen(true)}
                        className="w-full py-2 rounded-xl text-[10px] font-black transition-all bg-white/5 text-zinc-600 hover:text-white hover:bg-white/10 flex items-center justify-center border border-dashed border-white/10"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column - Member Detail or Service Selection or Checkout Preview */}
                <div className="p-6 space-y-4 bg-transparent min-h-[400px]">
                  {showCheckoutPreview ? (
                    <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                      {/* Receipt Header */}
                      <div className="flex flex-col items-center justify-center space-y-2 py-4 border-b border-white/5">
                        <h2 className="text-xl font-black italic tracking-[0.4em] text-white">BILLING</h2>
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">结账清单</div>
                      </div>

                      {/* Items & Staff Amounts */}
                      <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-1">
                        {/* Service Title */}
                        <div className="space-y-2 group">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">项目</span>
                          </div>
                          
                          {/* Item Price Breakdown with Staff Colors */}
                          <div className="flex flex-col gap-1 pl-2 border-l border-white/5">
                            {newTitle.split(',').map(s => s.trim()).filter(Boolean).map((itemName, idx) => {
                              const itemData = serviceCategories.flatMap(c => c.items).find(i => i.name === itemName);
                              if (!itemData) return null;
                              
                              const staffId = itemStaffMap[itemName];
                              const colorClass = getStaffColorClass(staffId).replace('-500', '-400')

                              return (
                                <div key={idx} className="flex items-center justify-between">
                                  <span className={cn("text-xs font-black italic uppercase", colorClass)}>{itemName}</span>
                                  <span className="text-[10px] font-black text-zinc-500 italic">€{itemData.price}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="h-[1px] bg-white/5 w-full" />

                        {/* Staff Breakdown */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">服务人员</div>
                          </div>
                          
                          {staffMembers
                            .filter(s => s.id !== 'NO' && (s.id === selectedStaffId || staffAmounts[s.name] !== undefined))
                            .map((staff) => (
                              <div key={staff.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3 shadow-inner group hover:bg-white/10 transition-all">
                                <div className="flex items-center gap-3">
                                  <div className={cn("w-2 h-2 rounded-full", staff.color || 'bg-white')} />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-zinc-300">{staff.name}</span>
                                    {staff.id === selectedStaffId && (
                                      <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter">主服务人员</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={staffAmounts[staff.name] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/[^0-9]/g, '');
                                      setStaffAmounts(prev => ({ ...prev, [staff.name]: val }));
                                    }}
                                    placeholder="0"
                                    className="w-16 bg-white/5 border-none rounded-lg py-1 text-center focus:outline-none focus:ring-1 focus:ring-white/10 transition-all text-sm font-black italic text-white placeholder:text-zinc-800"
                                  />
                                  <span className="text-xs font-black text-zinc-500 italic">€</span>
                                </div>
                              </div>
                            ))}
                          {Object.values(staffAmounts).filter(v => v && Number(v) > 0).length === 0 && !selectedStaffId && (
                            <div className="text-center py-4 text-[10px] font-bold text-zinc-600 uppercase italic tracking-widest">
                              未选择服务人员
                            </div>
                          )}

                        </div>
                      </div>
  
                    {/* Total Amount Section */}
                    <div className="pt-6 border-t border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">总金额</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-black text-zinc-400">€</span>
                            <span className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-zinc-500 via-white to-zinc-500 animate-shine bg-[length:200%_auto]">
                              {Object.values(staffAmounts).reduce((sum, val) => sum + (Number(val) || 0), 0) || calculateTotalPrice()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : showMemberDetail && selectedMember ? (
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
                                setSelectedMember(prev => (prev ? { ...prev, name: e.target.value } : prev))
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
                        <div className="bg-white/5 rounded-xl p-3 space-y-1 shadow-inner">
                          <div className="text-xs font-black text-white">{selectedMember.totalVisits} 次</div>
                          <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">总消费次数</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 space-y-1 shadow-inner">
                          <div className="text-xs font-black text-white">
                            {isNewMember ? '0' : today ? Math.floor((today.getTime() - new Date(selectedMember.lastVisit).getTime()) / (1000 * 60 * 60 * 24)) : '...'} 天
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
                            {([
                              { id: 'young', label: '青', name: '年轻人', color: 'bg-blue-500' },
                              { id: 'middle', label: '绿', name: '中年人', color: 'bg-emerald-500' },
                              { id: 'senior', label: '橙', name: '老年人', color: 'bg-orange-500' },
                              { id: 'male', label: '蓝', name: '男人', color: 'bg-indigo-500' },
                              { id: 'noshow', label: '红', name: '爽约', color: 'bg-rose-500' }
                            ] as const).map((tag) => (
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
                            {selectedMember.history.map((item: MemberHistoryItem, idx: number) => (
                              <div key={idx} className="bg-white/5 rounded-xl p-3 flex items-center justify-between group hover:bg-white/10 transition-all shadow-inner">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-zinc-300">{item.date}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-500">{item.staff}</span>
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
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{I18N[lang].notes}</label>
                        <div className="bg-white/5 rounded-xl p-3 focus-within:ring-1 focus-within:ring-white/10 transition-all shadow-inner">
                          <input 
                            type="text"
                            placeholder={I18N[lang].notesPlaceholder}
                            value={memberNote}
                            onChange={(e) => {
                              setMemberNote(e.target.value)
                              setSelectedMember(prev => (prev ? { ...prev, note: e.target.value } : prev))
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
                      </div>

                      {/* Service Categories - 4 Columns */}
                      <div className="grid grid-cols-4 gap-2">
                        {serviceCategories.map((category) => {
                          const isSelected = newTitle.split(',').map(s => s.trim()).includes(category.title)
                          return (
                          <div key={category.title} className="space-y-2">
                            <div 
                              onClick={() => toggleService(category.title)}
                              className={cn(
                                "aspect-[1.8/1] rounded-xl bg-gradient-to-br border-none flex flex-col items-center justify-center p-1.5 group cursor-pointer transition-all shadow-inner relative overflow-hidden",
                                category.color,
                                isSelected ? "ring-2 ring-white/50 scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "hover:bg-white/10"
                              )}
                            >
                              {isSelected && (
                                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse" />
                              )}
                              <h4 className={cn(
                                "text-[9px] font-black italic tracking-widest uppercase transition-all group-hover:scale-110",
                                isSelected ? "text-white" : "text-white/60"
                              )}>
                                {category.title}
                              </h4>
                              <div className={cn(
                                "mt-1 h-[1px] transition-all",
                                isSelected ? "w-8 bg-white" : "w-4 bg-white/20 group-hover:w-8"
                              )} />
                            </div>
                            
                            {/* Sub Items */}
                            <div className="flex flex-col gap-1">
                              {category.items.map((item) => {
                                const isItemSeleted = newTitle.split(',').map(s => s.trim()).includes(item.name)
                                const itemStaffId = itemStaffMap[item.name]
                                
                                return (
                                <button
                                  key={item.name}
                                  type="button"
                                  onClick={() => toggleService(item.name)}
                                  className={cn(
                                    "w-full py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all active:scale-95 shadow-inner",
                                    isItemSeleted 
                                      ? `${getStaffColorClass(itemStaffId).replace('-500', '-400')} bg-white/20 ring-1 ring-white/30`
                                      : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                                  )}
                                >
                                  {item.name}
                                </button>
                              )})}
                            </div>
                          </div>
                        )})}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20">
                      <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                        <span className="text-white/20 text-xl font-black">?</span>
                      </div>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">{I18N[lang].choosePrompt}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-4 py-6 bg-transparent flex flex-col items-center justify-center">
                <div className="flex flex-row flex-nowrap gap-4 w-full justify-center items-center overflow-x-auto custom-scrollbar">
                  {editingEvent && (
                    <button 
                      type="button" 
                      onClick={handleDeleteEvent}
                      disabled={isSubmitting}
                      className={cn(
                        "px-6 py-3 bg-transparent rounded-xl font-black italic transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm active:scale-95 hover:bg-white/5 whitespace-nowrap",
                        "bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-shine",
                        "drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                      )}
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '删除'}
                    </button>
                  )}

                  {!showCheckoutPreview && !editingEvent && (
                    <>
                      <button 
                        disabled={isSubmitting} 
                        type="button" 
                        onClick={(e) => handleSubmit(e as any, 'sequential')}
                        className={cn(
                          "px-6 py-3 bg-transparent rounded-xl font-black italic transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm active:scale-95 hover:bg-white/5 whitespace-nowrap",
                          "bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-shine",
                          "drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        )}
                      >
                        分段服务
                      </button>
                      <button 
                        disabled={isSubmitting} 
                        type="button" 
                        onClick={(e) => handleSubmit(e as any, 'parallel')}
                        className={cn(
                          "px-6 py-3 bg-transparent rounded-xl font-black italic transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm active:scale-95 hover:bg-white/5 whitespace-nowrap",
                          "bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-shine",
                          "drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        )}
                      >
                        同时服务
                      </button>
                    </>
                  )}

                  <button 
                    disabled={isSubmitting} 
                    type="button" 
                    onClick={() => {
                      if (!showCheckoutPreview) {
                        // Automatically allocate amounts based on item-staff binding
                        const hasAllocated = Object.values(staffAmounts).some(v => v && Number(v) > 0);
                        if (!hasAllocated) {
                          const amounts: Record<string, string> = {};
                          const selectedItems = newTitle.split(',').map(s => s.trim()).filter(Boolean);
                          
                          selectedItems.forEach(itemName => {
                            const staffId = itemStaffMap[itemName] || selectedStaffId;
                            const staff = staffMembers.find(s => s.id === staffId);
                            if (staff && staff.id !== 'NO') {
                              const itemData = serviceCategories.flatMap(c => c.items).find(i => i.name === itemName);
                              if (itemData) {
                                const currentAmount = Number(amounts[staff.name] || 0);
                                amounts[staff.name] = (currentAmount + itemData.price).toString();
                              }
                            }
                          });
                          
                          if (Object.keys(amounts).length > 0) {
                            setStaffAmounts(amounts);
                          } else if (selectedStaffId && selectedStaffId !== 'NO') {
                            // Fallback if no item mapping but staff selected
                            const staff = staffMembers.find(s => s.id === selectedStaffId);
                            if (staff) {
                              const total = calculateTotalPrice();
                              if (total > 0) {
                                setStaffAmounts({ [staff.name]: total.toString() });
                              }
                            }
                          }
                        }
                        setShowCheckoutPreview(true)
                      } else {
                        handleSubmit(new Event('submit') as any, 'parallel')
                      }
                    }}
                    className={cn(
                      "px-6 py-3 bg-transparent rounded-xl font-black italic transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm active:scale-95 hover:bg-white/5 whitespace-nowrap",
                      "bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-shine",
                      "drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                    )}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (showCheckoutPreview ? '确认收款' : '收银结账')}
                  </button>

                  {!showCheckoutPreview && (
                    <button 
                      disabled={isSubmitting} 
                      type="submit" 
                      className={cn(
                        "px-6 py-3 bg-transparent rounded-xl font-black italic transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm active:scale-95 hover:bg-white/5 whitespace-nowrap",
                        "bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-shine",
                        "drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                      )}
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '预约确定'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- Staff Management Modal --- */}
      {isStaffManagerOpen && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setIsStaffManagerOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black italic tracking-widest text-white uppercase">管理服务人员</h3>
              <button onClick={() => setIsStaffManagerOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Add Staff */}
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="新员工姓名..."
                  className="flex-1 bg-white/5 border-none rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-xs"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const name = newStaffName.trim()
                      if (name) {
                        const newId = Date.now().toString()
                        // Default to sky-400 for new staff
                        setStaffMembers([...staffMembers, { 
                          id: newId, 
                          name: name, 
                          role: '技师', 
                          avatar: name.substring(0, 2).toUpperCase(), 
                          color: 'border-sky-400', 
                          bgColor: 'bg-sky-400/10' 
                        }])
                        setNewStaffName('')
                      }
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    const name = newStaffName.trim()
                    if (name) {
                      const newId = Date.now().toString()
                      setStaffMembers([...staffMembers, { 
                        id: newId, 
                        name: name, 
                        role: '技师', 
                        avatar: name.substring(0, 2).toUpperCase(), 
                        color: 'border-sky-400', 
                        bgColor: 'bg-sky-400/10' 
                      }])
                      setNewStaffName('')
                    }
                  }}
                  className="px-4 py-2 bg-white text-black rounded-xl text-xs font-black hover:bg-zinc-200 transition-colors"
                >
                  添加
                </button>
              </div>

              {/* Staff List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {staffMembers.map((staff, index) => (
                  <div 
                    key={staff.id} 
                    draggable={staff.id !== 'NO'}
                    onDragStart={(e) => {
                      if (staff.id === 'NO') return;
                      setDraggedIndex(index);
                      e.dataTransfer.effectAllowed = 'move';
                      // Use a transparent image as drag image to customize
                      const img = new Image();
                      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
                      e.dataTransfer.setDragImage(img, 0, 0);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedIndex === null || draggedIndex === index || staff.id === 'NO') return;
                      
                      const newStaff = [...staffMembers];
                      const draggedStaff = newStaff[draggedIndex];
                      newStaff.splice(draggedIndex, 1);
                      newStaff.splice(index, 0, draggedStaff);
                      setStaffMembers(newStaff);
                      setDraggedIndex(index);
                    }}
                    onDragEnd={() => setDraggedIndex(null)}
                    className={cn(
                      "relative flex items-center justify-between p-3 bg-white/5 rounded-2xl group hover:bg-white/10 transition-all",
                      staff.id !== 'NO' ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                      draggedIndex === index && "opacity-50 scale-95 border-2 border-white/20",
                      staff.hidden && "opacity-40"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Color Picker Ball */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveColorPickerStaffId(activeColorPickerStaffId === staff.id ? null : staff.id);
                        }}
                        className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black text-white transition-all hover:scale-110 shadow-lg shrink-0",
                          staff.bgColor?.replace('/10', '') || 'bg-sky-400'
                        )}
                      >
                        {staff.avatar}
                      </button>
                      
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate">{staff.name}</span>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{staff.role}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Visibility Toggle */}
                      {staff.id !== 'NO' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setStaffMembers(staffMembers.map(s => 
                              s.id === staff.id ? { ...s, hidden: !s.hidden } : s
                            ))
                          }}
                          className={cn(
                            "p-2 transition-colors",
                            staff.hidden ? "text-zinc-600 hover:text-zinc-400" : "text-white/40 hover:text-white"
                          )}
                          title={staff.hidden ? "显示该员工" : "隐藏该员工"}
                        >
                          {staff.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}

                      {/* Delete Button */}
                      {staff.id !== 'NO' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setStaffMembers(staffMembers.filter(s => s.id !== staff.id))
                          }}
                          className="p-2 text-rose-500/30 hover:text-rose-500 transition-colors"
                          title="删除员工"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Color Picker Popup */}
                    {activeColorPickerStaffId === staff.id && (
                      <div className="absolute left-14 top-0 z-[120] w-48 p-3 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="grid grid-cols-5 gap-2">
                          {COLOR_OPTIONS.map((color) => (
                            <button
                              key={color.value}
                              onClick={() => {
                                setStaffMembers(staffMembers.map(s => 
                                  s.id === staff.id 
                                    ? { ...s, bgColor: `${color.value}/10`, color: `border-${color.value.split('-')[1]}-500` } 
                                    : s
                                ))
                                setActiveColorPickerStaffId(null)
                              }}
                              className={cn(
                                "w-6 h-6 rounded-full transition-all hover:scale-125",
                                color.value,
                                staff.bgColor?.includes(color.value) ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900" : ""
                              )}
                              title={color.label}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[9px] text-zinc-500 text-center uppercase tracking-[0.2em]">
              员工信息将自动保存
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
