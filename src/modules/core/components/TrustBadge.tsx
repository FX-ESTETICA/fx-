'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, ShieldAlert, ShieldEllipsis, ExternalLink, Fingerprint } from 'lucide-react'
import { useOmniStore } from '@/modules/core/store/useOmniStore'
import { cn } from '@/lib/utils'

/**
 * 信任勋章组件 (Trust Badge)
 * 核心功能：暴露底层 Atomic RPC 事务状态与唯一事务 ID，增强交易透明度
 */
export const TrustBadge: React.FC = () => {
  const { lastRpcId, status, isProcessing } = useOmniStore(state => state.transaction)

  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
        if (lastRpcId) {
          return {
            label: '上一次原子事务已安全归档',
            icon: ShieldCheck,
            color: 'text-emerald-500/60',
            bgColor: 'bg-emerald-500/5',
            borderColor: 'border-emerald-500/10'
          }
        }
        return null
      case 'preparing':
        return {
          label: '正在准备原子事务',
          icon: ShieldEllipsis,
          color: 'text-zinc-400',
          bgColor: 'bg-zinc-500/10',
          borderColor: 'border-zinc-500/20'
        }
      case 'signing':
        return {
          label: '数字签名中...',
          icon: Fingerprint,
          color: 'text-indigo-400',
          bgColor: 'bg-indigo-500/10',
          borderColor: 'border-indigo-500/30'
        }
      case 'broadcasting':
        return {
          label: '正在广播至网络',
          icon: ShieldEllipsis,
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          animate: true
        }
      case 'confirmed':
        return {
          label: '原子事务已确认 (Finalized)',
          icon: ShieldCheck,
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/30'
        }
      case 'failed':
        return {
          label: '事务执行失败',
          icon: ShieldAlert,
          color: 'text-rose-400',
          bgColor: 'bg-rose-500/10',
          borderColor: 'border-rose-500/30'
        }
      default:
        return null
    }
  }

  const config = getStatusConfig()
  if (!config) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-2xl border backdrop-blur-md shadow-lg transition-colors duration-500",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="relative">
        <config.icon className={cn("w-5 h-5", config.color, config.animate && "animate-pulse")} />
        {status === 'confirmed' && (
          <motion.div
            layoutId="glow"
            className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] font-black uppercase tracking-widest", config.color)}>
            {config.label}
          </span>
          {status === 'confirmed' && (
            <div className="px-1.5 py-0.5 rounded bg-emerald-500 text-[8px] font-black text-black uppercase">
              Secure
            </div>
          )}
        </div>
        
        {lastRpcId && (
          <div className="flex items-center gap-1.5 mt-0.5 group cursor-pointer">
            <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-tighter">
              RPC ID: {lastRpcId.slice(0, 8)}...{lastRpcId.slice(-8)}
            </span>
            <ExternalLink className="w-2.5 h-2.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {isProcessing && (
          <div className="ml-2 flex gap-0.5">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className={cn("w-1 h-1 rounded-full", config.color.replace('text', 'bg'))}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
