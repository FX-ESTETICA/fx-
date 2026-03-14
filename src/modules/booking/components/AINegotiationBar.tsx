'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Users, Briefcase, Info, AlertCircle, Smile, Frown, Meh } from 'lucide-react'

/**
 * 获取满意度对应的表情与颜色
 */
const getSentiment = (score: number) => {
  if (score >= 0.8) return { icon: Smile, color: 'text-emerald-400', label: '愉悦' }
  if (score >= 0.5) return { icon: Meh, color: 'text-amber-400', label: '中立' }
  return { icon: Frown, color: 'text-rose-400', label: '不满' }
}
import { useOmniStore } from '@/modules/core/store/useOmniStore'
import { cn } from '@/lib/utils'

/**
 * AI 博弈“拔河”进度条 (AI Tug-of-War Pricing Bar)
 * 采用 Framer Motion 实现物理级丝滑的动态价格展示
 */
export const AINegotiationBar: React.FC = () => {
  const { 
    isNegotiating, 
    finalPriceFactor, 
    staffSatisfaction, 
    merchantSatisfaction,
    lastNegotiationLog 
  } = useOmniStore(state => state.ai)

  // 计算偏移百分比 (0.7 - 1.5 映射到 0% - 100%)
  const percentage = ((finalPriceFactor - 0.7) / (1.5 - 0.7)) * 100

  return (
    <div className="w-full bg-zinc-950/50 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl">
      {/* 头部：Agent 状态 */}
      <div className="flex justify-between items-end mb-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-500 relative",
              merchantSatisfaction > 0.8 ? "bg-emerald-500/20 border-emerald-500/50" : 
              merchantSatisfaction < 0.5 ? "bg-rose-500/20 border-rose-500/50" : "bg-zinc-800 border-white/10"
            )}>
              <Briefcase className={cn("w-5 h-5", 
                merchantSatisfaction > 0.8 ? "text-emerald-400" : 
                merchantSatisfaction < 0.5 ? "text-rose-400" : "text-zinc-500"
              )} />
              
              {/* 情绪指数浮标 */}
              <motion.div 
                key={merchantSatisfaction}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -top-1 -right-1"
              >
                {React.createElement(getSentiment(merchantSatisfaction).icon, {
                  className: cn("w-4 h-4 p-0.5 rounded-full bg-zinc-900 border border-white/10", getSentiment(merchantSatisfaction).color)
                })}
              </motion.div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Merchant Agent</span>
              <span className="text-xs font-black text-white italic">
                {merchantSatisfaction > 0.8 ? 'OPTIMIZED PROFIT' : merchantSatisfaction < 0.5 ? 'CRITICAL MARGIN' : 'STABLE GROWTH'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <AnimatePresence mode="wait">
            {isNegotiating ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center"
              >
                <div className="flex gap-1 mb-1">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-indigo-500"
                    />
                  ))}
                </div>
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Negotiating...</span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center"
              >
                <span className="text-2xl font-black text-white tracking-tighter italic">
                  x{finalPriceFactor.toFixed(2)}
                </span>
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Final Factor</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <div className="flex items-center gap-2 flex-row-reverse">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-500 relative",
              staffSatisfaction > 0.8 ? "bg-indigo-500/20 border-indigo-500/50" : 
              staffSatisfaction < 0.5 ? "bg-rose-500/20 border-rose-500/50" : "bg-zinc-800 border-white/10"
            )}>
              <Users className={cn("w-5 h-5", 
                staffSatisfaction > 0.8 ? "text-indigo-400" : 
                staffSatisfaction < 0.5 ? "text-rose-400" : "text-zinc-500"
              )} />
              
              {/* 情绪指数浮标 */}
              <motion.div 
                key={staffSatisfaction}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -top-1 -left-1"
              >
                {React.createElement(getSentiment(staffSatisfaction).icon, {
                  className: cn("w-4 h-4 p-0.5 rounded-full bg-zinc-900 border border-white/10", getSentiment(staffSatisfaction).color)
                })}
              </motion.div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Staff Agent</span>
              <span className="text-xs font-black text-white italic">
                {staffSatisfaction > 0.8 ? 'HIGH RETENTION' : staffSatisfaction < 0.5 ? 'ATTRITION RISK' : 'BALANCED VALUE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 拔河进度条轨道 */}
      <div className="relative h-4 w-full bg-zinc-900 rounded-full border border-white/5 overflow-hidden mb-8">
        {/* 背景装饰线 */}
        <div className="absolute inset-0 flex justify-between px-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="w-[1px] h-full bg-white/5" />
          ))}
        </div>

        {/* 动态拔河线 */}
        <motion.div
          initial={{ width: '50%' }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500/50 via-indigo-500 to-rose-500/50"
        />

        {/* 中心参考点 */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/20 z-10" />

        {/* 浮动价格锚点 */}
        <motion.div
          animate={{ left: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20"
        >
          <div className="w-6 h-6 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.5)] border-4 border-zinc-950 flex items-center justify-center">
            {finalPriceFactor > 1 ? (
              <TrendingUp className="w-3 h-3 text-rose-500" />
            ) : finalPriceFactor < 1 ? (
              <TrendingDown className="w-3 h-3 text-emerald-500" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            )}
          </div>
        </motion.div>
      </div>

      {/* 底部：满意度与最新日志 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Merchant Satisfaction</span>
            <span className="text-[10px] font-black text-white">{(merchantSatisfaction * 100).toFixed(0)}%</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              animate={{ width: `${merchantSatisfaction * 100}%` }}
              className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Staff Satisfaction</span>
            <span className="text-[10px] font-black text-white">{(staffSatisfaction * 100).toFixed(0)}%</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              animate={{ width: `${staffSatisfaction * 100}%` }}
              className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
            />
          </div>
        </div>
      </div>

      {/* 最新博弈逻辑提示 */}
      <AnimatePresence mode="wait">
        {lastNegotiationLog.length > 0 && (
          <motion.div
            key={lastNegotiationLog[lastNegotiationLog.length - 1]}
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            className="mt-6 flex items-start gap-3 bg-white/5 rounded-2xl p-3 border border-white/5"
          >
            <Info className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-[9px] text-zinc-400 leading-relaxed font-medium">
              <span className="text-white font-bold mr-1">AI 决策逻辑:</span>
              {lastNegotiationLog[lastNegotiationLog.length - 1]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
