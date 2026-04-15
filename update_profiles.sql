-- 请在 Supabase SQL Editor 中执行以下脚本，为 profiles 表添加试用期相关的字段，以支持“帝国级”订阅模式。

-- 1. 添加 trial_started_at（记录试用期开始时间）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

-- 2. 添加 current_period_end（记录订阅/试用到期时间，虽然目前倒计时是前端算的，但后端预留）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- 3. 添加 subscription_status（更细粒度的订阅状态：trialing, active, past_due, canceled 等）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing';

-- 如果你有 RLS（Row Level Security），可能还需要确保 Boss 有权限修改自己的 trial_started_at
-- (如果之前已经允许 user 修改自己的 profile，则无需额外添加)

