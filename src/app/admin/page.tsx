'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Calendar from '@/components/Calendar'
import { ViewType } from '@/utils/calendar-constants'
import Sidebar from '@/components/Sidebar'
import PerformanceReport from '@/components/PerformanceReport'
import AISmartBall from '@/components/AISmartBall'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [calendarView, setCalendarView] = useState<ViewType>('day')
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [isResizing, setIsResizing] = useState(false)
  const [bgIndex, setBgIndex] = useState(0)
  const [lang, setLang] = useState<'zh' | 'it'>('zh')
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
        return
      }
      
      const role = session.user.user_metadata?.role
      if (role !== 'merchant') {
        alert('权限不足，仅限商家访问')
        router.push('/me')
        return
      }
      
      setIsAuthorized(true)
    }
    
    checkAuth()
  }, [router])

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
      const newWidth = e.clientX
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth)
      }
    }
  }, [isResizing])

  useEffect(() => {
    if (isModalOpen || isReportOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isModalOpen, isReportOpen])

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

  if (!isAuthorized) {
    return (
      <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="h-screen w-screen bg-zinc-950 flex flex-row overflow-hidden p-0.5 relative">
      {/* Global Background Image */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${backgrounds[bgIndex]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: (isModalOpen || isReportOpen) ? 0.5 : 1
        }}
      />

      {/* Left Sidebar Container */}
      <div 
        style={{ width: isSidebarVisible ? `${sidebarWidth}px` : '0px' }}
        className={cn(
          "h-full overflow-hidden shrink-0 relative z-10",
          !isSidebarVisible && "pointer-events-none",
          (isModalOpen || isReportOpen) && "opacity-0 pointer-events-none"
        )}
      >
        <div className="h-full w-full bg-black/0 backdrop-blur-none overflow-hidden">
          <Sidebar 
            onDateSelect={handleDateSelect} 
            onLogoClick={cycleBackground} 
            onBrandClick={toggleLanguage} 
            onClockClick={() => setIsReportOpen(true)}
            onSwipeLeft={() => setIsSidebarVisible(false)}
            lang={lang} 
          />
        </div>
      </div>

      {/* Resize Handle */}
      {isSidebarVisible && (
        <div
          onMouseDown={startResizing}
          className={cn(
            "w-1 h-full cursor-col-resize hover:bg-white/10 shrink-0 z-20",
            isResizing && "bg-white/10",
            (isModalOpen || isReportOpen) && "opacity-0 pointer-events-none"
          )}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden z-30">
        <div className={cn(
          "flex-1 min-h-0 bg-black/0 backdrop-blur-none overflow-hidden",
          isReportOpen && "opacity-0 pointer-events-none border-none shadow-none"
        )}>
          <Calendar 
            initialDate={calendarDate} 
            initialView={calendarView} 
            onToggleSidebar={toggleSidebar}
            onModalToggle={setIsModalOpen}
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

      {/* AI Smart Ball (Visual Only for now) */}
      <AISmartBall 
        className="bottom-8 right-8" 
        withChat={false} 
        disabled={true} 
      />
    </main>
  )
}
