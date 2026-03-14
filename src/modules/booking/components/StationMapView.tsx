'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { CalendarEvent, StaffMember } from '@/utils/calendar-constants'

interface StationMapViewProps {
  mode: 'admin' | 'customer'
  lang: 'zh' | 'it'
  currentDate: Date
  events: CalendarEvent[]
  staffMembers: StaffMember[]
  onEventClick: (event: CalendarEvent) => void
  onGridClick: (e: React.MouseEvent, date: Date, staffId?: string) => void
}

/**
 * 工位视图 (针对洗车/维修)
 * 支持多资源排期：工位 + 技师 + 备件
 */
export const StationMapView: React.FC<StationMapViewProps> = ({
  mode,
  lang,
  currentDate,
  events,
  staffMembers,
  onEventClick,
  onGridClick
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900/50 rounded-3xl border border-white/5 m-4 overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 opacity-50" />
      
      <div className="z-10 text-center p-8">
        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/30 group-hover:scale-110 transition-transform duration-500">
          <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">工位视图 (Station Map)</h3>
        <p className="text-zinc-400 text-sm max-w-md mx-auto">
          正在为您的 {lang === 'zh' ? '洗车店' : 'Car Wash'} 加载工位资源。支持动态派单、物料追踪及多工位并行调度。
        </p>
      </div>

      {/* Placeholder for station layout */}
      <div className="z-10 mt-8 grid grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-32 h-40 rounded-2xl border border-white/10 bg-white/5 flex flex-col items-center justify-center hover:bg-amber-500/20 hover:border-amber-500/50 cursor-pointer transition-all p-4">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-4">
               <span className="text-[10px] font-bold text-zinc-500">BAY {i + 1}</span>
            </div>
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
               <div className="w-1/2 h-full bg-amber-500" />
            </div>
            <span className="text-[10px] font-bold text-zinc-600 mt-4 uppercase">50% LOAD</span>
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 text-[10px] font-bold text-zinc-600 tracking-widest uppercase">
        Omni-Flow Station Engine v1.0
      </div>
    </div>
  )
}
