-- ==========================================
-- 顶级商业社交 IM：纯净 friendships 表与攻防一体防骚扰网关
-- 请在 Supabase SQL Editor 中运行此脚本
-- ==========================================

-- 1. 创建极其纯净的 friendships 表 (支持多身份物理隔离)
-- 警告：如果表已存在且主键结构不同，这里先将其删除以确保完美重建（物理级重构）
DROP TABLE IF EXISTS public.friendships CASCADE;

CREATE TABLE public.friendships (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_role TEXT NOT NULL DEFAULT 'user',
    friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, user_role, friend_id, friend_role)
);

-- 彻底清除可能存在的历史冗余字段（如 status/accepted 等），保持绝对纯净
ALTER TABLE public.friendships DROP COLUMN IF EXISTS status;
ALTER TABLE public.friendships DROP COLUMN IF EXISTS is_accepted;

-- 开启 RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- 允许用户读取自己的好友列表
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
CREATE POLICY "Users can view their own friendships"
    ON public.friendships FOR SELECT
    USING (auth.uid() = user_id);

-- 为查询性能建立索引 (多身份组合)
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id, friend_role);

-- ==========================================
-- 1.5 修改 messages 表，支持多身份消息隔离
-- ==========================================
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_role TEXT DEFAULT 'user';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS receiver_role TEXT DEFAULT 'user';

-- 开启 Realtime 广播 (为前端多轨雷达提供纳秒级刷新)
-- 先尝试移除再添加，防止 relation "friendships" is already member of publication 报错
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'friendships'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
    END IF;
END
$$;

-- ==========================================
-- 2. 升级防骚扰网关 (攻防一体，纳秒级拦截与破冰)
-- ==========================================
CREATE OR REPLACE FUNCTION enforce_anti_spam_gateway()
RETURNS TRIGGER AS $$
DECLARE
    is_friend BOOLEAN;
    allow_stranger BOOLEAN;
    my_msg_count INT;
    their_msg_count INT;
    is_sender_uuid BOOLEAN;
    is_receiver_uuid BOOLEAN;
BEGIN
    -- 如果发给群组 (room_id 存在)，则不限制
    IF NEW.room_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- 验证 sender_id 和 receiver_id 是否为合法 UUID
    -- 如果有任意一方不是真实用户（如游客 guest_xxx、WhatsApp wa_xxx 等），直接放行，不走防骚扰与好友网关
    is_sender_uuid := NEW.sender_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'i;
    is_receiver_uuid := NEW.receiver_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'i;

    IF NOT is_sender_uuid OR NOT is_receiver_uuid THEN
        RETURN NEW;
    END IF;

    -- 检查对方隐私设置 (安全强制转换为 uuid，避免 operator does not exist: uuid = text 报错)
    SELECT allow_stranger_messages INTO allow_stranger
    FROM profiles
    WHERE id = NEW.receiver_id::uuid;

    IF allow_stranger = true THEN
        RETURN NEW;
    END IF;

    -- 检查好友关系 (单向查即可，带上身份)
    SELECT EXISTS (
        SELECT 1 FROM friendships
        WHERE user_id = NEW.sender_id::uuid 
          AND user_role = COALESCE(NEW.sender_role, 'user')
          AND friend_id = NEW.receiver_id::uuid
          AND friend_role = COALESCE(NEW.receiver_role, 'user')
    ) INTO is_friend;

    IF is_friend = true THEN
        RETURN NEW;
    END IF;

    -- 防骚扰拦截逻辑 (严格按照身份隔离统计)
    SELECT COUNT(*) INTO my_msg_count
    FROM messages
    WHERE sender_id = NEW.sender_id AND receiver_id = NEW.receiver_id
      AND COALESCE(sender_role, 'user') = COALESCE(NEW.sender_role, 'user')
      AND COALESCE(receiver_role, 'user') = COALESCE(NEW.receiver_role, 'user');

    SELECT COUNT(*) INTO their_msg_count
    FROM messages
    WHERE sender_id = NEW.receiver_id AND receiver_id = NEW.sender_id
      AND COALESCE(sender_role, 'user') = COALESCE(NEW.receiver_role, 'user')
      AND COALESCE(receiver_role, 'user') = COALESCE(NEW.sender_role, 'user');

    -- 【防骚扰网关核心修复】：
    -- 如果 my_msg_count >= 1 (我发过消息)，但 their_msg_count = 0 (对方0回复)
    -- 这意味着我之前已经发过至少1条消息，现在我想发第2条，但我不是对方好友，且对方不允许陌生人发消息
    -- 所以，直接拦截。
    IF my_msg_count >= 1 AND their_msg_count = 0 THEN
        RAISE EXCEPTION 'ANTI_SPAM_GATEWAY_BLOCKED: Stranger must wait for a reply before sending more messages.';
    END IF;

    -- ==========================================
    -- 瞬间融合：自动成为好友逻辑 (回复即破冰)
    -- ==========================================
    -- 如果我是对方（receiver），并且我正在回复一个发过消息给我的陌生人（sender），且我之前没有回复过
    -- 这意味着对方之前给我发了第一条消息，我现在是第一次回复
    IF my_msg_count = 0 AND their_msg_count >= 1 THEN
        -- 建立双向好友关系，无感、无缝衔接。
        -- 触发器由于使用了 SECURITY DEFINER，会以 Postgres 超级用户权限运行
        -- 移除 ON CONFLICT DO NOTHING，并使用异常捕获块，确保即使遇到主键冲突也不会引发整个事务回滚或静默失败
        -- 这样做可以确保插入操作具有最高的物理强壮性
        BEGIN
            INSERT INTO friendships (user_id, user_role, friend_id, friend_role) 
            VALUES (NEW.sender_id::uuid, COALESCE(NEW.sender_role, 'user'), NEW.receiver_id::uuid, COALESCE(NEW.receiver_role, 'user'));
        EXCEPTION WHEN unique_violation THEN
            -- 如果已经存在，忽略即可
        END;

        BEGIN
            INSERT INTO friendships (user_id, user_role, friend_id, friend_role) 
            VALUES (NEW.receiver_id::uuid, COALESCE(NEW.receiver_role, 'user'), NEW.sender_id::uuid, COALESCE(NEW.sender_role, 'user'));
        EXCEPTION WHEN unique_violation THEN
            -- 如果已经存在，忽略即可
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. 绑定触发器到 messages 表
DROP TRIGGER IF EXISTS trg_enforce_anti_spam ON messages;
CREATE TRIGGER trg_enforce_anti_spam
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION enforce_anti_spam_gateway();
