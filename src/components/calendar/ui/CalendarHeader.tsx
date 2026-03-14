import React from 'react'
import { ShieldCheck } from 'lucide-react'
import { ViewType, APP_VERSION } from '@/utils/calendar-constants'
import { cn } from '@/lib/utils'
import { CalendarNavigation } from '@/modules/core/components/CalendarNavigation'
import { BigDateDisplay } from '@/modules/core/components/BigDateDisplay'

interface CalendarHeaderProps {
  mode: 'admin' | 'customer'
  lang: 'zh' | 'it'
  currentDate: Date
  setCurrentDate: (date: Date) => void
  viewType: ViewType
  setViewType: (view: ViewType) => void
  isAuthorized: boolean
  isCalendarLocked: boolean
  isModalOpen: boolean
  setShowRecycleBin: (show: boolean) => void
  navigate: (direction: 'prev' | 'next') => void
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({ 
  mode, 
  lang,
  currentDate,
  setCurrentDate,
  viewType,
  setViewType,
  isAuthorized,
  isCalendarLocked,
  isModalOpen,
  setShowRecycleBin,
  navigate
}) => {
  const handleNext = () => navigate('next')
  const handlePrev = () => navigate('prev')

  return (
    <>
      {!isAuthorized && (
        <div className="absolute inset-0 z-[9999] bg-zinc-950/90 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
          <div className="w-20 h-20 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center mb-6 animate-pulse">
            <ShieldCheck className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black italic text-white mb-2 tracking-widest uppercase" style={{ fontFamily: 'var(--font-orbitron)' }}>
            系统已锁定
          </h2>
          <p className="text-zinc-400 text-sm max-w-xs font-medium leading-relaxed">
            当前版本 ({APP_VERSION}) 授权已过期或未激活。请联系管理员获取最新授权。
          </p>
          <div className="mt-8 flex gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-full bg-white text-black text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
            >
              重试校验
            </button>
          </div>
          <div className="absolute bottom-8 text-[10px] font-bold text-zinc-600 tracking-[0.3em] uppercase">
            FX-Rapallo 安全保护系统
          </div>
        </div>
      )}
      
      <div className={cn(
        "relative flex items-center justify-center px-2 md:px-4 lg:px-6 bg-transparent z-20 overflow-hidden max-h-[100px] py-1 md:py-1.5", 
        isModalOpen ? "opacity-0 pointer-events-none" : "opacity-100",
        isCalendarLocked && "pointer-events-none"
      )}>
        {/* Year/Month Display Positioned Left */}
        <BigDateDisplay 
          date={currentDate} 
          viewType={viewType} 
          className="absolute left-12 md:left-24 lg:left-32"
          monthSuffix={lang === 'zh' ? '月' : ''}
        />

        <CalendarNavigation 
          viewType={viewType}
          onViewTypeChange={(type) => {
            setViewType(type)
            if (type === 'day') {
              setCurrentDate(new Date())
            }
          }}
          onPrev={handlePrev}
          onNext={handleNext}
          showRecycleBin={mode === 'admin'}
          onRecycleBinOpen={() => setShowRecycleBin(true)}
        />
      </div>
    </>
  )
}
