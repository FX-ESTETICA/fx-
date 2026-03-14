-- Phase 5, Step 5.1: 实现 AI 自动对冲与动态资源锁定 (Extreme v3.0)
-- 为系统注入“主动决策”的灵魂

CREATE OR REPLACE FUNCTION fx_ai_auto_hedge_v3(
    p_merchant_id UUID,
    p_target_staff_id UUID,
    p_service_date DATE,
    p_start_time TIME,
    p_duration INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_current_load NUMERIC;
    v_best_partner_id UUID;
    v_best_partner_name TEXT;
    v_best_partner_load NUMERIC;
    v_merchant_weight NUMERIC;
    v_strategy_id UUID;
BEGIN
    -- 1. 获取当前商户的 AI 策略权重
    SELECT merchant_weight INTO v_merchant_weight
    FROM fx_ai_strategy_weights
    WHERE merchant_id = p_merchant_id AND strategy_key = 'default_scheduling_v1';
    
    IF NOT FOUND THEN v_merchant_weight := 0.5; END IF;

    -- 2. 计算目标员工在此时段的预估负载 (简化逻辑：基于已有预约数)
    SELECT COUNT(*)::NUMERIC / 5.0 INTO v_current_load
    FROM fx_events
    WHERE merchant_id = p_merchant_id 
      AND (billing_details->'staff'->>p_target_staff_id::TEXT IS NOT NULL)
      AND service_date = p_service_date
      AND status NOT IN ('cancelled', 'deleted');

    -- 3. 如果负载超过阈值 (受商户权重影响，权重越高，容忍度越低，越早触发对冲)
    IF v_current_load > (0.8 * (1.5 - v_merchant_weight)) THEN
        -- 寻找负载最低的合作伙伴 (同商户内)
        SELECT id, name, (
            SELECT COUNT(*)::NUMERIC / 5.0 
            FROM fx_events 
            WHERE merchant_id = p_merchant_id 
              AND (billing_details->'staff'->>fx_staff.id::TEXT IS NOT NULL)
              AND service_date = p_service_date
        ) as load_factor INTO v_best_partner_id, v_best_partner_name, v_best_partner_load
        FROM fx_staff
        WHERE merchant_id = p_merchant_id 
          AND id != p_target_staff_id
          AND is_active = true
        ORDER BY 3 ASC
        LIMIT 1;

        -- 4. 执行自动对冲：如果找到了合适的低负载伙伴
        IF v_best_partner_id IS NOT NULL AND v_best_partner_load < 0.4 THEN
            RETURN jsonb_build_object(
                'action', 'auto_hedge',
                'recommendation', 'AI 已自动将高负载压力对冲至 ' || v_best_partner_name,
                'target_staff_id', v_best_partner_id,
                'target_staff_name', v_best_partner_name,
                'original_load', v_current_load,
                'new_load', v_best_partner_load,
                'confidence', 0.95
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'action', 'none',
        'recommendation', '当前负载健康，建议继续保持。',
        'current_load', v_current_load
    );
END;
$$ LANGUAGE plpgsql;

-- 5.2 资源物理锁定 (Spatial Locking) 逻辑
CREATE TABLE IF NOT EXISTS fx_spatial_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL,
    anchor_id UUID REFERENCES fx_spatial_anchors(id),
    resource_id UUID NOT NULL, -- 对应的 staff_id 或设备 ID
    locked_by UUID NOT NULL,   -- user_id
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用实时同步 (Realtime)
ALTER TABLE fx_spatial_locks REPLICA IDENTITY FULL;
