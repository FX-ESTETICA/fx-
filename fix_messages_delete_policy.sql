-- 修复 messages 表的双向撤回功能（物理删除）
-- 1. 确保 RLS 是开启的
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. 检查并添加 DELETE 策略：允许发送者（sender_id）删除自己发出的消息
DROP POLICY IF EXISTS "Enable delete for message senders" ON public.messages;
CREATE POLICY "Enable delete for message senders"
ON public.messages
FOR DELETE
USING (auth.uid()::text = sender_id::text OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- 3. （可选保险）确保你的 messages 表在 Realtime 广播中支持 DELETE 追踪
ALTER TABLE public.messages REPLICA IDENTITY FULL;