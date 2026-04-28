-- 在 profiles 表中新增 BOSS 专属的名字和头像字段，实现三态彻底物理隔离
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS boss_name TEXT,
ADD COLUMN IF NOT EXISTS boss_avatar_url TEXT;
