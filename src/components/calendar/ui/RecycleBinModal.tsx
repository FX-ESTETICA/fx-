import React from 'react'
import { Trash2, X, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_VERSION } from '@/utils/calendar-constants'

import { CalendarEvent } from '@/utils/calendar-constants'

interface RecycleBinModalProps {
  showRecycleBin: boolean
  setShowRecycleBin: (show: boolean) => void
  deletedEvents: CalendarEvent[]
  handleRestoreEvent: (event: CalendarEvent) => Promise<void>
  handlePermanentDelete: (id: string) => Promise<void>
}

export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({
  showRecycleBin,
  setShowRecycleBin,
  deletedEvents,
  handleRestoreEvent,
  handlePermanentDelete
}) => {
  if (!showRecycleBin) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-transparent backdrop-blur-sm">
      <div 
        className="w-full max-w-xl bg-transparent border border-white/20 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/10 flex items-center justify-between bg-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <Trash2 className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h3 className="text-lg font-black italic tracking-widest text-white uppercase">回收站</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">仅保留最近 3 天删除的预约</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setShowRecycleBin(false)} 
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {deletedEvents.length > 0 ? (
            deletedEvents.map((event) => {
              // --- 建立 context_snapshot 标准，清理 notes 中的所有正则逻辑 ---
              const snapshot = event.context_snapshot || {};
              let deletionTime = snapshot.deleted_at;
              
              // 降级方案：旧数据正则匹配
              if (!deletionTime) {
                const notes = event.notes || '';
                const deletedAtMatch = notes.match(/\[DELETED_AT:(.*?)\]/);
                deletionTime = deletedAtMatch ? deletedAtMatch[1] : '未知';
              }
              
              return (
                <div 
                  key={event.id}
                  className="group relative flex flex-col p-5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-3xl transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Event Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                            event.bg_color || "bg-zinc-500/20 text-zinc-400"
                          )}>
                            {event.service_item || "未命名项目"}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            {event.service_date} {event.start_time}
                          </span>
                        </div>
                        <div className="text-sm font-black italic text-white tracking-wide">
                          {event.customer_name ? `${event.customer_name} (${event.customer_id})` : (event.customer_id || "匿名客户")}
                        </div>
                      </div>

                      {/* Deletion Info */}
                      <div className="flex items-center gap-2 text-[10px] font-bold text-rose-500/60 uppercase tracking-widest">
                        <Trash2 className="w-3 h-3" />
                        <span>删除时间: {deletionTime}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleRestoreEvent(event)}
                        className="p-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 transition-all flex items-center justify-center gap-2"
                        title="恢复预约"
                      >
                        <Undo2 className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest px-1">恢复</span>
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(event.id)}
                        className="p-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 transition-all flex items-center justify-center gap-2"
                        title="永久删除"
                      >
                        <X className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest px-1">清除</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                <Trash2 className="w-8 h-8 text-zinc-700" />
              </div>
              <div className="text-center">
                <p className="text-sm font-black italic text-zinc-500 uppercase tracking-widest">回收站是空的</p>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">最近 3 天内删除的预约将出现在这里</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-transparent flex justify-center">
          <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.2em]">
            FX ESTETICA RECYCLE SYSTEM v{APP_VERSION}
          </p>
        </div>
      </div>
    </div>
  )
}
