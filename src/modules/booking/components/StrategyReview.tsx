'use client'

import React, { useMemo } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  BrainCircuit, 
  History,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AINegotiationBar } from './AINegotiationBar'

interface StrategyStats {
  id: string
  name: string
  impact: number
  conversion: number
  usageCount: number
  revenueDelta: number
  status: 'active' | 'learning' | 'calibrating'
  reflection: string
}

export const StrategyReview: React.FC = () => {
  // 模拟数据：展示 AI 策略复盘
  const strategies: StrategyStats[] = useMemo(() => [
    {
      id: 'ST_PEAK_SURGE',
      name: '高峰时段动态加价',
      impact: 0.15,
      conversion: 0.82,
      usageCount: 45,
      revenueDelta: 1250,
      status: 'active',
      reflection: '策略在 18:00-20:00 表现最佳，由于高负荷，用户对 15% 的溢价敏感度较低。建议继续维持。'
    },
    {
      id: 'ST_OFFPEAK_PROMO',
      name: '低峰资源促销',
      impact: -0.10,
      conversion: 0.65,
      usageCount: 28,
      revenueDelta: 840,
      status: 'learning',
      reflection: '周二下午的 10% 折扣转化率低于预期。正在尝试 15% 折扣或增加附加服务赠送。'
    },
    {
      id: 'ST_PREDICTIVE_LOAD',
      name: '预测性负载平衡',
      impact: 0.05,
      conversion: 0.91,
      usageCount: 112,
      revenueDelta: 3100,
      status: 'active',
      reflection: '通过提前 30 分钟引导客户调整时间，有效避免了资源冲突，提升了整体吞吐量。'
    },
    {
      id: 'ST_STANDARD',
      name: '标准服务策略',
      impact: 0,
      conversion: 1.0,
      usageCount: 320,
      revenueDelta: 0,
      status: 'active',
      reflection: '基准策略运行稳定。'
    }
  ], [])

  return (
    <div className="p-6 space-y-6 bg-black/40 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-500/30">
            <BrainCircuit className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight uppercase">AI 策略复盘仪表盘</h2>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Self-Awareness Strategy Review</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">AI 核心在线: 正常运行</span>
        </div>
      </div>

      {/* AI 博弈动态进度条 */}
      <AINegotiationBar />

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <Target className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase">平均转化率</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">84.5%</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" /> +2.1%
            </span>
          </div>
        </div>
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <Zap className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase">AI 营收贡献</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">¥5,190</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" /> +12%
            </span>
          </div>
        </div>
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <History className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase">决策纠偏次数</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">12</span>
            <span className="text-xs font-bold text-indigo-400 flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1" /> 已完成
            </span>
          </div>
        </div>
      </div>

      {/* Strategy List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">正在运行的策略模型</span>
          <span className="text-[10px] font-bold text-indigo-400 cursor-pointer hover:underline">查看历史决策日志</span>
        </div>
        
        {strategies.map((strategy) => (
          <div 
            key={strategy.id}
            className="group relative overflow-hidden p-5 rounded-[2rem] bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-indigo-500/30 transition-all duration-500"
          >
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
              {/* Info */}
              <div className="col-span-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{strategy.name}</span>
                  {strategy.status === 'learning' && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[8px] font-black text-amber-500 uppercase">
                      正在学习
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-bold text-zinc-500 font-mono tracking-tighter">
                  ID: {strategy.id} • 使用次数: {strategy.usageCount}
                </div>
              </div>

              {/* Impact */}
              <div className="col-span-1">
                <div className="text-[9px] font-black text-zinc-500 uppercase mb-1">价格影响</div>
                <div className={cn(
                  "flex items-center gap-1.5 font-black",
                  strategy.impact > 0 ? "text-rose-400" : strategy.impact < 0 ? "text-emerald-400" : "text-zinc-400"
                )}>
                  {strategy.impact > 0 ? <TrendingUp className="w-4 h-4" /> : strategy.impact < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                  <span className="text-lg">{strategy.impact > 0 ? '+' : ''}{Math.round(strategy.impact * 100)}%</span>
                  <span className="text-[10px] opacity-60">动态调节</span>
                </div>
              </div>

              {/* Performance */}
              <div className="col-span-1">
                <div className="text-[9px] font-black text-zinc-500 uppercase mb-1">转化效率</div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-black text-white">
                    <span>{Math.round(strategy.conversion * 100)}%</span>
                    <span className="text-zinc-500">Goal: 80%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000",
                        strategy.conversion >= 0.8 ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "bg-zinc-600"
                      )}
                      style={{ width: `${strategy.conversion * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Reflection Callout */}
              <div className="col-span-1 flex items-center justify-end gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-zinc-500 uppercase">累计增收</span>
                  <span className="text-lg font-black text-white">¥{strategy.revenueDelta}</span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-indigo-500 transition-colors duration-500">
                  <ArrowUpRight className="w-5 h-5 text-white/50 group-hover:text-white" />
                </div>
              </div>
            </div>

            {/* AI Self-Reflection */}
            <div className="mt-4 pt-4 border-t border-white/5 flex items-start gap-3">
              <div className="shrink-0 mt-1">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <BrainCircuit className="w-3 h-3 text-indigo-400" />
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 italic leading-relaxed font-medium">
                AI 自我反思日志：{strategy.reflection}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="pt-4 flex items-center justify-between border-t border-white/5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500/50" />
          <span className="text-[9px] font-bold text-zinc-500 uppercase">数据已原子化加密，受 Global Passport 确权保护</span>
        </div>
        <button className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20">
          生成 AI 优化建议报告
        </button>
      </div>
    </div>
  )
}
