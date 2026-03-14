import React from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { I18N } from '@/utils/calendar-constants'

interface BookingModalProps {
  lang: 'zh' | 'it'
  isBookingModalOpen: boolean
  selectedDate: Date | null
  memberName: string
  setMemberName: (val: string) => void
  memberInfo: string
  setMemberInfo: (val: string) => void
  newTitle: string
  setNewTitle: (val: string) => void
  selectedStaffId: string
  setSelectedStaffId: (val: string) => void
  isSubmitting: boolean
  onSubmit: (e: any) => void
  onClose: () => void
}

export const BookingModal: React.FC<BookingModalProps> = ({ 
  lang,
  isBookingModalOpen,
  selectedDate,
  memberName,
  setMemberName,
  memberInfo,
  setMemberInfo,
  newTitle,
  setNewTitle,
  selectedStaffId,
  setSelectedStaffId,
  isSubmitting,
  onSubmit,
  onClose
}) => {
  if (!isBookingModalOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-transparent backdrop-blur-sm"
    >
      <div 
        className="w-full max-w-md bg-transparent border border-white/20 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-white">{(I18N[lang] as any).bookNow}</h3>
            <p className="text-sm text-zinc-400 font-medium">
              {selectedDate && format(selectedDate, 'M月d日 HH:mm', { locale: zhCN })}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">您的姓名</label>
              <input 
                type="text"
                placeholder="请输入姓名"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">联系电话</label>
              <input 
                type="tel"
                placeholder="请输入电话号码"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600"
                value={memberInfo}
                onChange={(e) => setMemberInfo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">预约项目 / 需求</label>
              <textarea 
                placeholder="请输入您想要预约的项目或特殊需求"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600 min-h-[100px] resize-none"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => onClose()}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-zinc-400 hover:bg-white/5 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={(e) => {
                  if (!selectedStaffId) setSelectedStaffId('NO');
                  onSubmit(e);
                }}
                disabled={isSubmitting || !memberName || !memberInfo || !newTitle}
                className="flex-[2] py-3.5 rounded-2xl text-sm font-bold text-white bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {isSubmitting ? '正在提交...' : '立即预约'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
