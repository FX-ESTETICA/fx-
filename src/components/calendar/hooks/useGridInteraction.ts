'use client'

import { useCallback } from 'react'
import { 
  format, 
  startOfDay,
  setHours,
  setMinutes,
  addMinutes
} from 'date-fns'
import { useCalendarStore } from '../store/useCalendarStore'
import { 
  HOUR_HEIGHT, 
  SLOT_INTERVAL,
  MINUTE_HEIGHT
} from '../calendar-constants'

interface UseGridInteractionProps {
  mode: 'admin' | 'customer'
  isCalendarLocked: boolean
}

export function useGridInteraction({ mode, isCalendarLocked }: UseGridInteractionProps) {
  const {
    duration,
    setSelectedDate,
    setSelectedEndDate,
    setSelectedStaffId,
    setIsModalOpen,
    setHoverTime
  } = useCalendarStore()

  const handleGridClick = useCallback((e: React.MouseEvent, date: Date, staffId?: string) => {
    if (mode === 'customer' || isCalendarLocked) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // Assuming 1rem = 16px (standard)
    const pixelsPerMinute = (HOUR_HEIGHT * 16) / 60;
    const minutes = Math.floor(y / pixelsPerMinute);
    const roundedMinutes = Math.floor(minutes / SLOT_INTERVAL) * SLOT_INTERVAL;
    
    const clickTime = setMinutes(setHours(startOfDay(date), 8), roundedMinutes);
    
    setSelectedDate(clickTime);
    setSelectedEndDate(addMinutes(clickTime, duration));
    if (staffId) setSelectedStaffId(staffId);
    
    setIsModalOpen(true);
  }, [mode, isCalendarLocked, duration, setSelectedDate, setSelectedEndDate, setSelectedStaffId, setIsModalOpen]);

  const handleGridMouseMove = useCallback((e: React.MouseEvent, date: Date, staffId?: string) => {
    if (mode === 'customer' || isCalendarLocked) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pixelsPerMinute = (HOUR_HEIGHT * 16) / 60;
    const minutes = Math.floor(y / pixelsPerMinute);
    const roundedMinutes = Math.floor(minutes / SLOT_INTERVAL) * SLOT_INTERVAL;
    
    const time = format(setMinutes(setHours(startOfDay(date), 8), roundedMinutes), 'HH:mm');
    setHoverTime({ date, staffId, time, top: roundedMinutes * MINUTE_HEIGHT });
  }, [mode, isCalendarLocked, setHoverTime]);

  return {
    handleGridClick,
    handleGridMouseMove
  };
}
