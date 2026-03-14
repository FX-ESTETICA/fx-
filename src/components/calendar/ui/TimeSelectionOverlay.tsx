import React from 'react'
import { useCalendarStore } from '../store/useCalendarStore'
import { cn } from '@/lib/utils'
import { GestureTimeDisplay } from '@/modules/core/components/GestureTimeDisplay'

export const TimeSelectionOverlay: React.FC = () => {
  const { 
    gestureTime, 
    setGestureTime,
    isGesturing 
  } = useCalendarStore()

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in fade-in zoom-in duration-300">
      <GestureTimeDisplay 
        h={gestureTime.h ?? 0}
        m={gestureTime.m ?? 0}
        p={gestureTime.p}
        isGesturing={isGesturing}
        onPeriodChange={(p) => setGestureTime(prev => ({ ...prev, p }))}
      />
    </div>
  )
}
