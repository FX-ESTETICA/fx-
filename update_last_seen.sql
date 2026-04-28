-- 请在 Supabase SQL Editor 中执行以下脚本，为 profiles 表添加 last_seen 字段，支持“双轨制在线状态追踪”模型。

-- 1. 添加 last_seen（记录用户最后活跃的精确时间戳）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- 2. 确保更新时间戳的触发器或逻辑能够正确写入该字段
-- 注：前端会在页面卸载或切入后台时静默写入当前时间戳。
