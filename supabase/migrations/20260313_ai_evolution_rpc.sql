-- Phase 3, Step 3.2: AI 权重自适应演化 RPC
-- 实现基于反馈的强化学习逻辑 (Reinforcement Learning via RPC)

CREATE OR REPLACE FUNCTION evolve_ai_strategy(
  p_merchant_id UUID,
  p_strategy_key TEXT,
  p_feedback_type TEXT, -- 'positive' (采纳), 'negative' (覆盖/修改), 'neutral'
  p_impact_delta NUMERIC DEFAULT 0 -- 带来的额外收益或损失
) RETURNS VOID AS $$
DECLARE
  v_learning_rate NUMERIC := 0.01; -- 学习率：每次反馈对权重的影响系数
  v_current_merchant_weight NUMERIC;
BEGIN
  -- 1. 获取当前权重
  SELECT merchant_weight INTO v_current_merchant_weight
  FROM fx_ai_strategy_weights
  WHERE merchant_id = p_merchant_id AND strategy_key = p_strategy_key
  FOR UPDATE;

  -- 2. 演化逻辑：如果商户覆盖了 AI 建议，则降低该 Agent 的话语权
  IF p_feedback_type = 'negative' THEN
    -- 惩罚商户权重（可能因为商户更倾向于保护员工或用户体验，而非纯利润）
    -- 这是一个非线性惩罚，越接近边界惩罚越重
    v_current_merchant_weight := GREATEST(0.1, v_current_merchant_weight - v_learning_rate * (1 + ABS(p_impact_delta)));
    
    UPDATE fx_ai_strategy_weights SET
      merchant_weight = v_current_merchant_weight,
      staff_weight = 1.0 - v_current_merchant_weight,
      negative_feedback_count = negative_feedback_count + 1,
      total_learning_count = total_learning_count + 1,
      last_evolved_at = NOW()
    WHERE merchant_id = p_merchant_id AND strategy_key = p_strategy_key;
    
  ELSIF p_feedback_type = 'positive' THEN
    -- 奖励逻辑：采纳了 AI 建议，增加话语权
    v_current_merchant_weight := LEAST(0.9, v_current_merchant_weight + v_learning_rate * (1 + p_impact_delta));
    
    UPDATE fx_ai_strategy_weights SET
      merchant_weight = v_current_merchant_weight,
      staff_weight = 1.0 - v_current_merchant_weight,
      positive_feedback_count = positive_feedback_count + 1,
      total_learning_count = total_learning_count + 1,
      last_evolved_at = NOW()
    WHERE merchant_id = p_merchant_id AND strategy_key = p_strategy_key;
  END IF;

END;
$$ LANGUAGE plpgsql;
