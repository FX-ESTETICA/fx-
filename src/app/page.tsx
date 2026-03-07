'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Calendar, { ViewType } from '@/components/Calendar'
import Sidebar from '@/components/Sidebar'
import PerformanceReport from '@/components/PerformanceReport'
import { cn } from '@/lib/utils'

export default function Home() {
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [calendarView, setCalendarView] = useState<ViewType>('day')
  const [isSidebarVisible, setIsSidebarVisible] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [isResizing, setIsResizing] = useState(false)
  const [bgIndex, setBgIndex] = useState(0)
  const [lang, setLang] = useState<'zh' | 'it'>('zh')
  const [isReportOpen, setIsReportOpen] = useState(false)
  
  const backgrounds = [
    '/wallhaven-eo68l8.jpg',
    '/wallhaven-47je19.jpg',
    '/wallhaven-qr3o8q.png',
    '/wallhaven-xe75wv.png',
    '/屏幕截图 2026-03-07 003239.png',
    '/屏幕截图 2026-03-05 220507.png',
    '/屏幕截图 2026-03-05 220415.png'
  ].map(encodeURI)

  const cycleBackground = () => {
    setBgIndex(prev => (prev + 1) % backgrounds.length)
  }
  const toggleLanguage = () => {
    setLang(prev => (prev === 'zh' ? 'it' : 'zh'))
  }

  const handleDateSelect = (date: Date) => {
    setCalendarDate(date)
    setCalendarView('day')
  }

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible)
  }

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      // Calculate new width based on mouse position
      // The container has some padding/gap, but let's keep it simple for now
      const newWidth = e.clientX
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth)
      }
    }
  }, [isResizing])

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize)
      window.addEventListener('mouseup', stopResizing)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }

    return () => {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
  }, [isResizing, resize, stopResizing])

  return (
    <main className="h-screen w-screen bg-zinc-950 flex flex-row overflow-hidden p-0.5 relative">
      {/* Global Background Image */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${backgrounds[bgIndex]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 1
        }}
      />

      {/* Left Sidebar Container */}
      <div 
        style={{ width: isSidebarVisible ? `${sidebarWidth}px` : '0px' }}
        className={cn(
          "h-full overflow-hidden transition-[width] duration-300 ease-in-out shrink-0 relative z-10",
          !isSidebarVisible && "pointer-events-none"
        )}
      >
        <div className="h-full w-full bg-black/0 backdrop-blur-none border border-white/5 rounded-xl md:rounded-2xl overflow-hidden shadow-2xl">
          <Sidebar 
            onDateSelect={handleDateSelect} 
            onLogoClick={cycleBackground} 
            onBrandClick={toggleLanguage} 
            onClockClick={() => setIsReportOpen(true)}
            lang={lang} 
          />
        </div>
      </div>

      {/* Resize Handle */}
      {isSidebarVisible && (
        <div
          onMouseDown={startResizing}
          className={cn(
            "w-1 h-full cursor-col-resize hover:bg-white/10 transition-colors shrink-0 z-20",
            isResizing && "bg-white/10"
          )}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden z-10">
        <div className="flex-1 min-h-0 bg-black/0 backdrop-blur-none rounded-xl md:rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
          <Calendar 
            initialDate={calendarDate} 
            initialView={calendarView} 
            onToggleSidebar={toggleSidebar}
            bgIndex={bgIndex}
            lang={lang}
          />
        </div>
      </div>

      {/* Performance Report Modal */}
      <PerformanceReport 
        isOpen={isReportOpen} 
        onClose={() => setIsReportOpen(false)} 
        lang={lang}
      />
    </main>
  )
}
