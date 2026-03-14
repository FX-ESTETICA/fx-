import React from 'react'
import { cn } from '@/lib/utils'

import { ViewType } from '@/utils/calendar-constants'

interface BigDateDisplayProps {
  date: Date
  viewType: ViewType
  className?: string
  monthSuffix?: string
}

/**
 * 原子组件：日历顶部的大日期显示
 * 显示年份或月份的大数字
 */
export const BigDateDisplay: React.FC<BigDateDisplayProps> = ({
  date,
  viewType,
  className,
  monthSuffix = "月"
}) => {
  if (viewType !== 'year' && viewType !== 'month') return null;

  const value = viewType === 'year' 
    ? date.getFullYear().toString() 
    : (date.getMonth() + 1).toString().padStart(2, '0');

  return (
    <div className={cn("flex items-center gap-1 animate-in fade-in slide-in-from-left-4 duration-700", className)}>
      {[...value].map((ch, i) => (
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
          {monthSuffix}
        </span>
      )}
    </div>
  )
}
