-- Phase 4, Step 4.2: 实现 3D 空间持久化锚点 (Spatial Persistence)
-- 为全息协同 AR 提供物理空间的“数字钉子”

CREATE TABLE IF NOT EXISTS fx_spatial_anchors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    anchor_name TEXT NOT NULL DEFAULT 'default_anchor',
    
    -- 空间变换数据 (JSONB 存储 position, rotation, scale)
    transform JSONB NOT NULL DEFAULT '{
        "position": [0, -2, 0],
        "rotation": [0, 0, 0],
        "scale": [0.6, 0.6, 0.6]
    }',
    
    -- 锚点元数据
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_merchant_user_anchor UNIQUE (merchant_id, user_id, anchor_name)
);

-- 启用行级安全
ALTER TABLE fx_spatial_anchors ENABLE ROW LEVEL SECURITY;

-- 创建策略：仅允许用户查看和修改自己的锚点，或商户管理员查看所有锚点
CREATE POLICY "Users can manage their own spatial anchors" 
ON fx_spatial_anchors 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Merchant admins can view all anchors"
ON fx_spatial_anchors
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM fx_staff
    WHERE fx_staff.user_id = auth.uid()
    AND fx_staff.merchant_id = fx_spatial_anchors.merchant_id
    AND fx_staff.role IN ('owner', 'admin')
));

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_spatial_anchor_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_spatial_anchor_timestamp
BEFORE UPDATE ON fx_spatial_anchors
FOR EACH ROW
EXECUTE FUNCTION update_spatial_anchor_timestamp();
