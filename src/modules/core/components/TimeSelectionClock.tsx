import React, { useRef } from 'react'
import { cn } from '@/lib/utils'

interface TimeSelectionClockProps {
  time: {
    h: number | null
    m: number | null
    p: 'AM' | 'PM' | null
  }
  activeHour: number | null
  onTimeChange: (newTime: Partial<{ h: number; m: number; p: 'AM' | 'PM' }>) => void
  containerRef?: React.RefObject<HTMLDivElement | null>
  className?: string
}

/**
 * 原子组件：一笔画时间选择器 (钟表样式)
 * 专为高频预约设计的交互零件
 */
export const TimeSelectionClock: React.FC<TimeSelectionClockProps> = ({
  time,
  activeHour,
  onTimeChange,
  containerRef,
  className
}) => {
  return (
    <div className={cn("flex items-center justify-center py-4", className)}>
      <div 
        ref={containerRef}
        className="relative w-[300px] h-[300px] rounded-full border border-white/10 select-none touch-none flex items-center justify-center"
      >
        {[...Array(12)].map((_, i) => {
          const hour = i + 1;
          const angle = (hour * 30 - 90) * (Math.PI / 180);
          const radius = 115;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const isActive = activeHour === hour;
          
          return (
            <div
              key={`hour-${hour}`}
              data-hour={hour}
              className={cn(
                "absolute w-11 h-11 rounded-full flex items-center justify-center text-lg font-black italic transition-all duration-200 pointer-events-none",
                isActive ? "bg-white text-zinc-950 scale-125 shadow-[0_0_20px_rgba(255,255,255,0.4)] z-10" : "text-white/60"
              )}
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              {hour}
            </div>
          );
        })}
        <div className="flex flex-col items-center justify-center bg-white/5 w-28 h-28 rounded-full border border-white/10">
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-black italic text-white leading-none">
              {time.h?.toString().padStart(2, '0') || '--'}
            </div>
            <div className="text-emerald-400 text-sm font-black italic">
              :{time.m?.toString().padStart(2, '0') || '--'}
            </div>
          </div>
          <div className="mt-2 flex items-center bg-white/10 rounded-full p-0.5">
            <button 
              type="button"
              onClick={() => onTimeChange({ p: 'AM' })}
              className={cn("px-3 py-0.5 rounded-full text-[10px] font-black italic transition-colors", time.p === 'AM' ? "bg-white text-zinc-950" : "text-white/40")}
            >AM</button>
            <button 
              type="button"
              onClick={() => onTimeChange({ p: 'PM' })}
              className={cn("px-3 py-0.5 rounded-full text-[10px] font-black italic transition-colors", time.p === 'PM' ? "bg-white text-zinc-950" : "text-white/40")}
            >PM</button>
          </div>
        </div>
      </div>
    </div>
  )
}
