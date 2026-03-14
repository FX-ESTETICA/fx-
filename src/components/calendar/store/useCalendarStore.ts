import React from 'react'
import { create } from 'zustand'
import { 
  ViewType, 
  CalendarEvent, 
  StaffMember, 
  Member, 
  STAFF_MEMBERS 
} from '@/utils/calendar-constants'
import { GlobalPassport } from '@/modules/core/types/omni-flow'
import { addDays, addWeeks, addMonths, addYears, subDays, subWeeks, subMonths, subYears } from 'date-fns'

interface CalendarState {
  globalPassport: GlobalPassport | null
  passportCache: Record<string, GlobalPassport> // 新增：护照原子化缓存
  setGlobalPassport: (passport: GlobalPassport | null | ((prev: GlobalPassport | null) => GlobalPassport | null)) => void
  updatePassportCache: (id: string, passport: GlobalPassport) => void // 新增：更新缓存方法
  batchUpdatePassportCache: (passports: Record<string, GlobalPassport>) => void // 新增：批量更新缓存
  
  // --- Initialization & Mounting ---
  isMounted: boolean
  isAuthorized: boolean
  isCalendarLocked: boolean
  isVersionOutdated: boolean
  
  // --- View State ---
  currentDate: Date
  viewType: ViewType
  now: Date | null
  today: Date
  
  // --- Data ---
  events: CalendarEvent[]
  allDatabaseEvents: CalendarEvent[]
  loading: boolean
  error: string | null
  staffMembers: StaffMember[]
  resourceLoadFactors: Record<string, number> // 新增：资源负载率 (staffId -> factor)
  aiSchedulingInsights: string[] // 新增：AI 调度洞察
  predictedOccupancy: Record<string, number> // 新增：预测占用率
  
  // --- Modal Visibility ---
  isModalOpen: boolean
  isBookingModalOpen: boolean
  showServiceSelection: boolean
  showMemberDetail: boolean
  showCheckoutPreview: boolean
  isDatePickerOpen: boolean
  isDurationPickerOpen: boolean
  showBookingSuccess: boolean
  showRecycleBin: boolean
  isStaffManagerOpen: boolean
  
  // --- Gesture & Time Selection ---
  gestureRef: React.RefObject<any> | null
  touchStartX: number | null
  touchCurrentX: number | null
  touchStartY: number | null
  touchCurrentY: number | null
  isGesturing: boolean
  showTimeSelection: boolean
  gestureTime: { h: number | null; m: number | null; p: 'AM' | 'PM' }
  timeSelectionType: 'start' | 'end'
  activeHour: number | null

  // --- Selection & Editing ---
  editingEvent: CalendarEvent | null
  selectedMember: Member | null
  selectedDate: Date | null
  selectedEndDate: Date | null
  clickedStaffId: string
  duration: number
  hoverTime: { time: string; top: number; staffId?: string; date?: Date } | null
  
  // --- Form State ---
  newTitle: string
  memberInfo: string
  selectedColor: string
  selectedStaffId: string
  selectedStaffIds: string[]
  isDesignatedMode: boolean
  memberSearchQuery: string
  isNewMember: boolean
  memberId: string
  memberName: string
  memberNote: string

  // --- Billing & Checkout ---
  itemStaffMap: Record<string, string>
  staffAmounts: Record<string, string>
  customItemPrices: Record<string, string>
  editingPriceItemKey: string | null
  showCustomKeypad: boolean
  keypadTargetKey: { key: string; staffId?: string; basePrice?: number; name?: string } | null
  manualTotalAmount: string | null
  
