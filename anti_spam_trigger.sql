-- ==========================================
-- 顶级商业社交 IM：陌生人防骚扰网关 (后端拦截器)
-- 请在 Supabase SQL Editor 中运行此脚本
-- ==========================================

-- 1. 创建防骚扰网关的触发器函数
CREATE OR REPLACE FUNCTION enforce_anti_spam_gateway()
RETURNS TRIGGER AS $$
DECLARE
    is_friend BOOLEAN;
    allow_stranger BOOLEAN;
    my_msg_count INT;
    their_msg_count INT;
BEGIN
    -- 如果发给群组 (room_id 存在)，则不限制
    IF NEW.room_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- 检查对方是否开启了“允许陌生人随意发消息” (allow_stranger_messages)
    SELECT allow_stranger_messages INTO allow_stranger
    FROM profiles
    WHERE id = NEW.receiver_id;

    -- 如果对方允许陌生人随意发消息，直接放行
    IF allow_stranger = true THEN
        RETURN NEW;
    END IF;

    -- 检查双方是否为双向好友 (在 friendships 表中存在记录)
    SELECT EXISTS (
        SELECT 1 FROM friendships
        WHERE (user_id = NEW.sender_id AND friend_id = NEW.receiver_id)
           OR (user_id = NEW.receiver_id AND friend_id = NEW.sender_id)
    ) INTO is_friend;

    -- 如果是好友，直接放行
    IF is_friend = true THEN
        RETURN NEW;
    END IF;

    -- 如果不是好友且对方不允许随意发，则进入防骚扰拦截逻辑：
    -- 检查我发了多少条，对方回复了多少条
    SELECT COUNT(*) INTO my_msg_count
    FROM messages
    WHERE sender_id = NEW.sender_id AND receiver_id = NEW.receiver_id;

    SELECT COUNT(*) INTO their_msg_count
    FROM messages
    WHERE sender_id = NEW.receiver_id AND receiver_id = NEW.sender_id;

    -- 核心拦截规则：如果我已发送过至少 1 条消息，且对方 0 回复，则拒绝 INSERT
    IF my_msg_count >= 1 AND their_msg_count = 0 THEN
        RAISE EXCEPTION 'ANTI_SPAM_GATEWAY_BLOCKED: Stranger must wait for a reply before sending more messages.';
    END IF;

    -- ==========================================
    -- 自动成为好友逻辑：回复陌生消息即刻破冰
    -- ==========================================
    -- 如果我是对方（receiver），并且我正在回复一个发过消息给我的陌生人（sender），且我之前没有回复过
    -- 这意味着对方之前给我发了第一条消息，我现在是第一次回复
    IF my_msg_count = 0 AND their_msg_count >= 1 THEN
        -- 建立双向好友关系，无感、无缝衔接
        INSERT INTO friendships (user_id, friend_id) VALUES (NEW.sender_id, NEW.receiver_id)
        ON CONFLICT DO NOTHING;
        INSERT INTO friendships (user_id, friend_id) VALUES (NEW.receiver_id, NEW.sender_id)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. 绑定触发器到 messages 表
DROP TRIGGER IF EXISTS trg_enforce_anti_spam ON messages;
CREATE TRIGGER trg_enforce_anti_spam
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION enforce_anti_spam_gateway();
