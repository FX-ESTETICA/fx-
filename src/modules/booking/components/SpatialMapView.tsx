'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { CalendarEvent, StaffMember } from '@/utils/calendar-constants'

interface SpatialMapViewProps {
  mode: 'admin' | 'customer'
  lang: 'zh' | 'it'
  currentDate: Date
  events: CalendarEvent[]
  staffMembers: StaffMember[]
  onEventClick: (event: CalendarEvent) => void
  onGridClick: (e: React.MouseEvent, date: Date, staffId?: string) => void
}

/**
 * 空间地图视图 (针对餐饮/桌位)
 * 未来将支持 3D 渲染和桌位状态实时同步
 */
export const SpatialMapView: React.FC<SpatialMapViewProps> = ({
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
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-50" />
      
      <div className="z-10 text-center p-8">
        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/30 group-hover:scale-110 transition-transform duration-500">
          <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">空间地图视图 (3D Spatial Map)</h3>
        <p className="text-zinc-400 text-sm max-w-md mx-auto">
          正在为您的 {lang === 'zh' ? '餐厅' : 'Restaurant'} 加载空间布局。支持桌位预订、排号管理及 3D 实时环境快照。
        </p>
      </div>

      {/* Placeholder for table layout */}
      <div className="z-10 mt-8 grid grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-16 h-16 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center hover:bg-blue-500/20 hover:border-blue-500/50 cursor-pointer transition-all">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">T{i + 1}</span>
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 text-[10px] font-bold text-zinc-600 tracking-widest uppercase">
        Omni-Flow Spatial Engine v1.0
      </div>
    </div>
  )
}
