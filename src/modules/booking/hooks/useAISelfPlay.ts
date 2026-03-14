'use client'

import { useCallback } from 'react'
import { Resource, Service } from '@/modules/core/types/omni-flow'
import { createClient } from '@/utils/supabase/client'
import { useOmniStore } from '@/modules/core/store/useOmniStore'

interface NegotiationResult {
  final_price_factor: number;
  staff_satisfaction: number;    // 0.0 - 1.0
  merchant_satisfaction: number; // 0.0 - 1.0
  negotiation_log: string[];
  suggested_at: string;
  adaptive_weights?: { merchant: number; staff: number };
}

/**
 * [Sovereign AI] Hard Boundary Protocol
 * Defines the absolute limits of AI pricing and weight autonomy.
 * Any AI evolution attempt to bypass these will be intercepted.
 */
export interface SovereignBoundaryProtocol {
  readonly MAX_SURGE: number;        // Highest allow price multiplier (e.g. 1.5 = +50%)
  readonly MAX_DISCOUNT: number;     // Lowest allow price multiplier (e.g. 0.7 = -30%)
  readonly WEIGHT_STAFF_MAX: number; // Max weight for Staff Agent (e.g. 0.8)
  readonly WEIGHT_MERCHANT_MAX: number; // Max weight for Merchant Agent (e.g. 0.9)
}

export const GLOBAL_SAFETY_PROTOCOL: SovereignBoundaryProtocol = {
  MAX_SURGE: 1.5,
  MAX_DISCOUNT: 0.7,
  WEIGHT_STAFF_MAX: 0.8,
  WEIGHT_MERCHANT_MAX: 0.9
};

/**
 * [Sovereign Guard] Assertion Engine
 * Validates raw AI results against the hard boundary protocol.
 * Returns a safety report and the clamped result.
 */
export const enforceSafetyProtocol = (rawFactor: number): { 
  isSafe: boolean; 
  clampedFactor: number;
  violationAudit?: string;
} => {
  const isTooHigh = rawFactor > GLOBAL_SAFETY_PROTOCOL.MAX_SURGE;
  const isTooLow = rawFactor < GLOBAL_SAFETY_PROTOCOL.MAX_DISCOUNT;
  
  if (!isTooHigh && !isTooLow) {
    return { isSafe: true, clampedFactor: rawFactor };
  }

  const violationAudit = isTooHigh 
    ? `EXCESSIVE_SURGE: ${rawFactor.toFixed(2)} exceeds ${GLOBAL_SAFETY_PROTOCOL.MAX_SURGE}`
    : `EXCESSIVE_DISCOUNT: ${rawFactor.toFixed(2)} drops below ${GLOBAL_SAFETY_PROTOCOL.MAX_DISCOUNT}`;

  return {
    isSafe: false,
    clampedFactor: Math.max(
      GLOBAL_SAFETY_PROTOCOL.MAX_DISCOUNT, 
      Math.min(GLOBAL_SAFETY_PROTOCOL.MAX_SURGE, rawFactor)
    ),
    violationAudit
  };
};

/**
 * AI 自我博弈调度引擎 (AI Self-Play Scheduling Engine) v3.0
 * 核心逻辑：自适应双 Agent 竞争模型 (Adaptive Staff Agent vs Merchant Agent)
 * 进化：支持从数据库加载经过“强化学习”演化后的博弈权重
 */
