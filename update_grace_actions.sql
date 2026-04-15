-- 请在 Supabase SQL Editor 中执行以下脚本，为 profiles 表添加计次续命字段，支持“计次锁”模型。

-- 1. 添加 grace_period_actions_left（记录试用期结束后，剩余的紧急操作次数）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grace_period_actions_left INTEGER;

-- 注：当此字段为 NULL 时，表示还未开启续命；当为 0 时，表示额度彻底耗尽，日历锁死。