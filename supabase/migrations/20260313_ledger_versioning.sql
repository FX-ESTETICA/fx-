-- Phase 1, Step 1.1: 创建财务版本审计表
-- 实现“财务时间机器”，记录每一次账目变更的完整快照

CREATE TABLE IF NOT EXISTS fx_ledger_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    merchant_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    snapshot JSONB NOT NULL, -- 存储当时的 fx_event_items 完整镜像
    change_reason TEXT,      -- 变更原因 (例如：首次结算, 部分退款, 价格调整)
    total_amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,         -- 操作人 ID
    
    CONSTRAINT unique_booking_version UNIQUE (booking_id, version_number)
);

-- 为查询加速
CREATE INDEX IF NOT EXISTS idx_ledger_versions_booking ON fx_ledger_versions(booking_id);
