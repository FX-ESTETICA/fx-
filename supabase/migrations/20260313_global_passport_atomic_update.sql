-- 全球通行证：原子化偏好更新 RPC v2.0 (极致生命周期管理)
-- 解决并发覆盖 (Race Condition) 与 JSONB 膨胀问题

CREATE OR REPLACE FUNCTION update_passport_preferences(
  p_passport_id UUID,
  p_new_preferences JSONB,
  p_merchant_id UUID,
  p_priority INTEGER DEFAULT 50 -- 默认中等优先级
) RETURNS VOID AS $$
DECLARE
  current_prefs JSONB;
  merged_prefs JSONB;
  pruned_prefs JSONB := '{}'::JSONB;
  key TEXT;
  val JSONB;
  now_ts TIMESTAMPTZ := NOW();
  v_max_keys CONSTANT INTEGER := 50; -- 每个通行证最多存储 50 条核心偏好
BEGIN
  -- 1. 获取当前偏好 (使用 FOR UPDATE 锁定行)
  SELECT preferences INTO current_prefs 
  FROM fx_global_passports 
  WHERE id = p_passport_id 
  FOR UPDATE;

  IF current_prefs IS NULL THEN
    current_prefs := '{}'::JSONB;
  END IF;

  -- 2. 迭代并合并新偏好，注入“优先级”与“生存时间”基因
  merged_prefs := current_prefs;
  
  FOR key, val IN SELECT * FROM jsonb_each(p_new_preferences) LOOP
    -- 包装偏好，注入元数据
    merged_prefs := merged_prefs || jsonb_build_object(key, jsonb_build_object(
      'value', val,
      'source', p_merchant_id,
      'updated_at', now_ts,
      'priority_score', p_priority,
      'expires_at', now_ts + INTERVAL '1 year' -- 默认有效期一年
    ));
  END LOOP;

  -- 3. 极致化生命周期管理 (Pruning / GC)
  -- 如果偏好数量超过阈值，则根据 (priority_score, updated_at) 进行修剪
  IF (SELECT count(*) FROM jsonb_object_keys(merged_prefs)) > v_max_keys THEN
    WITH ranked_prefs AS (
      SELECT 
        k, 
        v,
        ROW_NUMBER() OVER (
          ORDER BY 
            (v->>'priority_score')::INTEGER DESC, 
            (v->>'updated_at')::TIMESTAMPTZ DESC
        ) as rank
      FROM jsonb_each(merged_prefs) t(k, v)
    )
    SELECT jsonb_object_agg(k, v) INTO pruned_prefs
    FROM ranked_prefs
    WHERE rank <= v_max_keys;
    
    merged_prefs := pruned_prefs;
  END IF;

  -- 4. 原子更新
  UPDATE fx_global_passports 
  SET 
    preferences = merged_prefs,
    metadata = metadata || jsonb_build_object(
      'last_sync_at', now_ts,
      'last_sync_merchant', p_merchant_id,
      'pruned_at', CASE WHEN pruned_prefs != '{}'::JSONB THEN now_ts ELSE metadata->'pruned_at' END
    )
  WHERE id = p_passport_id;
END;
$$ LANGUAGE plpgsql;
