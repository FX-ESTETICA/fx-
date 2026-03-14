-- Phase 1, Step 2: 极致化财务回溯逻辑
-- 实现 rollback_ledger_to_version：通过版本快照实现“财务回滚”

CREATE OR REPLACE FUNCTION rollback_ledger_to_version(
  p_booking_id UUID,
  p_target_version INTEGER,
  p_operator_id UUID DEFAULT NULL,
  p_rollback_reason TEXT DEFAULT '管理员手动回滚'
) RETURNS VOID AS $$
DECLARE
  v_snapshot JSONB;
  v_merchant_id UUID;
  v_total_amount NUMERIC;
  v_entry JSONB;
  v_new_version INTEGER;
BEGIN
  -- 1. 获取目标版本的快照
  SELECT snapshot, merchant_id, total_amount INTO v_snapshot, v_merchant_id, v_total_amount
  FROM fx_ledger_versions
  WHERE booking_id = p_booking_id AND version_number = p_target_version;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION '未找到指定版本号的财务快照: %', p_target_version;
  END IF;

  -- 2. 清理当前预约的所有财务明细 (fx_event_items)
  DELETE FROM fx_event_items WHERE event_id = p_booking_id;

  -- 3. 从快照中恢复明细
  FOR v_entry IN SELECT * FROM jsonb_array_elements(v_snapshot) LOOP
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
      (v_entry->>'event_id')::UUID,
      (v_entry->>'merchant_id')::UUID,
      (v_entry->>'service_id')::UUID,
      v_entry->>'service_name',
      (v_entry->>'staff_id')::UUID,
      v_entry->>'staff_name',
      (v_entry->>'price_sold')::NUMERIC,
      (v_entry->>'commission_amount')::NUMERIC,
      (v_entry->'value_split_detail'),
      'rolled_back', -- 标记为已回滚状态
      (v_entry->>'original_merchant_id')::UUID,
      NOW() -- 记录恢复时间
    );
  END LOOP;

  -- 4. 记录本次回滚动作作为一个新版本 (保持线性审计追踪)
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_new_version 
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
    v_merchant_id,
    v_new_version,
    v_snapshot,
    p_rollback_reason || ' (从版本 ' || p_target_version || ' 回滚)',
    v_total_amount,
    p_operator_id
  );

  -- 5. 确保预约状态仍为已结算（或根据业务逻辑调整）
  UPDATE fx_events 
  SET is_settled = TRUE,
      updated_at = NOW()
  WHERE id = p_booking_id;

END;
$$ LANGUAGE plpgsql;
