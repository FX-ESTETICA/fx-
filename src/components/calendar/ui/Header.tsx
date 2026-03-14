import React from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Settings2, 
  RefreshCw, 
  Trash2, 
  Undo2 
} from 'lucide-react'
import { format } from 'date-fns'
import { zhCN, it as itLocale } from 'date-fns/locale'
import WeatherDisplay from './WeatherDisplay'
import { I18N, ViewType } from '@/utils/calendar-constants'
import { cn } from '@/lib/utils'

interface HeaderProps {
  lang: 'zh' | 'it'
  currentDate: Date
  setCurrentDate: (date: Date) => void
  viewType: ViewType
  setViewType: (view: ViewType) => void
  today: Date | null
  setIsStaffManagerOpen: (open: boolean) => void
  setShowRecycleBin: (show: boolean) => void
  onNavigate: (direction: 'prev' | 'next') => void
  fetchEvents: () => void
  fetchAllEventsForLibrary: () => void
}

export default function Header({ 
  lang,
  currentDate,
  setCurrentDate,
  viewType,
  setViewType,
  today,
  setIsStaffManagerOpen,
  setShowRecycleBin,
  onNavigate,
  fetchEvents,
  fetchAllEventsForLibrary
}: HeaderProps) {
  const handleNext = () => onNavigate('next')
  const handlePrev = () => onNavigate('prev')

  const cycleViewType = (view: ViewType) => {
    setViewType(view)
  }

  const locale = lang === 'zh' ? zhCN : itLocale
  const VIEW_LABELS: Record<ViewType, string> = I18N[lang].viewLabels

  return (
    <div className="flex flex-col gap-2 p-3 md:p-4 bg-black/40 backdrop-blur-md border-b border-white/5 sticky top-0 z-[1001]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 md:gap-3">
          <div className="flex items-center bg-white/5 rounded-xl p-0.5 border border-white/10 shadow-inner">
            <button onClick={handlePrev} className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg transition-all active:scale-95 text-zinc-400 hover:text-white">
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <div className="h-4 w-[1px] bg-white/10 mx-0.5" />
            <button onClick={handleNext} className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg transition-all active:scale-95 text-zinc-400 hover:text-white">
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
          
          <button 
            onClick={() => today && setCurrentDate(today)}
            className="px-2.5 md:px-4 py-1.5 md:py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] md:text-xs font-black tracking-widest text-zinc-300 hover:text-white transition-all active:scale-95 uppercase shadow-lg"
            style={{ fontFamily: 'var(--font-orbitron)' }}
          >
            {lang === 'zh' ? '今' : 'OGGI'}
          </button>

          <div className="hidden sm:block">
            <WeatherDisplay />
          </div>
        </div>

        <div className="flex flex-col items-center">
          <h1 className="text-sm md:text-lg font-black tracking-tighter text-white drop-shadow-2xl flex items-center gap-2 select-none" style={{ fontFamily: 'var(--font-orbitron)' }}>
            <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              {format(currentDate, viewType === 'month' ? 'MMMM yyyy' : 'yyyy', { locale })}
            </span>
            {viewType !== 'month' && viewType !== 'year' && (
              <span className="text-zinc-500 font-medium tracking-normal">/</span>
            )}
            {viewType !== 'month' && viewType !== 'year' && (
              <span className="text-white opacity-90">{format(currentDate, 'MMMM', { locale })}</span>
            )}
          </h1>
          {viewType === 'day' && (
            <div className="text-[10px] md:text-xs font-bold text-zinc-500 tracking-[0.2em] uppercase mt-0.5" style={{ fontFamily: 'var(--font-orbitron)' }}>
              {format(currentDate, 'EEEE d', { locale })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:gap-3">
          <div className="hidden md:flex items-center bg-white/5 rounded-xl p-0.5 border border-white/10">
            {(['day', 'week', 'month', 'year', 'nebula', 'ai_review'] as ViewType[]).map((v) => (
              <button
                key={v}
                onClick={() => cycleViewType(v)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all uppercase",
                  viewType === v 
                    ? "bg-white/10 text-white shadow-lg" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
                style={{ fontFamily: 'var(--font-orbitron)' }}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={() => { fetchEvents(); fetchAllEventsForLibrary(); }}
              className="p-1.5 md:p-2 bg-white/5 hover:bg-zinc-800/80 text-zinc-400 hover:text-emerald-400 rounded-xl border border-white/5 transition-all active:rotate-180"
            >
              <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button 
              onClick={() => setShowRecycleBin(true)}
              className="p-1.5 md:p-2 bg-white/5 hover:bg-zinc-800/80 text-zinc-400 hover:text-rose-400 rounded-xl border border-white/5 transition-all"
            >
              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button 
              onClick={() => setIsStaffManagerOpen(true)}
              className="p-1.5 md:p-2 bg-white/5 hover:bg-zinc-800/80 text-zinc-400 hover:text-white rounded-xl border border-white/5 transition-all"
            >
              <Settings2 className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
