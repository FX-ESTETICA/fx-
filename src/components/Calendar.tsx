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
  setHours,
  setMinutes,
  addMinutes
} from 'date-fns'
import { zhCN, it as itLocale } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, ChevronDown, X, Loader2, Calendar as CalendarIcon, Settings2, GripVertical, Eye, EyeOff, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'

import { 
  ViewType, 
  CalendarEvent, 
  StaffMember, 
  Member, 
  MemberHistoryItem,
  COLOR_OPTIONS, 
  STAFF_MEMBERS, 
  FIXED_COLOR_MAP,
  FIXED_STAFF_NAMES,
  COLOR_TO_STAFF_ID,
  getCleanColorName,
  getStaffColorClass,
  SERVICE_CATEGORIES, 
  I18N 
} from '@/utils/calendar-constants'
import { 
  getEventStartTime, 
  getEventEndTime, 
  getCalendarDays, 
  generateTimeSlots,
  calculateTotalPrice 
} from '@/utils/calendar-helpers'

// --- Weather Component ---
function WeatherDisplay() {
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null)

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=44.35&longitude=9.23&current=temperature_2m,weather_code&timezone=Europe%2FRome')
        const data = await res.json()
        if (data.current) {
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            code: data.current.weather_code
          })
        }
      } catch (e) {
        console.error('Failed to fetch weather', e)
      }
    }
    fetchWeather()
    const interval = setInterval(fetchWeather, 30 * 60 * 1000) // update every 30 mins
    return () => clearInterval(interval)
  }, [])

  if (!weather) return null

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />
    if (code >= 1 && code <= 3) return <Cloud className="w-4 h-4 md:w-5 md:h-5 text-zinc-300" />
    if (code === 45 || code === 48) return <Cloud className="w-4 h-4 md:w-5 md:h-5 text-zinc-400" />
    if (code >= 51 && code <= 55) return <CloudDrizzle className="w-4 h-4 md:w-5 md:h-5 text-sky-400" />
    if (code >= 61 && code <= 65) return <CloudRain className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
    if (code >= 71 && code <= 75) return <CloudSnow className="w-4 h-4 md:w-5 md:h-5 text-white" />
    if (code >= 80 && code <= 82) return <CloudRain className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
    if (code >= 95) return <CloudLightning className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
    return <Cloud className="w-4 h-4 md:w-5 md:h-5 text-zinc-300" />
  }

  return (
    <div className="flex items-center gap-1.5 md:gap-2 px-1 group transition-all">
      <div className="scale-90 md:scale-100 opacity-80">
        {getWeatherIcon(weather.code)}
      </div>
      <span className="text-[10px] md:text-xs font-black italic text-white group-hover:text-white transition-colors" style={{ fontFamily: 'var(--font-orbitron)' }}>
        {weather.temp}°C
      </span>
    </div>
  )
}

// --- Staff Timer Component ---
/**
 * Component to render idle time labels in the background gaps between appointments.
 */
function IdleGapLabels({ staffId, events, eventAssignments, currentDate }: { 
  staffId: string, 
  events: CalendarEvent[], 
  eventAssignments: Map<string, string>,
  currentDate: Date
}) {
  const gaps = useMemo(() => {
    // 1. Get and sort today's events for this staff
    const staffEvents = events
      .filter(e => isSameDay(getEventStartTime(e), currentDate) && eventAssignments.get(e.id) === staffId)
      .sort((a, b) => getEventStartTime(a).getTime() - getEventStartTime(b).getTime());

    const result: { top: number, height: number, minutes: number }[] = [];
    const workStart = new Date(currentDate);
    workStart.setHours(8, 0, 0, 0);
    const workEnd = new Date(currentDate);
    workEnd.setHours(20, 0, 0, 0);

    let lastEnd = workStart;

    // Helper to add gap to result
    const addGap = (start: Date, end: Date) => {
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);
      if (duration >= 15) { // Only show for gaps >= 15 mins
        const topMinutes = (start.getHours() - 8) * 60 + start.getMinutes();
        result.push({
          top: (topMinutes / 60) * 4,
          height: (duration / 60) * 4,
          minutes: duration
        });
      }
    };

    // 2. Gap before first event
    if (staffEvents.length > 0) {
      const firstStart = getEventStartTime(staffEvents[0]);
      if (firstStart > workStart) {
        addGap(workStart, firstStart);
      }

      // 3. Gaps between events
      for (let i = 0; i < staffEvents.length - 1; i++) {
        const currentEnd = getEventEndTime(staffEvents[i]);
        const nextStart = getEventStartTime(staffEvents[i+1]);
        if (nextStart > currentEnd) {
          addGap(currentEnd, nextStart);
        }
      }

      // 4. Gap after last event
      const lastEventEnd = getEventEndTime(staffEvents[staffEvents.length - 1]);
      if (lastEventEnd < workEnd) {
        addGap(lastEventEnd, workEnd);
      }
    } else {
      // 5. No events at all - full day is a gap
      addGap(workStart, workEnd);
    }

    return result;
  }, [staffId, events, eventAssignments, currentDate]);

  return (
    <>
      {gaps.map((gap, i) => (
        <div 
          key={`gap-${i}`}
          className="absolute left-0 right-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-30 select-none"
          style={{ 
            top: `${gap.top}rem`, 
            height: `${gap.height}rem`,
            zIndex: 0
          }}
        >
          <div className="flex flex-col items-center justify-center scale-75 md:scale-90 opacity-40">
            <span className="text-[8px] font-black tracking-tighter text-emerald-400/60 uppercase">IDLE</span>
            <span className="text-[10px] md:text-xs font-black italic text-emerald-400/80 tabular-nums" style={{ fontFamily: 'var(--font-orbitron)' }}>
              {Math.floor(gap.minutes)} MIN
            </span>
          </div>
        </div>
      ))}
    </>
  );
}

