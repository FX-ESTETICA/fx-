'use client'

import React, { useState, useEffect } from 'react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay 
} from 'date-fns'
import { zhCN, it as itLocale } from 'date-fns/locale'
import { cn } from '@/lib/utils'
// removed unused Clock icon

interface SidebarProps {
  onDateSelect?: (date: Date) => void;
  onLogoClick?: () => void;
  onBrandClick?: () => void;
  onClockClick?: () => void;
  lang?: 'zh' | 'it';
}

export default function Sidebar({ 
  onDateSelect, 
  onLogoClick, 
  onBrandClick, 
  onClockClick,
  lang = 'zh' 
}: SidebarProps) {
  const [now, setNow] = useState(new Date())

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Mini Calendar logic
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const locale = lang === 'zh' ? zhCN : itLocale
  const weekdayLabels = lang === 'zh' 
    ? ['一','二','三','四','五','六','日']
    : ['L','M','M','G','V','S','D']

  return (
    <div className="flex flex-col h-full bg-transparent p-4 md:p-6 overflow-hidden">
      {/* Logo Section - Reduced padding and size for better zoom fit */}
      <div className="flex flex-col items-center justify-center py-2 md:py-4 shrink-0">
        <div 
          onClick={onLogoClick}
          className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-2xl flex items-center justify-center mb-2 md:mb-3 shadow-[0_0_20px_rgba(255,255,255,0.15)] cursor-pointer hover:scale-105 active:scale-95 transition-all"
        >
          <span className="text-black font-black text-xl md:text-2xl tracking-tighter">FX</span>
        </div>
        <h1 onClick={onBrandClick} className="text-lg md:text-xl font-black tracking-[0.2em] text-white cursor-pointer hover:scale-105 transition-transform">
          ESTETICA
        </h1>
        <div className="h-1 w-8 bg-indigo-600 rounded-full mt-2" />
      </div>

      {/* Mini Calendar Section - More compact gaps */}
      <div className="flex-1 space-y-3 md:space-y-4 min-h-fit">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
            {lang === 'zh' ? format(now, 'yyyy年 MMMM', { locale }) : format(now, 'MMMM yyyy', { locale })}
          </h3>
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {weekdayLabels.map((d, i) => (
            <div key={i} className="text-[10px] font-black text-zinc-600 text-center py-1">
              {d}
            </div>
          ))}
          {days.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, monthStart)
            const isToday = isSameDay(day, new Date())
            return (
              <button 
                key={i} 
                onClick={() => onDateSelect?.(day)}
                className={cn(
                  "text-[11px] font-medium h-8 w-8 flex items-center justify-center rounded-lg transition-all",
                  isToday ? "bg-white text-black font-bold shadow-lg shadow-white/10" : 
                  (isCurrentMonth ? "text-zinc-300 hover:bg-zinc-900" : "text-zinc-700")
                )}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>
      </div>

      {/* Digital Clock Section - Transparent background */}
      <div 
        onClick={onClockClick}
        className="mt-auto py-4 md:py-6 shrink-0 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform"
      >
        <div className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white font-mono">
          {format(now, 'HH:mm')}
        </div>
      </div>
    </div>
  )
}
