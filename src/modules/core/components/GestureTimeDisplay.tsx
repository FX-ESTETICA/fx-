import React from 'react'
import { cn } from '@/lib/utils'

interface GestureTimeDisplayProps {
  h: number
  m: number
  p: 'AM' | 'PM' | null
  isGesturing: boolean
  onPeriodChange: (p: 'AM' | 'PM') => void
  hourLabel?: string
  minuteLabel?: string
  className?: string
}

/**
 * 原子组件：手势选择时间时的中间显示部分
 * 纯视图逻辑，不依赖外部 store
 */
export const GestureTimeDisplay: React.FC<GestureTimeDisplayProps> = ({
  h,
  m,
  p,
  isGesturing,
  onPeriodChange,
  hourLabel = 'HOUR',
  minuteLabel = 'MIN',
  className
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center space-y-6", className)}>
      <div className="relative group">
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-7xl font-black italic text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)]">
              {h.toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] font-black italic text-white/20 uppercase tracking-[0.2em] mt-2">{hourLabel}</span>
          </div>
          <span className="text-5xl font-black italic text-white/20 mb-6">:</span>
          <div className="flex flex-col items-center">
            <span className="text-7xl font-black italic text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)]">
              {m.toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] font-black italic text-white/20 uppercase tracking-[0.2em] mt-2">{minuteLabel}</span>
          </div>
          <div className="flex flex-col gap-2 ml-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPeriodChange('AM');
              }}
              className={cn(
                "px-3 py-0.5 rounded-full text-[10px] font-black italic transition-all",
                p === 'AM' ? "bg-white text-zinc-950" : "text-white/40"
              )}
            >
              AM
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPeriodChange('PM');
              }}
              className={cn(
                "px-3 py-0.5 rounded-full text-[10px] font-black italic transition-all",
                p === 'PM' ? "bg-white text-zinc-950" : "text-white/40"
              )}
            >
              PM
            </button>
          </div>
        </div>

        {/* Directional Guides (Faint) */}
        {isGesturing && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-white/20 uppercase italic">00</div>
            <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 uppercase italic">15</div>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-white/20 uppercase italic">30</div>
            <div className="absolute left-8 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 uppercase italic">45</div>
          </div>
        )}
      </div>
    </div>
  )
}