// --- Gap Badge Component ---
function GapBadge({ staffId, events, eventAssignments, currentDate, now }: { 
  staffId: string; 
  events: CalendarEvent[]; 
  eventAssignments: Map<string, string>;
  currentDate: Date;
  now: Date;
}) {
  const gaps = useMemo(() => {
    const staffEvents = events
      .filter(e => eventAssignments.get(e.id) === staffId && isSameDay(getEventStartTime(e), currentDate))
      .sort((a, b) => getEventStartTime(a).getTime() - getEventStartTime(b).getTime());

    const result: { top: number; height: number; minutes: number; startTime: Date }[] = [];
    
    for (let i = 0; i < staffEvents.length - 1; i++) {
      const currentEnd = getEventEndTime(staffEvents[i]);
      const nextStart = getEventStartTime(staffEvents[i+1]);
      
      const diffMs = nextStart.getTime() - currentEnd.getTime();
      if (diffMs >= 5 * 60 * 1000) { // Only show if gap is at least 5 mins
        const minutes = Math.floor(diffMs / (1000 * 60));
        const top = ((currentEnd.getHours() - 8) * 60 + currentEnd.getMinutes()) * (4 / 60);
        const height = minutes * (4 / 60);
        result.push({ top, height, minutes, startTime: currentEnd });
      }
    }
    return result;
  }, [events, eventAssignments, staffId, currentDate]);

  return (
    <>
      {gaps.map((gap, i) => {
        // Hide badge if Now Line has reached or passed the start of the gap
        const hasReached = isSameDay(currentDate, now) && now.getTime() >= gap.startTime.getTime();
        if (hasReached) return null;

        return (
          <div 
            key={`gap-${i}`}
            className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-0"
            style={{ 
              top: `${gap.top}rem`, 
              height: `${gap.height}rem`,
              paddingTop: gap.minutes <= 15 ? '2px' : '4px',
              paddingBottom: gap.minutes <= 15 ? '2px' : '4px'
            }}
          >
            <div className={cn(
              "flex items-center justify-center bg-black/40 border border-emerald-500/30 rounded-lg backdrop-blur-sm shadow-lg w-[85%] h-full",
              gap.minutes <= 15 ? "px-1" : "px-3"
            )}>
              <span className={cn(
                "font-black italic text-emerald-400 tabular-nums leading-none",
                gap.minutes <= 15 ? "text-[11px]" : "text-[13px]"
              )} style={{ fontFamily: 'var(--font-orbitron)' }}>
                {gap.minutes} MIN
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}

function StaffTimer({ staffId, events, eventAssignments, now, currentDate }: { 
  staffId: string; 
  events: CalendarEvent[]; 
  eventAssignments: Map<string, string>; 
  now: Date; 
  currentDate: Date;
}) {
  const timerData = useMemo(() => {
    // Only show timer if looking at today
    if (!isSameDay(currentDate, now)) return null;

    // 1. Define Work Hours (8:00 - 20:00)
    const workStart = new Date(now);
    workStart.setHours(8, 0, 0, 0);
    const workEnd = new Date(now);
    workEnd.setHours(20, 0, 0, 0);

    // 2. Filter and sort events for this staff today
    const staffEvents = events
      .filter(e => eventAssignments.get(e.id) === staffId && isSameDay(getEventStartTime(e), now))
      .sort((a, b) => getEventStartTime(a).getTime() - getEventStartTime(b).getTime());

    // 3. Find current state
    const activeEvent = staffEvents.find(e => {
      const start = getEventStartTime(e);
      const end = getEventEndTime(e);
      return now >= start && now < end;
    });

    if (activeEvent) {
      return {
        label: 'BUSY',
        endTime: getEventEndTime(activeEvent),
        color: 'text-rose-400',
        borderColor: 'border-rose-500/30',
        shadowColor: 'rgba(244,63,94,0.2)',
        isCountdown: true
      };
    }

    // 4. Find next event or end of work
    const nextEvent = staffEvents.find(e => getEventStartTime(e) > now);
    
    if (nextEvent) {
      const gapEnd = getEventStartTime(nextEvent);
      
      return {
        label: 'IDLE',
        endTime: gapEnd, 
        color: 'text-emerald-400',
        borderColor: 'border-emerald-500/30',
        shadowColor: 'rgba(52,211,153,0.2)',
        isCountdown: true 
      };
    }

    // 5. If no more events, count down to work end if before 20:00
    if (now < workEnd) {
      return {
        label: 'FREE',
        endTime: workEnd,
        color: 'text-sky-400',
        borderColor: 'border-sky-500/30',
        shadowColor: 'rgba(56,189,248,0.2)',
        isCountdown: true
      };
    }

    return null;
  }, [events, eventAssignments, staffId, now, currentDate]);

  const timeStr = useMemo(() => {
    if (!timerData) return '--:--';
    if (!timerData.endTime) return '--:--';

    const diff = timerData.endTime.getTime() - now.getTime();
    if (diff <= 0) return '0 MIN';

    const totalMinutes = Math.floor(diff / (1000 * 60));
    return `${totalMinutes} MIN`;
  }, [timerData, now]);

  if (!timerData) return (
    <div className="h-5 flex items-center justify-center">
      <div className="w-10 h-[2px] bg-white/10 rounded-full" />
    </div>
  );

  return (
    <div className={cn(
      "absolute left-0 right-0 z-[999] flex flex-col items-center justify-center pointer-events-none transition-all duration-500",
      timerData.label === 'BUSY' ? "animate-pulse" : ""
    )} style={{ 
      top: `${((now.getHours() - 8) * 60 + now.getMinutes()) * (4 / 60)}rem`,
      transform: 'translateY(-50%)'
    }}>
      <div className={cn(
        "flex flex-col items-center justify-center px-2 py-0.5 rounded-md bg-black border backdrop-blur-md shadow-2xl scale-90 md:scale-100",
        timerData.borderColor,
        `shadow-[0_0_25px_${timerData.shadowColor}]`
      )}>
        <div className="flex items-center gap-1">
          <span className={cn("text-[8px] font-black tracking-tighter uppercase opacity-70", timerData.color)}>
            {timerData.label}
          </span>
          <span className={cn("text-[11px] md:text-xs font-black italic tabular-nums leading-none", timerData.color)} style={{ fontFamily: 'var(--font-orbitron)' }}>
            {timeStr}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Types ---
// Moved to @/utils/calendar-constants

interface CalendarProps {
  initialDate?: Date;
  initialView?: ViewType;
  onToggleSidebar?: () => void;
  bgIndex?: number;
  lang?: 'zh' | 'it';
}

  // --- Helpers ---
  // Moved to @/utils/calendar-helpers

  // --- Helpers ---
// Helper to get time in Italy (Europe/Rome)
const getItalyTime = () => {
  const now = new Date();
  // Use Intl.DateTimeFormat to get the date/time in specific timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const dateMap: Record<string, number> = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateMap[part.type] = parseInt(part.value, 10);
    }
  });
  return new Date(dateMap.year, dateMap.month - 1, dateMap.day, dateMap.hour, dateMap.minute, dateMap.second);
};

export default function Calendar({ initialDate, initialView = 'day', onToggleSidebar, bgIndex = 0, lang = 'zh' }: CalendarProps) {
  const supabase = createClient()
  
  // Use a stable initial date for SSR to avoid hydration mismatch
  const [currentDate, setCurrentDate] = useState<Date>(initialDate || getItalyTime())
  const [isMounted, setIsMounted] = useState(false)
  const [viewType, setViewType] = useState<ViewType>(initialView)

  // Combined effect for initialization and prop updates
  useEffect(() => {
    setIsMounted(true)
    if (initialDate) setCurrentDate(initialDate)
    if (initialView) setViewType(initialView)
  }, [initialDate, initialView])

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [allDatabaseEvents, setAllDatabaseEvents] = useState<CalendarEvent[]>([])
  const today = useMemo(() => getItalyTime(), [])
  const [now, setNow] = useState<Date>(getItalyTime())

  useEffect(() => {
    if (!isMounted) return
    const timer = setInterval(() => setNow(getItalyTime()), 1000)
    return () => clearInterval(timer)
  }, [isMounted])

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
  const [showTimeSelection, setShowTimeSelection] = useState(false)
  const [timeSelectionType, setTimeSelectionType] = useState<'start' | 'end'>('start')
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isDurationPickerOpen, setIsDurationPickerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(STAFF_MEMBERS)
  const [isStaffManagerOpen, setIsStaffManagerOpen] = useState(false)
  const [newStaffName, setNewStaffName] = useState('')
  const [activeColorPickerStaffId, setActiveColorPickerStaffId] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  
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
  
  // Calculate total price based on selected items in newTitle
  const totalPrice = useMemo(() => calculateTotalPrice(newTitle, SERVICE_CATEGORIES), [newTitle]);

  const [staffAmounts, setStaffAmounts] = useState<Record<string, string>>(() => ({}))
  const [itemStaffMap, setItemStaffMap] = useState<Record<string, string>>({})
  const [customItemPrices, setCustomItemPrices] = useState<Record<string, string>>({}) // Track custom prices for checkout preview

  // Merged events for checkout (same member, same day)
  const mergedEvents = useMemo(() => {
    if (!selectedDate || !memberId) return [];
    
    // Get all events from the database for this member on this day
    const otherEvents = events.filter(e => {
      // Exclude the current editing event if it's already in the list to avoid duplication
      if (editingEvent && e.id === editingEvent.id) return false;
      
      const eDate = getEventStartTime(e);
      // Check if same day and same member ID
      const eventMemberInfo = e["会员信息"] || '';
      // Extract ID from (ID)Name format
      const idMatch = eventMemberInfo.match(/^\(([^)]+)\)(.*)$/);
      const eventMemberId = idMatch ? idMatch[1] : undefined;
      const eventMemberName = idMatch ? idMatch[2].trim() : eventMemberInfo.trim();
      
      let isSameMember = eventMemberId === memberId;
      
      // If it's a walk-in (0000), also ensure the names match exactly
      // This prevents different walk-ins (e.g., "散客 1" and "散客 2") from being merged
      if (isSameMember && memberId === '0000') {
        const currentName = memberInfo.trim();
        // If the current name is empty, it's a generic walk-in and shouldn't merge with others
        if (currentName === '') {
          isSameMember = false;
        } else {
          isSameMember = eventMemberName === currentName;
        }
      }
      
      return isSameMember && isSameDay(eDate, selectedDate);
    });

    // Combine with current form state as a pseudo-event
    const currentEventState = {
      id: editingEvent?.id || 'new',
      "服务项目": newTitle,
      "背景颜色": selectedColor,
      "备注": [
        ...Object.entries(itemStaffMap).map(([item, sId]) => `[${item}_STAFF:${sId}]`),
        selectedStaffIds.length > 0 ? `[STAFF_SEQ:${selectedStaffIds.join(',')}]` : ''
      ].filter(Boolean).join(' '),
      "会员信息": memberInfo + (memberId ? ` #${memberId}` : ''),
      "起始时间": selectedDate.toISOString(),
    };

    return [...otherEvents, currentEventState].filter(e => e["服务项目"] && e["服务项目"].trim() !== '');
  }, [showCheckoutPreview, selectedDate, memberId, events, editingEvent, newTitle, itemStaffMap, memberInfo]);

  // Total price for all merged events
  const mergedTotalPrice = useMemo(() => {
    return mergedEvents.reduce((total, event) => {
      return total + calculateTotalPrice(event["服务项目"] || '', SERVICE_CATEGORIES);
    }, 0);
  }, [mergedEvents]);

  // Track if we need to auto-calculate amounts when opening preview
  useEffect(() => {
    if (showCheckoutPreview && mergedEvents.length > 0) {
      const amounts: Record<string, string> = {};
      const prices: Record<string, string> = {}; // Initialize custom prices
      
      mergedEvents.forEach((event, eventIdx) => {
        const eventItems = (event["服务项目"] || '').split(',').map(s => s.trim()).filter(Boolean);
        const colorName = getCleanColorName(event["背景颜色"]);
        const eventStaffIdFromColor = colorName ? COLOR_TO_STAFF_ID[colorName] : undefined;

        eventItems.forEach((itemName, itemIdx) => {
          const itemKey = `${eventIdx}-${itemName}`;
          const itemData = SERVICE_CATEGORIES.flatMap(c => c.items).find(i => i.name === itemName);
          if (itemData) {
            prices[itemKey] = itemData.price.toString();
          }

          const escapedItem = escapeRegExp(itemName);
          const itemStaffMatch = event["备注"]?.match(new RegExp(`\\[${escapedItem}_STAFF:([^\\]]+)\\]`))
          const seqMatch = event["备注"]?.match(/\[STAFF_SEQ:([^\]]+)\]/);
          const staffSeq = seqMatch ? seqMatch[1].split(',').filter(Boolean) : [];
          
          let itemStaffId = itemStaffMatch ? itemStaffMatch[1] : undefined;
          
          if (!itemStaffId) {
            if (staffSeq.length > 0) {
              itemStaffId = staffSeq[itemIdx] || staffSeq[staffSeq.length - 1];
            } else if (eventStaffIdFromColor) {
              itemStaffId = eventStaffIdFromColor;
            }
          }
          
          const staff = staffMembers.find(s => s.id === itemStaffId);
          if (staff && staff.id !== 'NO') {
            if (itemData) {
              const currentAmount = Number(amounts[staff.name] || 0);
              amounts[staff.name] = (currentAmount + itemData.price).toString();
            }
          }
        });
      });

      setStaffAmounts(amounts);
      setCustomItemPrices(prices);
    }
  }, [showCheckoutPreview, mergedEvents]);

  const involvedStaffIds = useMemo(() => {
    const ids = new Set<string>();
    // Include all currently selected staff members
    if (selectedStaffId && selectedStaffId !== 'NO') ids.add(selectedStaffId);
    selectedStaffIds.forEach(id => {
      if (id !== 'NO') ids.add(id);
    });
    
    mergedEvents.forEach(event => {
      // 1. Check item-specific staff in notes
      const matches = event["备注"]?.matchAll(/\[[^\]]+_STAFF:([^\]]+)\]/g);
      if (matches) {
        for (const match of Array.from(matches)) {
          ids.add(match[1]);
        }
      }

      // 2. Also check STAFF_SEQ
      const seqMatch = event["备注"]?.match(/\[STAFF_SEQ:([^\]]+)\]/);
      if (seqMatch) {
        seqMatch[1].split(',').filter(Boolean).forEach(id => ids.add(id));
      }

      // 3. Also try to find a direct staff assignment from bgColor
      const colorName = getCleanColorName(event["背景颜色"]);
      if (colorName) {
        const eventStaffId = COLOR_TO_STAFF_ID[colorName];
        if (eventStaffId && eventStaffId !== 'NO') ids.add(eventStaffId);
      }
      
      // 4. Check for any "技师:ID" legacy format in notes
      const legacyMatch = event["备注"]?.match(/技师:([^,\]\s]+)/);
      if (legacyMatch && legacyMatch[1] !== 'NO') ids.add(legacyMatch[1]);
    });
    
    return Array.from(ids);
  }, [mergedEvents, selectedStaffId, selectedStaffIds]);

  // Helper to escape regex special characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      const memberId = e["会员信息"]?.match(/\(ID: (C\.P \d+)\)/)?.[1] || e["会员信息"]?.match(/\(ID: (\d+)\)/)?.[1] || '';

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
          const overlaps = (eStart < oEnd && eEnd > oStart);
          
          // SPECIAL CASE: If this is a parallel segmented appointment (same member, overlapping time), 
          // we MUST NOT put it in the same column as the other segment.
          if (overlaps && memberId !== '') {
            const otherMemberId = otherE["会员信息"]?.match(/\(ID: (C\.P \d+)\)/)?.[1] || otherE["会员信息"]?.match(/\(ID: (\d+)\)/)?.[1] || '';
            if (memberId === otherMemberId) return true; // Force conflict to move to next column
          }
          
          return overlaps;
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

  const cycleViewType = () => {
    const views: ViewType[] = ['day', 'week', 'month', 'year']
    const currentIndex = views.indexOf(viewType)
    const nextIndex = (currentIndex + 1) % views.length
    setViewType(views[nextIndex])
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
    
    // Auto-numbering for "C.P" (Walk-ins) or "NO" (No-shows)
    let processedName = trimmedName;
    let finalMemberId = memberId;
    const isNoShow = selectedStaffId === 'NO';
    
    // If no member selected (memberId is '0000') OR it's a walk-in name, treat as C.P/NO
    if ((memberId === '0000' || memberId.startsWith('C.P') || memberId.startsWith('NO')) && !processedName && !finalInfo) {
      processedName = '散客';
    }

    if ((memberId === '0000' || memberId.startsWith('C.P') || memberId.startsWith('NO')) && (processedName === '散客' || processedName === '')) {
      if (isNoShow) {
        if (memberId.startsWith('NO ')) {
          finalMemberId = memberId;
        } else {
          // Find the next NO number
          const allNoNumbers = allDatabaseEvents.map(e => {
            const m = e["会员信息"]?.match(/\((NO\s*(\d+))\)/);
            return m ? parseInt(m[2]) : null;
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
        // Find all numbers currently in use (excluding those marked as NO-show)
        const allUsedNumbers = allDatabaseEvents.map(e => {
          const m = e["会员信息"]?.match(/\((?:[A-Z.\s]+)?(\d+)\)/);
          const staffMatch = e["备注"]?.match(/技师:([^,]+)/);
          const isNoShowEvent = staffMatch ? staffMatch[1] === 'NO' : false;
          
          if (m && !isNoShowEvent) {
            return parseInt(m[1]);
          }
          return null;
        }).filter((n): n is number => n !== null);

        // Find the smallest available number
        let nextNumber = 1;
        const sortedNumbers = [...new Set(allUsedNumbers)].sort((a, b) => a - b);
        for (const n of sortedNumbers) {
          if (n === nextNumber) nextNumber++;
          else if (n > nextNumber) break;
        }
        
        finalMemberId = `C.P ${nextNumber.toString().padStart(4, '0')}`;
        processedName = '散客';
      } else {
        // Keeping existing C.P ID if editing and NOT changing to NO
        finalMemberId = memberId;
        processedName = '散客';
      }
    }

    if (processedName) {
      // If we have a name, combine it with the info (which might be phone)
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
    
    // Determine if we should split: 
    // 1. Multiple items
    // 2. AND one of the following:
    //    a. Multiple different staff members are assigned to items (Scheme A/B/C)
    //    b. User explicitly chose sequential/parallel mode
    
    const assignedStaffIds = new Set(items.map((item, idx) => {
      return itemStaffMap[item] || 
             (selectedStaffIds.length > 0 
               ? (selectedStaffIds[idx] || selectedStaffIds[selectedStaffIds.length - 1]) 
               : selectedStaffId);
    }).filter(id => id && id !== ''));

    const hasMultipleStaff = assignedStaffIds.size > 1;
    const isExplicitSplitMode = effectiveMode === 'sequential' || effectiveMode === 'parallel';
    
    // Condition for splitting: multiple items AND (multiple staff OR explicit mode)
    const shouldSplit = items.length > 1 && (hasMultipleStaff || isExplicitSplitMode);
    const splitMode = effectiveMode !== 'normal' ? effectiveMode : 'parallel';

    if (shouldSplit) {
      const eventsToInsert = [];
      let currentStartTime = new Date(selectedDate);
      
      if (splitMode === 'sequential') {
        let currentItemIdx = 0;
        for (const itemName of items) {
          // Scheme A: Automatic sequential matching for split events
          const itemStaffId = itemStaffMap[itemName] || 
                             (selectedStaffIds.length > 0 
                               ? (selectedStaffIds[currentItemIdx] || selectedStaffIds[selectedStaffIds.length - 1]) 
                               : selectedStaffId);
          
          const itemStaff = staffMembers.find(s => s.id === itemStaffId);
          currentItemIdx++;
          
          // Find item price and duration
          let itemPrice = 0;
          let itemDuration = duration; // Default to current duration state if not found
          for (const cat of SERVICE_CATEGORIES) {
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
          const itemColor = getStaffColorClass(itemStaffId, staffMembers, 'bg');

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
            if ((FIXED_STAFF_NAMES as readonly string[]).includes(itemStaff.name)) {
              eventData[`金额_${itemStaff.name}`] = itemPrice;
            } else {
              eventData["备注"] += `, [${itemStaff.name}_AMT:${itemPrice}]`;
            }
          }

          eventsToInsert.push(eventData);

          // Increment start time for next item in sequential mode
          currentStartTime = addMinutes(currentStartTime, itemDuration);
        }
      } else {
        // Parallel mode: Group items by staff to prevent same-staff overlap
        const staffGroups: Record<string, { items: string[], duration: number, totalPrice: number }> = {};
        
        items.forEach((itemName, idx) => {
          const itemStaffId = itemStaffMap[itemName] || 
                             (selectedStaffIds.length > 0 
                               ? (selectedStaffIds[idx] || selectedStaffIds[selectedStaffIds.length - 1]) 
                               : selectedStaffId);
          
          let itemPrice = 0;
          let itemDuration = duration;
          for (const cat of SERVICE_CATEGORIES) {
            const found = cat.items.find(i => i.name === itemName);
            if (found) {
              itemPrice = found.price;
              if (found.duration) itemDuration = found.duration;
              break;
            }
          }
          
          if (!staffGroups[itemStaffId]) {
            staffGroups[itemStaffId] = { items: [], duration: 0, totalPrice: 0 };
          }
          staffGroups[itemStaffId].items.push(itemName);
          staffGroups[itemStaffId].duration += itemDuration;
          staffGroups[itemStaffId].totalPrice += itemPrice;
        });

        for (const [staffId, group] of Object.entries(staffGroups)) {
          const itemStaff = staffMembers.find(s => s.id === staffId);
          const startTimeStr = format(selectedDate, 'HH:mm:ss');
          const serviceDateStr = format(selectedDate, 'yyyy-MM-dd');
          
          const itemColor = getStaffColorClass(staffId, staffMembers, 'bg');

          const eventData: any = {
            "服务项目": group.items.join(', '),
            "会员信息": formattedMemberInfo,
            "服务日期": serviceDateStr,
            "开始时间": startTimeStr,
            "持续时间": group.duration,
            "背景颜色": itemColor,
            "备注": `技师:${staffId}${clickedStaffId ? `,建议:${clickedStaffId}` : ''}`,
          };

          // Add individual item-staff mappings to notes for color rendering/editing
          group.items.forEach(it => {
            eventData["备注"] += `, [${it}_STAFF:${staffId}]`;
          });

          if (itemStaff && group.totalPrice > 0) {
            if ((FIXED_STAFF_NAMES as readonly string[]).includes(itemStaff.name)) {
              eventData[`金额_${itemStaff.name}`] = group.totalPrice;
            } else {
              eventData["备注"] += `, [${itemStaff.name}_AMT:${group.totalPrice}]`;
            }
          }
          eventsToInsert.push(eventData);
        }
      }

      if (eventsToInsert.length > 0) {
        // If editing, delete the old event first
        if (editingEvent) {
          const { error: deleteError } = await supabase
            .from('fx_events')
            .delete()
            .eq('id', editingEvent.id);
          
          if (deleteError) {
            alert('更新拆分预约失败 (删除旧项): ' + deleteError.message);
            setIsSubmitting(false);
            return;
          }
        }

        const { error } = await supabase
          .from('fx_events')
          .insert(eventsToInsert);

        if (error) {
          alert('预约拆分失败: ' + error.message);
        } else {
          closeModal();
          fetchEvents();
        }
      }
      
      // Reset service mode after use
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

    // Add staff sequence for Scheme A if multiple staff are selected
    if (selectedStaffIds.length > 1) {
      eventData["备注"] += `, [STAFF_SEQ:${selectedStaffIds.join(',')}]`
    }

    // Add individual item-staff mappings to notes for color rendering
    Object.entries(itemStaffMap).forEach(([item, staffId]) => {
      if (staffId) {
        eventData["备注"] += `, [${item}_STAFF:${staffId}]`
      }
    })

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
          if ((FIXED_STAFF_NAMES as readonly string[]).includes(staff.name)) {
            // Store in dedicated column if it exists
            eventData[`金额_${staff.name}`] = amount
          } else {
            // Otherwise, append to a special format in notes for retrieval
            extraNotes += `, [${staff.name}_AMT:${amount}]`
          }
        }
      }
    })

    eventData["备注"] += extraNotes

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
    
    // CRITICAL: Restore itemStaffMap for split events or events with encoded staff mappings
    const newItemStaffMap: Record<string, string> = {}
    
    // 1. Try to parse specific [ITEM_STAFF:ID] mappings from notes
    if (event["备注"]) {
      const staffMapMatches = event["备注"].matchAll(/\[(.*?)\s*_STAFF:([^\]]+)\]/g)
      for (const match of staffMapMatches) {
        newItemStaffMap[match[1]] = match[2]
      }
    }
    
    // 2. If no specific mappings found but we have items and a main staff, 
    // fall back to mapping all items to the main staff
    if (Object.keys(newItemStaffMap).length === 0 && currentService && parsedStaffId) {
      currentService.split(',').forEach(item => {
        newItemStaffMap[item.trim()] = parsedStaffId
      })
    }
    
    setItemStaffMap(newItemStaffMap)

    // Restore staff sequence if present, otherwise fallback to single staff selection
    const seqMatch = event["备注"]?.match(/\[STAFF_SEQ:([^\]]+)\]/)
    if (seqMatch) {
      const seqIds = seqMatch[1].split(',').filter(Boolean)
      setSelectedStaffIds(seqIds)
    } else if (parsedStaffId && parsedStaffId !== 'NO') {
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
    setShowTimeSelection(false)
    setIsDurationPickerOpen(false)
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
      staffMembers.forEach(staff => {
        if (staff.id !== 'NO') {
          // Check fixed column: 金额_NAME
          amount += (event[`金额_${staff.name}` as keyof CalendarEvent] as number || 0)
        }
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
         const staffId = event["备注"]?.match(/技师:([^,\]]+)/)?.[1]
         const staffName = staffMembers.find(s => s.id === staffId)?.name || 'Unknown'
         
         existing.history.push({
           date: eventDate,
           service: event["服务项目"],
           staff: staffName,
           amount: amount
         })
       } else {
         const staffId = event["备注"]?.match(/技师:([^,\]]+)/)?.[1]
         const staffName = staffMembers.find(s => s.id === staffId)?.name || 'Unknown'

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
            staff: staffName,
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
    setShowTimeSelection(false)
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
      const newItems = [...items]
      
      if (index > -1) {
        newItems.splice(index, 1)
      } else {
        newItems.push(service)
      }

      // Re-calculate the entire mapping to ensure "Auto Average"
      // This applies to both Full-auto (staff first) and Semi-auto (projects first)
      if (selectedStaffIds.length > 1) {
        setItemStaffMap(prevMap => {
          const newMap = { ...prevMap }
          // Clear all current items to re-distribute
          newItems.forEach((it, idx) => {
            newMap[it] = selectedStaffIds[idx % selectedStaffIds.length]
          })
          // Clean up any items that were removed
          if (index > -1) {
            delete newMap[service]
          }
          return newMap
        })
      } else if (index > -1) {
        // Just remove if only one/no staff
        setItemStaffMap(prevMap => {
          const newMap = { ...prevMap }
          delete newMap[service]
          return newMap
        })
      } else if (selectedStaffId && selectedStaffId !== 'NO') {
        // Assign to active staff if only one
        setItemStaffMap(prevMap => ({
          ...prevMap,
          [service]: selectedStaffId
        }))
      }
      
      return newItems.join(', ')
    })
  }

  useEffect(() => {
    if (!newTitle) return;
    
    const items = newTitle.split(',').map(s => s.trim()).filter(Boolean)
    let totalDuration = 0
    
    items.forEach(itemName => {
      for (const cat of SERVICE_CATEGORIES) {
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

  const generateMemberId = async (category: 'young' | 'middle' | 'senior' | 'male' | 'noshow') => {
    setMemberId('...') // Loading feedback
    
    const ranges: Record<'young' | 'middle' | 'senior' | 'male' | 'noshow', { min: number; max: number; prefix: string }> = {
      young: { prefix: 'GIO ', min: 1, max: 3000 },
      middle: { prefix: 'ADU ', min: 3001, max: 6000 },
      senior: { prefix: 'ANZ ', min: 6001, max: 9000 },
      male: { prefix: 'U ', min: 9001, max: 9999 },
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
        
        // Extract number from any format like (GIO 0001), (ADU 3001), (0001), (NO 1)
        const match = info.match(/\((?:[A-Z.\s]+)?(\d+)\)/)
        if (match) {
          const num = parseInt(match[1])
          // If it's a NO show ID, track it separately
          if (info.includes('(NO ')) {
            existingNoShowIds.add(num)
          } else {
            existingIds.add(num)
          }
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
        : `${config.prefix}${nextId.toString().padStart(4, '0')}`
        
      setMemberId(formattedId)
      setSelectedMember(prev => (prev ? { ...prev, card: formattedId } : prev))
    } catch (err) {
      console.error('Error generating member ID:', err)
      // Fallback
      const randomId = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min
      const formattedId = category === 'noshow' 
        ? `NO ${randomId}` 
        : `${config.prefix}${randomId.toString().padStart(4, '0')}`
      setMemberId(formattedId)
    }
  }

  // --- Calendar Data ---
  const days = getCalendarDays(viewType, currentDate)
  const monthStart = startOfMonth(currentDate)
  const locale = lang === 'zh' ? zhCN : itLocale

  const TIME_SLOTS = generateTimeSlots()

  return (
    <div className="flex flex-col h-full w-full bg-transparent text-zinc-100 overflow-hidden relative">
      {/* Header */}
      <div className={cn("relative flex items-center justify-center px-2 md:px-4 lg:px-6 bg-transparent z-20 overflow-hidden max-h-[100px] py-1 md:py-1.5 opacity-100", isModalOpen && "pointer-events-none")}>
        {/* Year/Month Display Positioned Left */}
         {(viewType === 'year' || viewType === 'month') && (
           <div className="absolute left-12 md:left-24 lg:left-32 flex items-center gap-1 animate-in fade-in slide-in-from-left-4 duration-700">
             {[...format(currentDate, viewType === 'year' ? 'yyyy' : 'MM')].map((ch, i) => (
               <span
                 key={`date-display-${i}`}
                 className="text-xl md:text-3xl lg:text-4xl font-black bg-gradient-to-r from-zinc-400 via-white to-zinc-400 bg-[length:200%_auto] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] leading-none"
                 style={{ fontFamily: 'var(--font-orbitron)' }}
               >
                 {ch}
               </span>
             ))}
             {viewType === 'month' && (
               <span 
                 className="text-lg md:text-2xl lg:text-3xl font-black bg-gradient-to-r from-zinc-400 via-white to-zinc-400 bg-clip-text text-transparent ml-1"
                 style={{ fontFamily: 'var(--font-noto-sans-sc)' }}
               >
                 月
               </span>
             )}
           </div>
         )}

        <div className="flex items-center gap-4 md:gap-6">
          <button 
            onClick={handlePrev} 
            className="p-1.5 md:p-2 rounded-full bg-transparent border border-white/20 text-zinc-400/80 hover:text-white hover:bg-white/10 hover:border-white/40 transition-all"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {(['day', 'week', 'month', 'year'] as ViewType[]).map((type) => {
            const labels: Record<ViewType, string> = {
              day: '今',
              week: '周',
              month: '月',
              year: '年'
            }
            const isActive = viewType === type
            return (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={cn(
                  "w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center text-xs md:text-sm font-black transition-all duration-300",
                  isActive 
                    ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-110 z-10 border-white/40" 
                    : "bg-transparent border border-white/20 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/40"
                )}
                style={{ fontFamily: 'var(--font-noto-sans-sc)' }}
              >
                {labels[type]}
              </button>
            )
          })}

          <button 
            onClick={handleNext} 
            className="p-1.5 md:p-2 rounded-full bg-transparent border border-white/20 text-zinc-400/80 hover:text-white hover:bg-white/10 hover:border-white/40 transition-all"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>
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
                  <div 
                      onClick={onToggleSidebar}
                      className={cn(
                        "flex items-center text-lg md:text-2xl lg:text-3xl font-black tracking-[0.28em] select-none drop-shadow-[0_0_16px_rgba(255,255,255,0.35)] cursor-pointer group",
                        isModalOpen && "pointer-events-none"
                      )}
                    >
                    {/* Display Year */}
                     {[...format(currentDate, 'yyyy')].map((ch, i) => (
                       <span
                         key={`year-${i}`}
                         className="bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_auto] bg-clip-text text-transparent transition-opacity group-hover:opacity-80"
                         style={{ fontFamily: 'var(--font-orbitron)' }}
                       >
                         {ch}
                       </span>
                     ))}
                     {/* Weather Display */}
                     <div className="mx-4 flex items-center transition-transform group-hover:scale-110">
                       <WeatherDisplay />
                     </div>
                     {/* Display Date */}
                     {[...format(currentDate, I18N[lang].dayHeaderFormat, { locale })].map((ch, i) => (
                       /\d/.test(ch)
                         ? <span
                             key={`date-${i}`}
                             className="bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_auto] bg-clip-text text-transparent transition-opacity group-hover:opacity-80"
                             style={{ fontFamily: 'var(--font-orbitron)' }}
                           >
                             {ch}
                           </span>
                         : <span
                             key={`date-${i}`}
                             className="bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_auto] bg-clip-text text-transparent transition-opacity group-hover:opacity-80"
                             style={{ fontFamily: 'var(--font-noto-sans-sc)' }}
                           >
                             {ch}
                           </span>
                     ))}
                  </div>
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
                        "w-9 h-9 md:w-11 md:h-11 rounded-full border flex items-center justify-center",
                        isSameDay(currentDate, today || new Date(2024, 0, 1))
                          ? "bg-gradient-to-br from-white/20 to-white/5 border-white/10 shadow-lg"
                          : "bg-transparent border-white/15 hover:border-white/30",
                        isModalOpen && "pointer-events-none"
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
                    viewType === 'day' ? "" : "grid-cols-7 gap-1.5 md:gap-3 lg:gap-4",
                    isModalOpen && "pointer-events-none"
                  )}
                  style={viewType === 'day' ? { gridTemplateColumns: `repeat(${activeStaff.length}, minmax(0, 1fr))` } : {}}
                >
                  {viewType === 'day' ? (
                    activeStaff.map(staff => (
                      <div key={staff.id} className="py-3 md:py-4 text-center flex flex-col items-center gap-1.5">
                        <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                          <span className="text-[10px] md:text-xs font-black text-white tracking-tighter">{staff.avatar}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    days.map((day) => (
                      <div 
                        key={day.toString()} 
                        className="py-2 md:py-3 flex flex-col items-center cursor-pointer group/day-header"
                        onClick={() => {
                          setCurrentDate(day)
                          setViewType('day')
                        }}
                      >
                        <div className={cn(
                          "flex flex-col items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full transition-all duration-300",
                          isSameDay(day, today || new Date(2024, 0, 1)) 
                            ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                            : "hover:bg-white/10 group-hover/day-header:scale-110"
                        )}>
                          <div className={cn(
                            "text-[10px] md:text-xs font-black italic uppercase tracking-widest mb-0.5",
                            isSameDay(day, today || new Date(2024, 0, 1)) ? "text-zinc-950/80" : "text-white"
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
            <div className={cn("flex-1 overflow-y-auto scrollbar-none", isModalOpen && "pointer-events-none")}>
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
                  {/* Now Line Indicator */}
                  {isSameDay(currentDate, now) && (viewType === 'day' || viewType === 'week') && now.getHours() >= 8 && now.getHours() < 20 && (
                    <div 
                      className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                      style={{ 
                        top: `${((now.getHours() - 8) * 60 + now.getMinutes()) * (4 / 60)}rem`,
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] -ml-1" />
                      <div className="flex-1 h-[0.5px] bg-gradient-to-r from-rose-500/50 via-rose-500 to-rose-500/50" />
                    </div>
                  )}

                  {viewType === 'day' ? activeStaff.map((staff) => {
                      const filteredEvents = events.filter(e => {
                        const isCurrentDay = isSameDay(getEventStartTime(e), currentDate)
                        if (!isCurrentDay) return false
                        const assignedStaffId = eventAssignments.get(e.id)
                        return assignedStaffId === staff.id
                      })

                      return (
                          <div key={staff.id} className="relative border-l border-white/5 first:border-l-0 z-10">
                            {/* Static Gap Badges between appointments */}
                            <GapBadge 
                              staffId={staff.id} 
                              events={events} 
                              eventAssignments={eventAssignments} 
                              currentDate={currentDate} 
                              now={now}
                            />
                            
                            {/* Floating Timer attached to Now Line in this column */}
                          <StaffTimer 
                            staffId={staff.id} 
                            events={events} 
                            eventAssignments={eventAssignments} 
                            now={now} 
                            currentDate={currentDate}
                          />
                          
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
                              <div className="absolute inset-0 bg-white/0 group-hover/slot:bg-white/10" />
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
                          const staffId = staffIdMatch ? staffIdMatch[1] : undefined
                          
                          const memberIdMatch = event["会员信息"]?.match(/\(([^)]+)\)/)
                          const memberDisplayId = memberIdMatch ? memberIdMatch[1] : ''
                          
                          const isShort = durationInMinutes < 30
                          
                          return (
                            <div 
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditModal(event)
                              }}
                              style={{ 
                                top: `calc(${top}rem + 1px)`, 
                                height: `calc(${height}rem - 2px)`,
                                left: '4px',
                                right: '4px'
                              }}
                              className={cn(
                                "absolute z-10 rounded-lg text-white shadow-2xl overflow-hidden",
                                isShort ? "px-1.5 py-0" : "px-2.5 py-1",
                                "shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] ring-1 ring-white/10",
                                "hover:brightness-110 flex flex-col gap-0.5 uppercase tracking-wider",
                                event["背景颜色"] || 'bg-blue-600'
                              )}
                            >
                              <div className={cn(
                                "flex flex-col leading-none font-black italic w-full h-full justify-center",
                                height < 1.5 ? "text-[8px] scale-[0.9] origin-left" : 
                                height < 2 ? "text-[9px]" :
                                isShort ? "text-[10px]" : "text-[13px]"
                              )}>
                                <div className="flex items-center gap-1 w-full overflow-hidden">
                                  {staffId === 'NO' && <span className="text-[7px] bg-zinc-800 px-0.5 rounded border border-zinc-700 not-italic shrink-0 scale-90">NO</span>}
                                <div className="truncate flex-1 flex items-center gap-0.5 overflow-hidden">
                                  {(() => {
                                    const items = event["服务项目"].split(',').map(s => s.trim()).filter(Boolean);
                                    
                                    // Extract staff sequence if present for Scheme A fallback
                                    const seqMatch = event["备注"]?.match(/\[STAFF_SEQ:([^\]]+)\]/);
                                    const staffSeq = seqMatch ? seqMatch[1].split(',').filter(Boolean) : [];
                                    
                                    return items.map((item, idx) => {
                                      // 1. Try to get individual staff mapping if available in notes
                                      const escapedItem = escapeRegExp(item);
                                      const itemStaffMatch = event["备注"]?.match(new RegExp(`\\[${escapedItem}_STAFF:([^\\]]+)\\]`))
                                      
                                      // 2. Fallback to sequence logic (Scheme A) if available
                                      // 3. Fallback to main staffId
                                      let itemStaffId = itemStaffMatch 
                                        ? itemStaffMatch[1] 
                                        : (staffSeq.length > 0 
                                            ? (staffSeq[idx] || staffSeq[staffSeq.length - 1]) 
                                            : staffId);
                                      
                                      return (
                                        <React.Fragment key={idx}>
                                          <span className="truncate text-white">{item}</span>
                                          {idx < items.length - 1 && <span className="text-white/60 mx-0.5">/</span>}
                                        </React.Fragment>
                                      )
                                    });
                                  })()}
                                </div>
                                  {isShort && memberDisplayId && (
                                    <span className="text-[9px] ml-auto shrink-0 font-black not-italic leading-tight text-white">{memberDisplayId}</span>
                                  )}
                                </div>
                                {!isShort && memberDisplayId && (
                                  <div className="mt-1">
                                    <span className="text-[10px] font-black not-italic truncate leading-none inline-block text-white">
                                      {memberDisplayId}
                                    </span>
                                  </div>
                                )}
                              </div>
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
                              <div className="absolute inset-0 bg-white/0 group-hover/slot:bg-white/10" />
                            </div>
                          )
                        })}

                        {(() => {
                          const sortedEvents = [...filteredEvents].sort((a, b) => {
                            const startA = getEventStartTime(a).getTime()
                            const startB = getEventStartTime(b).getTime()
                            if (startA !== startB) return startA - startB
                            return getEventEndTime(b).getTime() - getEventEndTime(a).getTime()
                          })

                          const groups: { event: CalendarEvent; start: number; end: number; column: number; totalColumns: number }[] = []
                          const activeGroups: typeof groups = []

                          sortedEvents.forEach(event => {
                            const start = getEventStartTime(event).getTime()
                            const end = getEventEndTime(event).getTime()

                            // Remove groups that don't overlap with current event
                            for (let i = activeGroups.length - 1; i >= 0; i--) {
                              if (activeGroups[i].end <= start) {
                                activeGroups.splice(i, 1)
                              }
                            }

                            // Find first available column
                            let column = 0
                            const usedColumns = new Set(activeGroups.map(g => g.column))
                            while (usedColumns.has(column)) {
                              column++
                            }

                            const newGroup = { event, start, end, column, totalColumns: 0 }
                            groups.push(newGroup)
                            activeGroups.push(newGroup)

                            // Update totalColumns for all currently overlapping events
                            const currentOverlaps = groups.filter(g => 
                              activeGroups.some(ag => ag.event.id === g.event.id)
                            )
                            const maxCol = Math.max(...activeGroups.map(g => g.column)) + 1
                            activeGroups.forEach(ag => {
                              ag.totalColumns = Math.max(ag.totalColumns, maxCol)
                            })
                          })

                          return groups.map(group => {
                            const event = group.event
                            const start = getEventStartTime(event)
                            const end = getEventEndTime(event)
                            const totalStartMinutes = (start.getHours() - 8) * 60 + start.getMinutes()
                            const durationInMinutes = (end.getTime() - start.getTime()) / 60000
                            
                            const top = (totalStartMinutes / 60) * 4
                            const height = (durationInMinutes / 60) * 4

                            const memberIdMatch = event["会员信息"]?.match(/\(([^)]+)\)/)
                            const memberDisplayId = memberIdMatch ? memberIdMatch[1] : ''
                            
                            const staffIdMatch = event["备注"]?.match(/技师:([^,]+)/)
                            const staffId = staffIdMatch ? staffIdMatch[1] : undefined
                            
                            const isShort = durationInMinutes < 30
                            
                            const width = 100 / group.totalColumns
                            const left = group.column * width

                            return (
                              <div 
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditModal(event)
                                }}
                                style={{ 
                                  top: `calc(${top}rem + 1px)`, 
                                  height: `calc(${height}rem - 2px)`,
                                  left: `${left}%`,
                                  width: `${width}%`,
                                  paddingLeft: '2px',
                                  paddingRight: '2px'
                                }}
                                className={cn(
                                  "absolute z-10 rounded-lg text-white shadow-2xl overflow-hidden transition-all duration-300",
                                  "shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] ring-1 ring-white/10",
                                  "hover:brightness-110",
                                  event["背景颜色"] || 'bg-blue-600'
                                )}
                              />
                            )
                          })
                        })()}
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
                : "grid-cols-7 grid-rows-6 gap-1 md:gap-2 lg:gap-2.5",
              isModalOpen && "pointer-events-none"
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
                      // Switch to day view when clicking a day in month view
                      setCurrentDate(day)
                      setViewType('day')
                    }}
                    className={cn(
                      "relative flex flex-col p-1.5 md:p-3 lg:p-4 rounded-xl md:rounded-2xl lg:rounded-3xl cursor-pointer group/cell overflow-hidden transition-all duration-300",
                      !isCurrentMonth ? "opacity-20" : "hover:bg-white/10 hover:shadow-2xl hover:shadow-white/5 hover:-translate-y-0.5",
                      isToday && "bg-white/10 ring-1 ring-white/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]",
                      viewType === 'year' && "items-center justify-center text-center"
                    )}
                  >
                    <div className={cn(
                      "transition-transform duration-300 group-hover/cell:scale-110 z-10",
                      viewType === 'year' ? "absolute top-2 left-2 md:top-3 md:left-3" : "absolute top-1 left-1 md:top-1.5 md:left-1.5"
                    )}>
                      <span className={cn(
                        "font-bold flex items-center justify-center transition-all duration-300",
                        viewType === 'year' 
                          ? "text-2xl md:text-3xl text-white drop-shadow-lg" 
                          : "text-[9px] md:text-xs w-5 h-5 md:w-6 md:h-6 rounded-full",
                        viewType !== 'year' && (isToday 
                          ? "bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                          : (isCurrentMonth 
                              ? (viewType === 'month' ? "bg-transparent text-white/90 border border-white/20 group-hover/cell:border-white/40" : "text-zinc-300 group-hover/cell:text-white") 
                              : "text-zinc-600"))
                      )}>
                        {viewType === 'year' ? format(day, 'M月', { locale: zhCN }) : format(day, 'd', { locale: zhCN })}
                      </span>
                    </div>

                    {/* Show appointment count for month view - Centered */}
                    {(viewType === 'month' || viewType === 'year') && isCurrentMonth && (
                      <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                        {dayEvents.length > 0 ? (
                          <span className={cn(
                            "font-black italic text-white/90 drop-shadow-[0_4px_12px_rgba(255,255,255,0.3)] tracking-tighter group-hover/cell:scale-110 transition-transform duration-500",
                            viewType === 'year' ? "text-2xl md:text-4xl lg:text-5xl" : "text-xl md:text-3xl lg:text-4xl"
                          )}>
                            {dayEvents.length}
                          </span>
                        ) : (
                          null
                        )}
                      </div>
                    )}
                    
                    {/* Show dots for year view - Disabled as per request to only show count */}
                    {false && viewType === 'year' && dayEvents.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1 mt-2">
                        {dayEvents.slice(0, 6).map(event => (
                          <div 
                            key={event.id}
                            className={cn(
                              "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full",
                              event["背景颜色"] || 'bg-blue-600'
                            )}
                          />
                        ))}
                        {dayEvents.length > 6 && (
                          <div className="text-[8px] text-zinc-500 font-bold">+{dayEvents.length - 6}</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-transparent"
          onClick={closeModal}
        >
          <div 
            className="w-full max-w-2xl bg-white/[0.03] border border-white/30 rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-sm ring-1 ring-white/10"
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
                      <label className="text-[9px] md:text-[10px] font-black italic text-white uppercase tracking-widest">
                        服务内容
                      </label>
                      <div className="relative group w-full bg-white/[0.03] border-none rounded-xl focus-within:ring-2 focus-within:ring-white/10 shadow-inner overflow-hidden">
                        <input 
                          autoFocus
                          type="text"
                          placeholder="输入服务项目..."
                          className="w-full bg-transparent border-none px-3 py-2.5 text-transparent caret-transparent focus:outline-none text-xs placeholder:text-zinc-500 relative z-10"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onFocus={() => {
                            setShowServiceSelection(true)
                            setShowMemberDetail(false)
                            setShowCheckoutPreview(false)
                            setShowTimeSelection(false)
                          }}
                          required
                        />
                        {/* Colored Content Display - Directly inside the box */}
                        <div className="absolute inset-0 flex items-center px-3 pointer-events-none z-0 overflow-hidden">
                          {newTitle ? (
                            <div className="flex items-center text-xs font-bold whitespace-pre">
                              {(() => {
                                const parts = newTitle.split(/(\s*,\s*)/);
                                const itemParts = parts.filter(p => !p.includes(',') && p.trim());
                                let currentItemIdx = 0;
                                
                                return parts.map((part, idx) => {
                                  const trimmed = part.trim()
                                  const isSeparator = part.includes(',')
                                  
                                  if (isSeparator || !trimmed) {
                            return <span key={idx} className="text-white/40">{part}</span>
                          }

                                  // Priority for color display (L1/L2/L3 unified):
                                  // 1. Explicit manual/auto binding (itemStaffMap)
                                  // 2. If no binding, fallback to sequential assignment (L1) based on selectedStaffIds
                                  const staffId = itemStaffMap[trimmed] || 
                                                 (selectedStaffIds.length > 1 
                                                   ? (selectedStaffIds[currentItemIdx] || selectedStaffIds[selectedStaffIds.length - 1]) 
                                                   : selectedStaffId);
                                  
                                  currentItemIdx++;
                                  
                                  const colorClass = getStaffColorClass(staffId, staffMembers, 'text');
                                  
                                  return (
                                    <span key={idx} className={cn("font-black italic tracking-wider", colorClass)}>
                                      {part}
                                    </span>
                                  )
                                });
                              })()}
                            </div>
                          ) : (
                            <span className="text-zinc-500 text-xs">输入服务项目...</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 relative">
                      <label className="text-[9px] md:text-[10px] font-black italic text-white uppercase tracking-widest">
                        会员信息
                      </label>
                      <input 
                        type="text"
                        placeholder="姓名/卡号/电话"
                        className="w-full bg-white/[0.03] border-none rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 text-xs placeholder:text-zinc-500 shadow-inner"
                        value={memberInfo}
                        onChange={(e) => {
                          setMemberInfo(e.target.value)
                          setMemberSearchQuery(e.target.value)
                        }}
                        onFocus={() => {
                          setShowServiceSelection(false)
                          if (selectedMember) setShowMemberDetail(true)
                          setShowCheckoutPreview(false)
                          setShowTimeSelection(false)
                        }}
                      />
                      {/* Search Results Dropdown */}
                      {(filteredMembers.length > 0 || memberSearchQuery) && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 max-h-40 overflow-y-auto overflow-x-hidden">
                          {filteredMembers.map((member) => (
                            <button
                              key={member.card}
                              type="button"
                              onClick={() => handleSelectMember(member)}
                              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/5"
                            >
                              <div className="flex flex-col items-start">
                                {member.name && <span className="text-xs font-bold text-white">{member.name}</span>}
                                <span className="text-[10px] text-zinc-400">{member.phone}</span>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/60">
                                {member.card}
                              </span>
                            </button>
                          ))}
                          {memberSearchQuery && !filteredMembers.some(m => m.phone === memberSearchQuery) && (
                            <button
                              type="button"
                              onClick={() => handleNewMember(memberSearchQuery)}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-500/10 text-emerald-500"
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
                    <div className="space-y-1.5 relative">
                      <label className="text-[9px] md:text-[10px] font-black italic text-white uppercase tracking-widest">
                        {I18N[lang].serviceDate}
                      </label>
                      <div 
                        onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                        className="w-full bg-white/5 border-none rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 text-xs shadow-inner cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-bold">{selectedDate ? format(selectedDate, 'yyyy/MM/dd') : ''}</span>
                        <CalendarIcon className="w-4 h-4 text-white/60" />
                      </div>

                      {/* Custom Date Picker Popup */}
                      {isDatePickerOpen && (
                        <div className="absolute top-full left-0 mt-2 z-[100] bg-black/50 backdrop-blur-xl border border-white/5 rounded-2xl p-3 shadow-2xl w-[240px]">
                          {/* Header: YYYY年 MM月 */}
                          <div className="flex items-center justify-center mb-4">
                            <h3 className="text-[11px] font-black tracking-widest text-white uppercase italic">
                              {selectedDate ? format(selectedDate, 'yyyy年 MM月') : ''}
                            </h3>
                          </div>

                          {/* Weekdays */}
                          <div className="grid grid-cols-7 mb-2">
                            {['一', '二', '三', '四', '五', '六', '日'].map(d => (
                              <div key={d} className="text-center text-[9px] font-black italic text-zinc-400">
                                {d}
                              </div>
                            ))}
                          </div>

                          {/* Days Grid */}
                          <div className="grid grid-cols-7 gap-y-0.5">
                            {(() => {
                              if (!selectedDate) return null;
                              const monthStart = startOfMonth(selectedDate);
                              const monthEnd = endOfMonth(selectedDate);
                              const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
                              const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
                              
                              const calendarDays = eachDayOfInterval({
                                start: startDate,
                                end: endDate
                              });

                              return calendarDays.map((day, i) => {
                                const isSelected = isSameDay(day, selectedDate);
                                const isCurrentMonth = isSameMonth(day, monthStart);
                                
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                      const newDate = new Date(selectedDate);
                                      newDate.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
                                      setSelectedDate(newDate);
                                      setSelectedEndDate(addMinutes(newDate, duration));
                                      setIsDatePickerOpen(false);
                                    }}
                                    className={cn(
                                      "h-7 w-7 flex items-center justify-center text-[10px] transition-all rounded-lg",
                                      isSelected 
                                        ? "bg-white text-black font-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                                        : isCurrentMonth 
                                          ? "text-zinc-300 hover:bg-white/10" 
                                          : "text-zinc-800"
                                    )}
                                  >
                                    {format(day, 'd')}
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] font-black italic text-white uppercase tracking-widest">
                        {I18N[lang].startTime}
                      </label>
                      <div 
                        className="grid grid-cols-2 gap-2 cursor-pointer"
                        onClick={() => {
                          setShowTimeSelection(true);
                          setTimeSelectionType('start');
                          setShowServiceSelection(false);
                          setShowMemberDetail(false);
                          setShowCheckoutPreview(false);
                        }}
                      >
                        <div className={cn(
                          "w-full bg-white/5 border-none rounded-xl px-2 py-2.5 text-white text-xs text-center font-bold shadow-inner transition-all",
                          showTimeSelection && timeSelectionType === 'start' ? "bg-white/20 ring-1 ring-white/30" : "hover:bg-white/10"
                        )}>
                          {selectedDate ? format(selectedDate, 'HH') : '08'}{I18N[lang].hourSuffix}
                        </div>
                        <div className={cn(
                          "w-full bg-white/5 border-none rounded-xl px-2 py-2.5 text-white text-xs text-center font-bold shadow-inner transition-all",
                          showTimeSelection && timeSelectionType === 'start' ? "bg-white/20 ring-1 ring-white/30" : "hover:bg-white/10"
                        )}>
                          {selectedDate ? format(selectedDate, 'mm') : '00'}{I18N[lang].minuteSuffix}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Duration & End Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 relative">
                      <label className="text-[9px] md:text-[10px] font-black italic text-white uppercase tracking-widest">
                        {I18N[lang].duration}
                      </label>
                      <div 
                        onClick={() => setIsDurationPickerOpen(!isDurationPickerOpen)}
                        className="w-full bg-white/5 border-none rounded-xl px-3 py-2.5 text-white text-xs font-bold shadow-inner cursor-pointer hover:bg-white/10 transition-all flex items-center justify-between"
                      >
                        <span>{duration} {I18N[lang].minutesSuffix}</span>
                        <ChevronDown className={cn("w-3.5 h-3.5 text-white/60 transition-transform", isDurationPickerOpen && "rotate-180")} />
                      </div>

                      {/* Custom Duration Picker Popover */}
                      {isDurationPickerOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-[60]" 
                            onClick={() => setIsDurationPickerOpen(false)}
                          />
                          <div className="absolute top-full left-0 w-full mt-2 bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden">
                            <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                              {(() => {
                                const baseOptions = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300];
                                const options = [...baseOptions];
                                if (duration && !options.includes(duration)) {
                                  options.push(duration);
                                }
                                return options.sort((a, b) => a - b).map(m => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => {
                                      setDuration(m);
                                      if (selectedDate) {
                                        setSelectedEndDate(addMinutes(new Date(selectedDate), m));
                                      }
                                      setIsDurationPickerOpen(false);
                                    }}
                                    className={cn(
                                      "w-full px-4 py-2.5 text-left text-xs font-bold transition-colors rounded-xl",
                                      duration === m 
                                        ? "bg-white text-zinc-950" 
                                        : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                    )}
                                  >
                                    {m} {I18N[lang].minutesSuffix}
                                  </button>
                                ));
                              })()}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] font-black italic text-white uppercase tracking-widest">
                        {I18N[lang].endTime}
                      </label>
                      <div 
                        className="grid grid-cols-2 gap-2 cursor-pointer"
                        onClick={() => {
                          setShowTimeSelection(true);
                          setTimeSelectionType('end');
                          setShowServiceSelection(false);
                          setShowMemberDetail(false);
                          setShowCheckoutPreview(false);
                        }}
                      >
                        <div className={cn(
                          "w-full bg-white/5 border-none rounded-xl px-2 py-2.5 text-white text-xs text-center font-bold shadow-inner transition-all",
                          showTimeSelection && timeSelectionType === 'end' ? "bg-white/20 ring-1 ring-white/30" : "hover:bg-white/10"
                        )}>
                          {selectedEndDate ? format(selectedEndDate, 'HH') : (selectedDate ? format(selectedDate, 'HH') : '08')}{I18N[lang].hourSuffix}
                        </div>
                        <div className={cn(
                          "w-full bg-white/5 border-none rounded-xl px-2 py-2.5 text-white text-xs text-center font-bold shadow-inner transition-all",
                          showTimeSelection && timeSelectionType === 'end' ? "bg-white/20 ring-1 ring-white/30" : "hover:bg-white/10"
                        )}>
                          {selectedEndDate ? format(selectedEndDate, 'mm') : (selectedDate ? format(selectedDate, 'mm') : '00')}{I18N[lang].minuteSuffix}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 5: Staff */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] md:text-[10px] font-black italic text-white uppercase tracking-widest">
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
                            
                            // Toggle logic for selection
                            const isAlreadySelected = selectedStaffIds.includes(staff.id);
                            
                            if (isAlreadySelected) {
                              // If already selected, remove it
                              const newIds = selectedStaffIds.filter(id => id !== staff.id);
                              setSelectedStaffIds(newIds);
                              
                              // Scheme B: Re-distribute ALL items among remaining staff
                              const currentItems = newTitle.split(',').map(s => s.trim()).filter(Boolean);
                              if (currentItems.length > 0) {
                                setItemStaffMap(prev => {
                                  const newMap = { ...prev };
                                  // Clear all mappings first to ensure a clean re-distribution
                                  Object.keys(newMap).forEach(it => delete newMap[it]);
                                  
                                  if (newIds.length > 0) {
                                    // If still have staff, re-distribute all items among them
                                    currentItems.forEach((it, idx) => {
                                      newMap[it] = newIds[idx % newIds.length];
                                    });
                                  }
                                  return newMap;
                                });
                              }

                              // If it was the primary selectedStaffId, update it to the next available or empty
                              if (selectedStaffId === staff.id) {
                                if (newIds.length > 0) {
                                  setSelectedStaffId(newIds[0]);
                                  const nextStaff = staffMembers.find(s => s.id === newIds[0]);
                                  const nextColor = nextStaff?.bgColor?.replace('/10', '') || 'bg-sky-400';
                                  setSelectedColor(nextColor);
                                } else {
                                  setSelectedStaffId('');
                                  setSelectedColor('bg-sky-400'); // Default unassigned color
                                }
                              }
                            } else {
                              // If not selected, add it
                              const newSelectedIds = [...selectedStaffIds, staff.id];
                              setSelectedStaffId(staff.id);
                              setSelectedStaffIds(newSelectedIds);

                              // Scheme B: Click Binding (Priority L2/L1)
                              // When staff are clicked, RE-DISTRIBUTE ALL items among current staff selection
                              const currentItems = newTitle.split(',').map(s => s.trim()).filter(Boolean);
                              
                              if (currentItems.length > 0) {
                                setItemStaffMap(prev => {
                                  const newMap = { ...prev };
                                  // Clear previous auto-mappings and re-distribute
                                  // This ensures "Semi-auto flow": click projects first -> select multiple staff = auto re-average
                                  currentItems.forEach((it, idx) => {
                                    newMap[it] = newSelectedIds[idx % newSelectedIds.length];
                                  });
                                  return newMap;
                                });
                              }

                              // Use the staff's color via helper
                              const color = getStaffColorClass(staff.id, staffMembers, 'bg')
                              setSelectedColor(color)
                            }
                          }}
                          className={cn(
                            "relative w-full py-2 rounded-xl text-[10px] font-black italic tracking-widest uppercase truncate px-1 border-2",
                            isActive 
                              ? `${getStaffColorClass(staff.id, staffMembers, 'bg')} text-white border-transparent shadow-lg` 
                              : isInvolved
                                ? `bg-white/10 text-white ${staff.color || 'border-white/40'}`
                                : "bg-white/5 text-white hover:text-white hover:bg-white/10 border-transparent"
                          )}
                        >
                          {staff.name}
                          
                          {/* Order Indicator (Sequence Number) */}
                          {orderIndex > -1 && (
                            <div className={cn(
                              "absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shadow-lg border border-white/20",
                              getStaffColorClass(staff.id, staffMembers, 'bg')
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
                        className="w-full py-2 rounded-xl text-[10px] font-black bg-white/5 text-zinc-600 hover:text-white hover:bg-white/10 flex items-center justify-center border border-dashed border-white/10"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column - Member Detail or Service Selection or Checkout Preview */}
                <div className="p-6 space-y-4 bg-transparent min-h-[400px]">
                  {showCheckoutPreview ? (
                    <div className="h-full flex flex-col space-y-6">
                      {/* Receipt Header */}
                      <div className="flex flex-col items-center justify-center space-y-2 py-4 border-b border-white/5">
                        <h2 className="text-xl font-black italic tracking-[0.4em] text-white">BILLING</h2>
                        <div className="text-[10px] font-black italic text-white/90 uppercase tracking-widest">结账清单</div>
                      </div>

                      {/* Items & Staff Amounts */}
                      <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-1">
                        {/* Service Title */}
                        <div className="space-y-2 group">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black italic text-white uppercase tracking-widest">项目</span>
                          </div>
                          
                          {/* Item Price Breakdown with Staff Colors */}
                          <div className="flex flex-col gap-3 pl-2 border-l border-white/5">
                            {mergedEvents.map((event, eventIdx) => {
                              const eventItems = event["服务项目"]?.split(',').map(s => s.trim()).filter(Boolean) || [];
                              const eventStaffId = event["背景颜色"]?.match(/bg-([a-z0-9-]+)/)?.[1] || 'sky'; // Try to extract staff from color if possible, but we'll use per-item if available
                              
                              return (
                                <div key={eventIdx} className="space-y-1">
                                  {eventItems.map((itemName, idx) => {
                                    const itemData = SERVICE_CATEGORIES.flatMap(c => c.items).find(i => i.name === itemName);
                                    if (!itemData) return null;
                                    
                                    // Parse item-specific staff if available in notes
                                    const escapedItem = escapeRegExp(itemName);
                                    const itemStaffMatch = event["备注"]?.match(new RegExp(`\\[${escapedItem}_STAFF:([^\\]]+)\\]`))
                                    
                                    // Fallback to STAFF_SEQ for Scheme A if available
                                    const seqMatch = event["备注"]?.match(/\[STAFF_SEQ:([^\]]+)\]/);
                                    const staffSeq = seqMatch ? seqMatch[1].split(',').filter(Boolean) : [];
                                    
                                    const itemStaffId = itemStaffMatch 
                                      ? itemStaffMatch[1] 
                                      : (staffSeq.length > 0 
                                          ? (staffSeq[idx] || staffSeq[staffSeq.length - 1])
                                          : (() => {
                                              // Fallback: try to extract staff ID from the event's background/border color
                                              const colorName = getCleanColorName(event["背景颜色"]);
                                              return (colorName && COLOR_TO_STAFF_ID[colorName]) || (eventIdx === mergedEvents.length - 1 ? selectedStaffId : undefined);
                                            })());
                                    
                                    const colorClass = getStaffColorClass(itemStaffId, staffMembers, 'text')
                                    const itemKey = `${eventIdx}-${itemName}`;

                                    return (
                                      <div key={idx} className="flex items-center justify-between group/item">
                                        <span className={cn("text-xs font-black italic", colorClass)}>{itemName}</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] font-black text-white italic">€</span>
                                          <input 
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={customItemPrices[itemKey] || itemData.price}
                                            onChange={(e) => {
                                              const newVal = e.target.value.replace(/[^0-9]/g, '');
                                              const oldVal = customItemPrices[itemKey] || itemData.price.toString();
                                              const diff = (Number(newVal) || 0) - (Number(oldVal) || 0);
                                              
                                              // Update item price
                                              setCustomItemPrices(prev => ({ ...prev, [itemKey]: newVal }));
                                              
                                              // Update assigned staff's amount if exists
                                              const staff = staffMembers.find(s => s.id === itemStaffId);
                                              if (staff && staff.id !== 'NO') {
                                                setStaffAmounts(prev => ({
                                                  ...prev,
                                                  [staff.name]: (Number(prev[staff.name] || 0) + diff).toString()
                                                }));
                                              }
                                            }}
                                             className="w-10 bg-transparent border-none rounded p-0 text-center focus:outline-none focus:ring-1 focus:ring-white/10 text-[10px] font-black italic text-white placeholder:text-zinc-800"
                                           />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="h-[1px] bg-white/5 w-full" />

                        {/* Staff Breakdown */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-[10px] font-black italic text-white uppercase tracking-widest">服务人员</div>
                          </div>
                          
                          {staffMembers
                            .filter(s => s.id !== 'NO' && (involvedStaffIds.includes(s.id) || staffAmounts[s.name] !== undefined))
                            .map((staff) => (
                              <div key={staff.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3 shadow-inner group hover:bg-white/10">
                                <div className="flex items-center gap-3">
                                  <div className={cn("w-2 h-2 rounded-full", staff.color || 'bg-white')} />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-white">{staff.name}</span>
                                    {staff.id === selectedStaffId && (
                                      <span className="text-[8px] font-black italic text-zinc-400 uppercase tracking-tighter">主服务人员</span>
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
                                    className="w-16 bg-transparent border-none rounded-lg py-1 text-center focus:outline-none focus:ring-1 focus:ring-white/10 text-sm font-black italic text-white placeholder:text-zinc-800"
                                  />
                                  <span className="text-xs font-black text-white italic">€</span>
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
                          <span className="text-[10px] font-black italic text-white uppercase tracking-widest">总金额</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-black text-white">€</span>
                            <span className="text-3xl font-black italic text-white">
                              {Object.values(staffAmounts).reduce((sum, val) => sum + (Number(val) || 0), 0) || 
                               Object.values(customItemPrices).reduce((sum, val) => sum + (Number(val) || 0), 0) || 
                               mergedTotalPrice}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : showMemberDetail && selectedMember ? (
                    <div className="space-y-6">
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
                              className="bg-transparent border-none text-lg font-black italic text-white focus:outline-none placeholder:text-zinc-800 flex-1 min-w-0"
                            />
                          </div>
                          <span className="text-[10px] text-white/60 font-black italic uppercase tracking-wider truncate">{selectedMember.level}</span>
                        </div>
                        <div className="text-right shrink-0 pt-1">
                          <div className="text-xl font-black text-white leading-none">€{selectedMember.totalSpend}</div>
                          <div className="text-[9px] text-white font-black italic uppercase tracking-widest mt-1">总消费</div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/5 rounded-xl p-3 space-y-1 shadow-inner">
                          <div className="text-xs font-black text-white">{selectedMember.totalVisits} 次</div>
                          <div className="text-[9px] text-white font-black italic uppercase tracking-widest">总消费次数</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 space-y-1 shadow-inner">
                          <div className="text-xs font-black text-white">
                            {isNewMember ? '0' : today ? Math.floor((today.getTime() - new Date(selectedMember.lastVisit).getTime()) / (1000 * 60 * 60 * 24)) : '...'} 天
                          </div>
                          <div className="text-[9px] text-white font-black italic uppercase tracking-widest">距离上次</div>
                        </div>
                      </div>

                      {/* Middle Section: Classification Tags or History */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-black italic text-white uppercase tracking-widest">
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
                                  "w-10 h-10 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-lg",
                                  tag.color
                                )}>
                                  {tag.label}
                                </div>
                                <span className="text-[8px] font-black italic text-zinc-400 group-hover:text-white uppercase tracking-tighter">
                                  {tag.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {selectedMember.history.map((item: MemberHistoryItem, idx: number) => (
                              <div key={idx} className="bg-white/5 rounded-xl p-3 flex items-center justify-between group hover:bg-white/10 shadow-inner">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black italic text-white/60">{item.date}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-400 font-black italic">{item.staff}</span>
                                  </div>
                                  <span className="text-xs font-black italic text-white group-hover:text-emerald-400">{item.service}</span>
                                </div>
                                <span className="text-sm font-black text-white">€{item.amount}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Notes Section */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black italic text-white uppercase tracking-widest">{I18N[lang].notes}</label>
                        <div className="bg-white/5 rounded-xl p-3 focus-within:ring-1 focus-within:ring-white/10 shadow-inner">
                          <input 
                            type="text"
                            placeholder={I18N[lang].notesPlaceholder}
                            value={memberNote}
                            onChange={(e) => {
                              setMemberNote(e.target.value)
                              setSelectedMember(prev => (prev ? { ...prev, note: e.target.value } : prev))
                            }}
                            className="w-full bg-transparent border-none text-xs text-white font-black italic focus:outline-none placeholder:text-zinc-600"
                          />
                        </div>
                      </div>
                    </div>
                  ) : showTimeSelection ? (
                    <div className="space-y-8">
                      {/* Title Section */}
                      <div className="flex flex-col items-center justify-center mb-6 space-y-1.5">
                        <h2 className="text-sm md:text-base font-black italic tracking-[0.2em] text-white whitespace-nowrap">SELECT {timeSelectionType === 'start' ? 'START' : 'END'} TIME</h2>
                      </div>

                      {/* Hour Selection Grid */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="h-[1px] flex-1 bg-white/10" />
                          <span className="text-[10px] font-black italic tracking-widest text-white uppercase">Select Hour</span>
                          <div className="h-[1px] flex-1 bg-white/10" />
                        </div>
                        <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
                          {Array.from({ length: 13 }, (_, i) => i + 8).map((hour) => {
                            const isSelected = (timeSelectionType === 'start' ? selectedDate : selectedEndDate)?.getHours() === hour;
                            return (
                              <button
                                key={hour}
                                type="button"
                                onClick={() => {
                                  const baseDate = timeSelectionType === 'start' ? selectedDate : selectedEndDate;
                                  if (!baseDate) return;
                                  const newDate = new Date(baseDate);
                                  newDate.setHours(hour);
                                  if (timeSelectionType === 'start') {
                                    setSelectedDate(newDate);
                                    if (selectedEndDate && newDate >= selectedEndDate) {
                                      setSelectedEndDate(addMinutes(newDate, duration));
                                    }
                                  } else {
                                    setSelectedEndDate(newDate);
                                    if (selectedDate) {
                                      setDuration(Math.max(15, (newDate.getTime() - selectedDate.getTime()) / 60000));
                                    }
                                  }
                                }}
                                className={cn(
                                  "py-2.5 rounded-xl text-xs font-black italic transition-all shadow-inner",
                                  isSelected 
                                    ? "bg-white text-zinc-950 shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105 z-10" 
                                    : "bg-white/5 text-white hover:bg-white/10 hover:text-white"
                                )}
                              >
                                {hour.toString().padStart(2, '0')}:00
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Minute Selection Grid */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="h-[1px] flex-1 bg-white/10" />
                          <span className="text-[10px] font-black italic tracking-widest text-white uppercase">Select Minute</span>
                          <div className="h-[1px] flex-1 bg-white/10" />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[0, 15, 30, 45].map((minute) => {
                            const isSelected = (timeSelectionType === 'start' ? selectedDate : selectedEndDate)?.getMinutes() === minute;
                            return (
                              <button
                                key={minute}
                                type="button"
                                onClick={() => {
                                  const baseDate = timeSelectionType === 'start' ? selectedDate : selectedEndDate;
                                  if (!baseDate) return;
                                  const newDate = new Date(baseDate);
                                  newDate.setMinutes(minute);
                                  if (timeSelectionType === 'start') {
                                    setSelectedDate(newDate);
                                    if (selectedEndDate && newDate >= selectedEndDate) {
                                      setSelectedEndDate(addMinutes(newDate, duration));
                                    }
                                  } else {
                                    setSelectedEndDate(newDate);
                                    if (selectedDate) {
                                      setDuration(Math.max(15, (newDate.getTime() - selectedDate.getTime()) / 60000));
                                    }
                                  }
                                }}
                                className={cn(
                                  "py-2.5 rounded-xl text-xs font-black italic transition-all shadow-inner",
                                  isSelected 
                                    ? "bg-white text-zinc-950 shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105 z-10" 
                                    : "bg-white/5 text-white hover:bg-white/10 hover:text-white"
                                )}
                              >
                                {minute.toString().padStart(2, '0')}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : showServiceSelection ? (
                    <div className="space-y-6">
                      {/* Title Section - Centered (Matching Left) */}
                      <div className="flex flex-col items-center justify-center mb-6 space-y-1.5">
                        <h2 className="text-xl font-black italic tracking-[0.4em] text-white">FX ESTETICA</h2>
                      </div>

                      {/* Service Categories - 4 Columns */}
                      <div className="grid grid-cols-4 gap-2">
                        {SERVICE_CATEGORIES.map((category) => {
                          const isSelected = newTitle.split(',').map(s => s.trim()).includes(category.title)
                          return (
                          <div key={category.title} className="space-y-2">
                            <div 
                              onClick={() => toggleService(category.title)}
                              className={cn(
                                "aspect-[1.8/1] rounded-xl bg-gradient-to-br border-none flex flex-col items-center justify-center p-1.5 group cursor-pointer shadow-inner relative overflow-hidden",
                                category.color,
                                isSelected ? "ring-2 ring-white/50 shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "hover:bg-white/10"
                              )}
                            >
                              {isSelected && (
                                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                              )}
                              <h4 className={cn(
                                "text-[9px] font-black italic tracking-widest uppercase",
                                isSelected ? "text-white" : "text-white/60"
                              )}>
                                {category.title}
                              </h4>
                              <div className={cn(
                                "mt-1 h-[1px]",
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
                                    "w-full py-1.5 px-2 rounded-lg text-[10px] font-black italic shadow-inner",
                                    isItemSeleted 
                                      ? `${getStaffColorClass(itemStaffId, staffMembers).replace('-500', '-400')} bg-white/20 ring-1 ring-white/30`
                                      : "bg-white/5 text-white hover:bg-white/10 hover:text-white"
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
                        "px-6 py-3 bg-transparent rounded-xl font-black italic disabled:opacity-50 flex items-center justify-center gap-2 text-sm hover:bg-white/5 whitespace-nowrap",
                        "bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_auto] bg-clip-text text-transparent",
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
                          "px-6 py-3 bg-transparent rounded-xl font-black italic disabled:opacity-50 flex items-center justify-center gap-2 text-sm hover:bg-white/5 whitespace-nowrap",
                          "bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_auto] bg-clip-text text-transparent",
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
                          "px-6 py-3 bg-transparent rounded-xl font-black italic disabled:opacity-50 flex items-center justify-center gap-2 text-sm hover:bg-white/5 whitespace-nowrap",
                          "bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_auto] bg-clip-text text-transparent",
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
                        setShowCheckoutPreview(true)
                      } else {
                        handleSubmit(new Event('submit') as any, 'parallel')
                      }
                    }}
                    className={cn(
                      "px-6 py-3 bg-transparent rounded-xl font-black italic disabled:opacity-50 flex items-center justify-center gap-2 text-sm hover:bg-white/5 whitespace-nowrap",
                      "bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_auto] bg-clip-text text-transparent",
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
                        "px-6 py-3 bg-transparent rounded-xl font-black italic disabled:opacity-50 flex items-center justify-center gap-2 text-sm hover:bg-white/5 whitespace-nowrap",
                        "bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_auto] bg-clip-text text-transparent",
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
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60"
          onClick={() => setIsStaffManagerOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black italic tracking-widest text-white uppercase">管理服务人员</h3>
              <button onClick={() => setIsStaffManagerOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Add Staff */}
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="新员工姓名..."
                  className="flex-1 bg-white/5 border-none rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white/20 text-xs"
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
                  className="px-4 py-2 bg-white text-black rounded-xl text-xs font-black hover:bg-zinc-200"
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
                      "relative flex items-center justify-between p-3 bg-white/5 rounded-2xl group hover:bg-white/10",
                      staff.id !== 'NO' ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                      draggedIndex === index && "opacity-50 border-2 border-white/20",
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
                          "w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg shrink-0",
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
                            "p-2",
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
                          className="p-2 text-rose-500/30 hover:text-rose-500"
                          title="删除员工"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Color Picker Popup */}
                    {activeColorPickerStaffId === staff.id && (
                      <div className="absolute left-14 top-0 z-[120] w-48 p-3 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl">
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
                                "w-6 h-6 rounded-full",
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
