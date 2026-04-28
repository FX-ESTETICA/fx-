-- =========================================================================
-- 24小时自动销毁程序 (纯SQL版，无需部署边缘函数)
-- 功能：自动删除超过24小时的聊天记录，并同步物理删除对应的语音和图片文件
-- =========================================================================

-- 1. 开启 pg_cron 定时任务插件 (如果没开启的话)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. 创建核心清理函数
CREATE OR REPLACE FUNCTION delete_expired_chat_media()
RETURNS void AS $$
DECLARE
    msg RECORD;
    extracted_path TEXT;
BEGIN
    -- 遍历所有超过 24 小时且包含多媒体文件(图片或语音)的消息
    FOR msg IN 
        SELECT id, audio_url, image_url 
        FROM public.messages 
        WHERE created_at < NOW() - INTERVAL '24 hours'
    LOOP
        -- 销毁语音物理文件
        IF msg.audio_url IS NOT NULL THEN
            -- 提取文件名路径，例如从 https://.../chat_media/user/123.webm 提取 user/123.webm
            extracted_path := substring(msg.audio_url from 'chat_media/(.*)$');
            IF extracted_path IS NOT NULL THEN
                -- 删除 storage.objects 表中的记录会自动触发物理文件的真实删除
                DELETE FROM storage.objects WHERE bucket_id = 'chat_media' AND name = extracted_path;
            END IF;
        END IF;

        -- 销毁图片物理文件
        IF msg.image_url IS NOT NULL THEN
            extracted_path := substring(msg.image_url from 'chat_media/(.*)$');
            IF extracted_path IS NOT NULL THEN
                DELETE FROM storage.objects WHERE bucket_id = 'chat_media' AND name = extracted_path;
            END IF;
        END IF;
    END LOOP;

    -- 最后，彻底删除所有超过 24 小时的数据库消息记录（包含纯文本、已被删除文件的图片/语音记录）
    DELETE FROM public.messages WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 防止重复调度，先尝试取消旧的定时任务
SELECT cron.unschedule('cleanup-expired-chat-messages');

-- 4. 设定每小时的第 0 分钟，自动执行一次销毁函数
SELECT cron.schedule(
  'cleanup-expired-chat-messages',
  '0 * * * *', -- Cron 表达式：每小时执行一次
  $$ SELECT delete_expired_chat_media(); $$
);