export function useAISelfPlay() {
  const setAI = useOmniStore(state => state.setAI)
  const isNegotiating = useOmniStore(state => state.ai.isNegotiating)
  const supabase = createClient()

  const negotiatePricing = useCallback(async (
    resource: Resource,
    service: Service,
    currentLoad: number, // 0.0 - 1.0
    merchantId?: string
  ): Promise<NegotiationResult> => {
    setAI({ isNegotiating: true })
    const log: string[] = []
    
    const { strategyIntent, strategyWeights } = useOmniStore.getState().ai

    // 1. 加载自适应权重 (Adaptive Weight Loading)
    // v4.0: 优先使用 Sovereign Strategy 设置的权重
    let adaptive_merchant_weight = strategyWeights.merchant
    let has_evolved_weights = strategyIntent !== 'BALANCED_AUTO'

    if (strategyIntent === 'BALANCED_AUTO' && merchantId) {
      const { data: weights } = await supabase
        .from('fx_ai_strategy_weights')
        .select('merchant_weight')
        .eq('merchant_id', merchantId)
        .eq('strategy_key', 'default_scheduling_v1')
        .single()
      
      if (weights) {
        adaptive_merchant_weight = Number(weights.merchant_weight)
        has_evolved_weights = true
        log.push(`[系统进化] 已加载商户自适应博弈权重: 商户控制力 ${(adaptive_merchant_weight * 100).toFixed(1)}%`)
      }
    } else {
      log.push(`[主权策略] 当前执行模式: ${strategyIntent}, 预设权重: ${(adaptive_merchant_weight * 100).toFixed(1)}%`)
    }

    // 初始状态
    let staff_factor = 1.0
    let merchant_factor = 1.0
    const commission_rate = resource.commission_rate || 0.15

    log.push(`[初始化] 开始博弈：资源 ${resource.name}, 服务 ${service.name}`)
    log.push(`[背景] 当前负载: ${(currentLoad * 100).toFixed(1)}%, 员工分润率: ${(commission_rate * 100).toFixed(1)}%`)

    // 第一轮：Staff Agent 提出诉求 (关注单次服务收益)
    if (currentLoad < 0.3) {
      staff_factor = 1.2 
      log.push(`[Staff Agent] 负载较低，建议溢价 20% 以保障单次服务收益。`)
    } else if (currentLoad > 0.9) {
      staff_factor = 1.4
      log.push(`[Staff Agent] 负载极高，建议大幅溢价以筛选高质量预约。`)
    } else {
      staff_factor = 1.0
      log.push(`[Staff Agent] 负载正常，维持标准定价。`)
    }

    // 第二轮：Merchant Agent 提出诉求 (关注整体转化与 GMV)
    if (currentLoad < 0.4) {
      merchant_factor = 0.75 
      log.push(`[Merchant Agent] 闲置率高，倾向于 75 折引流。`)
    } else if (currentLoad > 0.8) {
      merchant_factor = 1.3 
      log.push(`[Merchant Agent] 资源紧缺，建议溢价 30% 提升净利润。`)
    }

    // 第三轮：自我博弈 (Non-linear Convergence)
    // 算法升级：将静态启发式权重与自适应进化权重进行非线性融合
    let final_merchant_weight = adaptive_merchant_weight
    
    if (currentLoad < 0.3) {
      // 极低负载下，商户（引流）权重强制提升 20%
      final_merchant_weight = Math.min(GLOBAL_SAFETY_PROTOCOL.WEIGHT_MERCHANT_MAX, final_merchant_weight + 0.2)
      log.push(`[动态调节] 极低负载触发引流优先模式，商户权重临时上调。`)
    } else if (currentLoad > 0.8) {
      // 极高负载下，商户（利润）权重强制提升 10%
      final_merchant_weight = Math.min(GLOBAL_SAFETY_PROTOCOL.WEIGHT_MERCHANT_MAX, final_merchant_weight + 0.1)
      log.push(`[动态调节] 极高负载触发利润优先模式，商户权重临时上调。`)
    }
    
    const final_staff_weight = 1 - final_merchant_weight
    
    // 计算原始博弈结果 (Raw Negotiation Result)
    const raw_factor = (staff_factor * final_staff_weight) + (merchant_factor * final_merchant_weight)
    
    // [Sovereign Guard] 协议拦截与审计
    const { isSafe, clampedFactor, violationAudit } = enforceSafetyProtocol(raw_factor)
    
    if (!isSafe) {
      log.push(`[主权拦截] 发现违规博弈行为: ${violationAudit}`)
      log.push(`[安全防御] 原始系数 ${raw_factor.toFixed(2)} 已被强制修正为 ${clampedFactor.toFixed(2)}`)
    } else {
      log.push(`[合规校验] 博弈行为符合安全红线协议 (Factor: ${clampedFactor.toFixed(2)})`)
    }

    const final_factor = clampedFactor
    
    // 计算满意度
    const staff_satisfaction = 1 - Math.abs(final_factor - staff_factor)
    const merchant_satisfaction = 1 - Math.abs(final_factor - merchant_factor)

    log.push(`[博弈结果] 最终达成动态系数: ${final_factor.toFixed(2)}`)
    log.push(`[评估] 员工满意度: ${(staff_satisfaction * 100).toFixed(0)}%, 商户满意度: ${(merchant_satisfaction * 100).toFixed(0)}%`)

    setAI({
      isNegotiating: false,
      finalPriceFactor: final_factor,
      staffSatisfaction: staff_satisfaction,
      merchantSatisfaction: merchant_satisfaction,
      lastNegotiationLog: log
    })
    
    return {
      final_price_factor: final_factor,
      staff_satisfaction,
      merchant_satisfaction,
      negotiation_log: log,
      suggested_at: new Date().toISOString(),
      adaptive_weights: { merchant: final_merchant_weight, staff: final_staff_weight }
    }
  }, [supabase])

  /**
   * 提交博弈反馈，驱动 AI 进化
   */
  const submitFeedback = useCallback(async (
    merchantId: string,
    feedbackType: 'positive' | 'negative',
    impactDelta: number = 0
  ) => {
    try {
      const { error } = await supabase.rpc('evolve_ai_strategy', {
        p_merchant_id: merchantId,
        p_strategy_key: 'default_scheduling_v1',
        p_feedback_type: feedbackType,
        p_impact_delta: impactDelta
      })
      if (error) throw error
      return { success: true }
    } catch (err) {
      console.error('AI Evolution failed:', err)
      return { success: false, error: err }
    }
  }, [supabase])

  return {
    isNegotiating,
    negotiatePricing,
    submitFeedback
  }
}
