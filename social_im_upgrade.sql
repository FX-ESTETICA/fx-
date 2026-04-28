-- ==========================================
-- 顶级商业社交 IM：底层数据库架构升级脚本
-- 请在 Supabase SQL Editor 中运行此脚本
-- ==========================================

-- 1. 为 profiles 添加隐私和业务手机号字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_phone VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allow_search_by_phone BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allow_search_by_id BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allow_stranger_messages BOOLEAN DEFAULT false; -- 是否允许陌生人无限制发消息

-- 2. 创建 friendships 表 (好友双向关系图谱)
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- 3. 创建 friend_requests 表 (好友申请网关)
CREATE TABLE IF NOT EXISTS friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);

-- 4. 开启 RLS 并配置安全策略
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- friendships 策略：用户只能看到自己的好友关系
CREATE POLICY "Users can view their own friendships" ON friendships
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can insert their own friendships" ON friendships
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their own friendships" ON friendships
    FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- friend_requests 策略：用户只能看到发给自己的或自己发出的申请
CREATE POLICY "Users can view their own requests" ON friend_requests
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert requests" ON friend_requests
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update requests sent to them" ON friend_requests
    FOR UPDATE USING (auth.uid() = receiver_id);
