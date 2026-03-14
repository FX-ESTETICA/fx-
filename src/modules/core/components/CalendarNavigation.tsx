import React from 'react'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

import { ViewType } from '@/utils/calendar-constants'

interface CalendarNavigationProps {
  viewType: ViewType
  onViewTypeChange: (type: ViewType) => void
  onPrev: () => void
  onNext: () => void
  onRecycleBinOpen?: () => void
  showRecycleBin?: boolean
  className?: string
  viewLabels?: Partial<Record<ViewType, string>>
}

/**
 * 原子组件：日历导航控制器
 * 包含前进、后退、视图切换和回收站入口
 */
export const CalendarNavigation: React.FC<CalendarNavigationProps> = ({
  viewType,
  onViewTypeChange,
  onPrev,
  onNext,
  onRecycleBinOpen,
  showRecycleBin = false,
  className,
  viewLabels = { day: '今', week: '周', month: '月', year: '年' }
}) => {
  return (
    <div className={cn("flex items-center gap-4 md:gap-6", className)}>
      <button 
        onClick={onPrev} 
        className="p-1.5 md:p-2 rounded-full bg-transparent border border-white/20 text-zinc-400/80 hover:text-white hover:bg-white/10 hover:border-white/40 transition-all"
      >
        <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      {(['day', 'week', 'month', 'year'] as ViewType[]).map((type) => {
        const isActive = viewType === type
        return (
          <button
            key={type}
            onClick={() => onViewTypeChange(type)}
            className={cn(
              "w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center text-xs md:text-sm font-black transition-all duration-300",
              isActive 
                ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-110 z-10 border-white/40" 
                : "bg-transparent border border-white/20 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/40"
            )}
            style={{ fontFamily: 'var(--font-noto-sans-sc)' }}
          >
            {viewLabels[type]}
          </button>
        )
      })}

      <button 
        onClick={onNext} 
        className="p-1.5 md:p-2 rounded-full bg-transparent border border-white/20 text-zinc-400/80 hover:text-white hover:bg-white/10 hover:border-white/40 transition-all"
      >
        <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      {showRecycleBin && onRecycleBinOpen && (
        <button 
          onClick={onRecycleBinOpen} 
          className="p-1.5 md:p-2 rounded-full bg-transparent border border-white/20 text-zinc-400/80 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/40 transition-all ml-2"
          title="回收站"
        >
          <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      )}
    </div>
  )
}
