-- Phase 3, Step 3.1: 创建 AI 策略权重动态表
-- 为 AI 博弈引擎引入“可进化”的灵魂

CREATE TABLE IF NOT EXISTS fx_ai_strategy_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL,
    strategy_key TEXT NOT NULL, -- 如: 'default_scheduling_v1'
    
    -- 核心博弈权重 (Adaptive Weights)
    merchant_weight NUMERIC DEFAULT 0.5, -- 商户（利润/转化）话语权
    staff_weight NUMERIC DEFAULT 0.5,    -- 员工（收益/体能）话语权
    
    -- 学习元数据
    total_learning_count INTEGER DEFAULT 0, -- 已学习的样本量
    positive_feedback_count INTEGER DEFAULT 0, -- 正面反馈（商户采纳并带来增量）
    negative_feedback_count INTEGER DEFAULT 0, -- 负面反馈（商户覆盖或导致流失）
    
    last_evolved_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_merchant_strategy UNIQUE (merchant_id, strategy_key)
);

-- 初始化默认策略
INSERT INTO fx_ai_strategy_weights (merchant_id, strategy_key)
SELECT id, 'default_scheduling_v1' FROM fx_merchants
ON CONFLICT DO NOTHING;
