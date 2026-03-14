import React from 'react'
import { cn } from '@/lib/utils'

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'deleted'

interface StatusBadgeProps {
  status: BookingStatus
  lang?: 'zh' | 'it'
  className?: string
}

const statusConfig = {
  pending: {
    zh: '待确认',
    it: 'In attesa',
    className: 'bg-rose-500 text-white animate-pulse ring-2 ring-rose-500/50'
  },
  confirmed: {
    zh: '已确认',
    it: 'Confermato',
    className: 'bg-emerald-500 text-white'
  },
  completed: {
    zh: '已结账',
    it: 'Completato',
    className: 'bg-zinc-800 text-zinc-400 border border-zinc-700'
  },
  cancelled: {
    zh: '已取消',
    it: 'Annullato',
    className: 'bg-zinc-500 text-white'
  },
  deleted: {
    zh: '已删除',
    it: 'Eliminato',
    className: 'bg-zinc-900 text-zinc-600 border border-zinc-800 line-through'
  }
}

/**
 * 原子组件：状态标签
 * 统一全系统的预约/订单状态视觉
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  lang = 'zh',
  className
}) => {
  const config = statusConfig[status] || statusConfig.pending
  const label = config[lang]

  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-[10px] font-black italic uppercase tracking-widest flex items-center justify-center whitespace-nowrap",
      config.className,
      className
    )}>
      {label}
    </span>
  )
}
