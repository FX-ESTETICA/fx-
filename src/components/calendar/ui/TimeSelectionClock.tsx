'use client'

import React, { useEffect, useRef } from 'react'
import { useCalendarStore } from '../store/useCalendarStore'
import { TimeSelectionClock as AtomicClock } from '@/modules/core/components/TimeSelectionClock'

interface TimeSelectionClockProps {
  gestureTime: {
    h: number | null
    m: number | null
    p: 'AM' | 'PM' | null
  }
  activeHour: number | null
  setGestureTime: (newTime: Partial<{ h: number; m: number; p: 'AM' | 'PM' }>) => void
  setGestureRef: (ref: any) => void
}

export const TimeSelectionClock: React.FC<TimeSelectionClockProps> = ({
  gestureTime,
  activeHour,
  setGestureTime,
  setGestureRef
}) => {
  const localRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setGestureRef(localRef as any)
    return () => setGestureRef(null)
  }, [setGestureRef])

  return (
    <AtomicClock 
      time={gestureTime}
      activeHour={activeHour}
      onTimeChange={(newPart) => setGestureTime(newPart)}
      containerRef={localRef}
    />
  )
}
