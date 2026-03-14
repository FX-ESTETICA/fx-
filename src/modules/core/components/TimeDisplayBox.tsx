import React from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface TimeDisplayBoxProps {
  label: string
  date: Date | null
  isActive: boolean
  onClick: () => void
  hourSuffix?: string
  minuteSuffix?: string
  className?: string
}

/**
 * 原子组件：时间显示框
 * 适配移动端/平板的高频点击需求
 */
export const TimeDisplayBox: React.FC<TimeDisplayBoxProps> = ({
  label,
  date,
  isActive,
  onClick,
  hourSuffix = '时',
  minuteSuffix = '分',
  className
}) => {
  return (
    <div className={cn("space-y-1.5 antialiased", className)}>
      <label className="text-[9px] md:text-[10px] font-black italic text-white uppercase tracking-widest [text-shadow:0_1px_1px_rgba(0,0,0,0.8),0_0_0.5px_rgba(0,0,0,1)]">
        {label}
      </label>
      <div 
        className="cursor-pointer"
        onClick={onClick}
      >
        <div className={cn(
          "w-full bg-white/[0.01] border-none rounded-xl px-2 py-2.5 text-white text-xs text-center font-bold shadow-inner flex items-center justify-center gap-1",
          isActive ? "bg-white/20 ring-1 ring-white/30" : "hover:bg-white/10"
        )}>
          <span>{date ? format(date, 'HH') : '08'}{hourSuffix}</span>
          <span className="opacity-40">:</span>
          <span>{date ? format(date, 'mm') : '00'}{minuteSuffix}</span>
        </div>
      </div>
    </div>
  );
}
