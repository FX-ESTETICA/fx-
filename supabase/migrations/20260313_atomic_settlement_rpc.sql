-- 升级原子化结算存储过程 v2.1
-- 该函数在一个事务内完成：
-- 1. 插入财务明细 (fx_event_items)
-- 2. 更新预约状态为已结算 (fx_events)
-- 3. 如果存在跨店借调，插入信用积分流水 (fx_inter_merchant_ledger)
-- 4. 如果存在 AI 策略，记录反馈 (fx_ai_feedback)
-- 5. [新增] 财务版本化审计：记录账目快照 (fx_ledger_versions)

CREATE OR REPLACE FUNCTION create_atomic_ledger(
  p_booking_id UUID,
  p_merchant_id UUID,
  p_ai_strategy_id UUID,
  p_dynamic_price_factor FLOAT,
  p_context_snapshot JSONB,
  p_ledger_entries JSONB[],
  p_credit_entries JSONB[],
  p_ai_feedback_entries JSONB[],
  p_change_reason TEXT DEFAULT '首次结算',
  p_operator_id UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  entry JSONB;
  v_next_version INTEGER;
  v_total_amount NUMERIC := 0;
BEGIN
  -- 1. 插入财务明细并累加总额
  FOR entry IN SELECT * FROM unnest(p_ledger_entries) LOOP
    INSERT INTO fx_event_items (
      event_id, 
      merchant_id, 
      service_id, 
      service_name, 
      staff_id, 
      staff_name, 
      price_sold, 
      commission_amount, 
      value_split_detail, 
      settlement_status, 
      original_merchant_id, 
      created_at
    ) VALUES (
      (entry->>'event_id')::UUID,
      (entry->>'merchant_id')::UUID,
      (entry->>'service_id')::UUID,
      entry->>'service_name',
      (entry->>'staff_id')::UUID,
      entry->>'staff_name',
      (entry->>'price_sold')::NUMERIC,
      (entry->>'commission_amount')::NUMERIC,
      (entry->'value_split_detail'),
      entry->>'settlement_status',
      (entry->>'original_merchant_id')::UUID,
      (entry->>'created_at')::TIMESTAMPTZ
    );
    v_total_amount := v_total_amount + (entry->>'price_sold')::NUMERIC;
  END LOOP;

  -- 2. 财务版本化快照 (Financial Time Machine)
  -- 获取当前预约的下一个版本号
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version 
  FROM fx_ledger_versions 
  WHERE booking_id = p_booking_id;

  INSERT INTO fx_ledger_versions (
    booking_id,
    merchant_id,
    version_number,
    snapshot,
    change_reason,
    total_amount,
    created_by
  ) VALUES (
    p_booking_id,
    p_merchant_id,
    v_next_version,
    to_jsonb(p_ledger_entries),
    p_change_reason,
    v_total_amount,
    p_operator_id
  );

  -- 3. 更新预约主表状态
  UPDATE fx_events 
  SET is_settled = TRUE 
  WHERE id = p_booking_id;

  -- 3. 记录跨店信用流水
  FOR entry IN SELECT * FROM unnest(p_credit_entries) LOOP
    INSERT INTO fx_inter_merchant_ledger (
      debtor_merchant_id,
      creditor_merchant_id,
      amount,
      transaction_type,
      booking_id,
      status,
      created_at
    ) VALUES (
      (entry->>'debtor_merchant_id')::UUID,
      (entry->>'creditor_merchant_id')::UUID,
      (entry->>'amount')::NUMERIC,
      entry->>'transaction_type',
      (entry->>'booking_id')::UUID,
      entry->>'status',
      (entry->>'created_at')::TIMESTAMPTZ
    );
  END LOOP;

  -- 4. 记录 AI 反馈
  FOR entry IN SELECT * FROM unnest(p_ai_feedback_entries) LOOP
    INSERT INTO fx_ai_feedback (
      strategy_id,
      booking_id,
      original_revenue,
      actual_revenue,
      impact_score,
      context_snapshot,
      created_at
    ) VALUES (
      (entry->>'strategy_id')::UUID,
      (entry->>'booking_id')::UUID,
      (entry->>'original_revenue')::NUMERIC,
      (entry->>'actual_revenue')::NUMERIC,
      (entry->>'impact_score')::NUMERIC,
      (entry->'context_snapshot'),
      (entry->>'created_at')::TIMESTAMPTZ
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;