  // --- Actions ---
  setIsMounted: (val: boolean) => void
  setIsAuthorized: (val: boolean) => void
  setIsCalendarLocked: (val: boolean) => void
  setIsVersionOutdated: (val: boolean) => void
  setCurrentDate: (date: Date) => void
  setViewType: (view: ViewType) => void
  setNow: (date: Date | null) => void
  setToday: (date: Date) => void
  setEvents: (events: CalendarEvent[]) => void
  setAllDatabaseEvents: (events: CalendarEvent[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setStaffMembers: (staff: StaffMember[]) => void
  setResourceLoadFactors: (factors: Record<string, number>) => void
  setAiSchedulingInsights: (insights: string[]) => void
  setPredictedOccupancy: (occupancy: Record<string, number>) => void
  
  setIsModalOpen: (val: boolean) => void
  setIsBookingModalOpen: (val: boolean) => void
  setShowServiceSelection: (val: boolean) => void
  setShowMemberDetail: (val: boolean) => void
  setShowCheckoutPreview: (val: boolean) => void
  setIsDatePickerOpen: (val: boolean) => void
  setIsDurationPickerOpen: (val: boolean) => void
  setShowBookingSuccess: (val: boolean) => void
  setShowRecycleBin: (val: boolean) => void
  setIsStaffManagerOpen: (val: boolean) => void
  
  // --- Gesture & Time Selection Actions ---
  setGestureRef: (ref: React.RefObject<any> | null) => void
  setTouchStartX: (val: number | null) => void
  setTouchCurrentX: (val: number | null) => void
  setTouchStartY: (val: number | null) => void
  setTouchCurrentY: (val: number | null) => void
  setIsGesturing: (val: boolean) => void
  setShowTimeSelection: (val: boolean) => void
  setGestureTime: (val: { h: number | null; m: number | null; p: 'AM' | 'PM' } | ((prev: { h: number | null; m: number | null; p: 'AM' | 'PM' }) => { h: number | null; m: number | null; p: 'AM' | 'PM' })) => void
  setTimeSelectionType: (val: 'start' | 'end') => void
  setActiveHour: (val: number | null) => void

  setEditingEvent: (event: CalendarEvent | null) => void
  setSelectedMember: (member: Member | null | ((prev: Member | null) => Member | null)) => void
  setSelectedDate: (date: Date | null) => void
  setSelectedEndDate: (date: Date | null) => void
  setClickedStaffId: (id: string) => void
  setDuration: (duration: number) => void
  setHoverTime: (hoverTime: { time: string; top: number; staffId?: string; date?: Date } | null) => void
  
  // --- Form State Actions ---
  setNewTitle: (title: string | ((prev: string) => string)) => void
  setMemberInfo: (info: string | ((prev: string) => string)) => void
  setSelectedColor: (color: string | ((prev: string) => string)) => void
  setSelectedStaffId: (id: string | ((prev: string) => string)) => void
  setSelectedStaffIds: (ids: string[] | ((prev: string[]) => string[])) => void
  setIsDesignatedMode: (val: boolean | ((prev: boolean) => boolean)) => void
  setMemberSearchQuery: (query: string | ((prev: string) => string)) => void
  setIsNewMember: (val: boolean | ((prev: boolean) => boolean)) => void
  setMemberId: (id: string | ((prev: string) => string)) => void
  setMemberName: (name: string | ((prev: string) => string)) => void
  setMemberNote: (note: string | ((prev: string) => string)) => void

  // --- Billing & Checkout ---
  setItemStaffMap: (map: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  setStaffAmounts: (amounts: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  setCustomItemPrices: (prices: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  setEditingPriceItemKey: (key: string | null | ((prev: string | null) => string | null)) => void
  setShowCustomKeypad: (show: boolean) => void
  setKeypadTargetKey: (target: { key: string; staffId?: string; basePrice?: number; name?: string } | null) => void
  setManualTotalAmount: (amount: string | null | ((prev: string | null) => string | null)) => void

  // --- Data Fetching Actions (Placeholders for now) ---
  fetchEvents: () => Promise<void>
  fetchAllEventsForLibrary: () => Promise<void>
  resetModalState: () => void
  navigate: (direction: 'next' | 'prev') => void
  switchTimeSelection: (type: 'start' | 'end') => void
}

export const useCalendarStore = create<CalendarState>((set) => ({
  // --- Initial States ---
  globalPassport: null,
  passportCache: {},
  setGlobalPassport: (passport) => set((state) => ({ 
    globalPassport: typeof passport === 'function' ? passport(state.globalPassport) : passport 
  })),
  updatePassportCache: (id, passport) => set((state) => ({
    passportCache: { ...state.passportCache, [id]: passport }
  })),
  batchUpdatePassportCache: (passports) => set((state) => ({
    passportCache: { ...state.passportCache, ...passports }
  })),
  
  isMounted: false,
  isAuthorized: true,
  isCalendarLocked: true,
  isVersionOutdated: false,
  
  currentDate: new Date(),
  viewType: 'day',
  now: null,
  today: new Date(),
  
  events: [],
  allDatabaseEvents: [],
  loading: false,
  error: null,
  staffMembers: STAFF_MEMBERS,
  resourceLoadFactors: {},
  aiSchedulingInsights: [],
  predictedOccupancy: {},
  
  isModalOpen: false,
  isBookingModalOpen: false,
  showServiceSelection: true,
  showMemberDetail: false,
  showCheckoutPreview: false,
  isDatePickerOpen: false,
  isDurationPickerOpen: false,
  showBookingSuccess: false,
  showRecycleBin: false,
  isStaffManagerOpen: false,
  
  // --- Initial Gesture & Time Selection States ---
  gestureRef: null,
  touchStartX: null,
  touchCurrentX: null,
  touchStartY: null,
  touchCurrentY: null,
  isGesturing: false,
  showTimeSelection: false,
  gestureTime: { h: null, m: null, p: 'AM' },
  timeSelectionType: 'start',
  activeHour: null,

  editingEvent: null,
  selectedMember: null,
  selectedDate: null,
  selectedEndDate: null,
  clickedStaffId: '',
  duration: 45,
  hoverTime: null,

  // --- Initial Form States ---
  newTitle: '',
  memberInfo: '',
  selectedColor: 'bg-rose-500', 
  selectedStaffId: '',
  selectedStaffIds: [],
  isDesignatedMode: false,
  memberSearchQuery: '',
  isNewMember: false,
  memberId: '',
  memberName: '',
  memberNote: '',

  itemStaffMap: {},
  staffAmounts: {},
  customItemPrices: {},
  editingPriceItemKey: null,
  showCustomKeypad: false,
  keypadTargetKey: null,
  manualTotalAmount: null,

  // --- Actions ---
  setIsMounted: (isMounted) => set({ isMounted }),
  setIsAuthorized: (isAuthorized) => set({ isAuthorized }),
  setIsCalendarLocked: (isCalendarLocked) => set({ isCalendarLocked }),
  setIsVersionOutdated: (isVersionOutdated) => set({ isVersionOutdated }),
  setCurrentDate: (currentDate) => set({ currentDate }),
  setViewType: (viewType) => set({ viewType }),
  setNow: (now) => set({ now }),
  setToday: (today) => set({ today }),
  setEvents: (events) => set({ events }),
  setAllDatabaseEvents: (allDatabaseEvents) => set({ allDatabaseEvents }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setStaffMembers: (staffMembers) => set({ staffMembers }),
  setResourceLoadFactors: (resourceLoadFactors) => set({ resourceLoadFactors }),
  setAiSchedulingInsights: (aiSchedulingInsights) => set({ aiSchedulingInsights }),
  setPredictedOccupancy: (predictedOccupancy) => set({ predictedOccupancy }),
  
  setIsModalOpen: (isModalOpen) => set({ isModalOpen }),
  setIsBookingModalOpen: (isBookingModalOpen) => set({ isBookingModalOpen }),
  setShowServiceSelection: (showServiceSelection) => set({ showServiceSelection }),
  setShowMemberDetail: (showMemberDetail) => set({ showMemberDetail }),
  setShowCheckoutPreview: (showCheckoutPreview) => set({ showCheckoutPreview }),
  setIsDatePickerOpen: (isDatePickerOpen) => set({ isDatePickerOpen }),
  setIsDurationPickerOpen: (isDurationPickerOpen) => set({ isDurationPickerOpen }),
  setShowBookingSuccess: (showBookingSuccess) => set({ showBookingSuccess }),
  setShowRecycleBin: (showRecycleBin) => set({ showRecycleBin }),
  setIsStaffManagerOpen: (isStaffManagerOpen) => set({ isStaffManagerOpen }),
  
  // --- Gesture & Time Selection Actions ---
  setGestureRef: (gestureRef) => set({ gestureRef }),
  setTouchStartX: (touchStartX) => set({ touchStartX }),
  setTouchCurrentX: (touchCurrentX) => set({ touchCurrentX }),
  setTouchStartY: (touchStartY) => set({ touchStartY }),
  setTouchCurrentY: (touchCurrentY) => set({ touchCurrentY }),
  setIsGesturing: (isGesturing) => set({ isGesturing }),
  setShowTimeSelection: (showTimeSelection) => set({ showTimeSelection }),
  setGestureTime: (val) => set((state) => ({ 
    gestureTime: typeof val === 'function' ? val(state.gestureTime) : val 
  })),
  setTimeSelectionType: (timeSelectionType) => set({ timeSelectionType }),
  setActiveHour: (activeHour) => set({ activeHour }),

  setEditingEvent: (editingEvent) => set({ editingEvent }),
  setSelectedMember: (val) => set((state) => ({ 
    selectedMember: typeof val === 'function' ? val(state.selectedMember) : val 
  })),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setSelectedEndDate: (selectedEndDate) => set({ selectedEndDate }),
  setClickedStaffId: (clickedStaffId) => set({ clickedStaffId }),
  setDuration: (duration) => set({ duration }),
  setHoverTime: (hoverTime) => set({ hoverTime }),

  // --- Form State Action Implementation ---
  setNewTitle: (title) => set((state) => ({ 
    newTitle: typeof title === 'function' ? title(state.newTitle) : title 
  })),
  setMemberInfo: (info) => set((state) => ({ 
    memberInfo: typeof info === 'function' ? info(state.memberInfo) : info 
  })),
  setSelectedColor: (color) => set((state) => ({ 
    selectedColor: typeof color === 'function' ? color(state.selectedColor) : color 
  })),
  setSelectedStaffId: (id) => set((state) => ({ 
    selectedStaffId: typeof id === 'function' ? id(state.selectedStaffId) : id 
  })),
  setSelectedStaffIds: (ids) => set((state) => ({ 
    selectedStaffIds: typeof ids === 'function' ? ids(state.selectedStaffIds) : ids 
  })),
  setIsDesignatedMode: (val) => set((state) => ({ 
    isDesignatedMode: typeof val === 'function' ? val(state.isDesignatedMode) : val 
  })),
  setMemberSearchQuery: (query) => set((state) => ({ 
    memberSearchQuery: typeof query === 'function' ? query(state.memberSearchQuery) : query 
  })),
  setIsNewMember: (val) => set((state) => ({ 
    isNewMember: typeof val === 'function' ? val(state.isNewMember) : val 
  })),
  setMemberId: (id) => set((state) => ({ 
    memberId: typeof id === 'function' ? id(state.memberId) : id 
  })),
  setMemberName: (name) => set((state) => ({ 
    memberName: typeof name === 'function' ? name(state.memberName) : name 
  })),
  setMemberNote: (note) => set((state) => ({ 
    memberNote: typeof note === 'function' ? note(state.memberNote) : note 
  })),

  setItemStaffMap: (map) => set((state) => ({ 
    itemStaffMap: typeof map === 'function' ? map(state.itemStaffMap) : map 
  })),
  setStaffAmounts: (amounts) => set((state) => ({ 
    staffAmounts: typeof amounts === 'function' ? amounts(state.staffAmounts) : amounts 
  })),
  setCustomItemPrices: (prices) => set((state) => ({ 
    customItemPrices: typeof prices === 'function' ? prices(state.customItemPrices) : prices 
  })),
  setEditingPriceItemKey: (key) => set((state) => ({ 
    editingPriceItemKey: typeof key === 'function' ? key(state.editingPriceItemKey) : key 
  })),
  setShowCustomKeypad: (showCustomKeypad) => set({ showCustomKeypad }),
  setKeypadTargetKey: (keypadTargetKey) => set({ keypadTargetKey }),
  setManualTotalAmount: (amount) => set((state) => ({ 
    manualTotalAmount: typeof amount === 'function' ? amount(state.manualTotalAmount) : amount 
  })),

  // These will be implemented in useCalendarData
  fetchEvents: async () => {},
  fetchAllEventsForLibrary: async () => {},

  resetModalState: () => set((state) => ({
    isModalOpen: false,
    editingEvent: null,
    newTitle: '',
    memberInfo: '',
    selectedDate: null,
    selectedEndDate: null,
    duration: 60,
    selectedColor: 'bg-sky-400',
    selectedStaffId: '',
    selectedStaffIds: [],
    clickedStaffId: '',
    staffAmounts: {},
    itemStaffMap: {},
    customItemPrices: {},
    showServiceSelection: false,
    showMemberDetail: false,
    memberSearchQuery: '',
    selectedMember: null,
    isNewMember: false,
    memberId: '0000',
    memberName: '',
    memberNote: '',
    showCheckoutPreview: false,
    showTimeSelection: false,
    isDurationPickerOpen: false,
    // Note: isSubmitting is usually managed by the submission hook
  })),

  navigate: (direction) => set((state) => {
    const { viewType, currentDate } = state
    let newDate = currentDate
    if (direction === 'next') {
      if (viewType === 'day') newDate = addDays(currentDate, 1)
      else if (viewType === 'week') newDate = addWeeks(currentDate, 1)
      else if (viewType === 'year') newDate = addYears(currentDate, 1)
      else newDate = addMonths(currentDate, 1)
    } else {
      if (viewType === 'day') newDate = subDays(currentDate, 1)
      else if (viewType === 'week') newDate = subWeeks(currentDate, 1)
      else if (viewType === 'year') newDate = subYears(currentDate, 1)
      else newDate = subMonths(currentDate, 1)
    }
    return { currentDate: newDate }
  }),

  switchTimeSelection: (type) => set({
    showTimeSelection: true,
    timeSelectionType: type,
    showServiceSelection: false,
    showMemberDetail: false,
    showCheckoutPreview: false,
  }),
}))
