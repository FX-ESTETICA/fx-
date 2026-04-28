-- 在 profiles 表中新增智控专属的名字和头像字段
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS merchant_name TEXT,
ADD COLUMN IF NOT EXISTS merchant_avatar_url TEXT;

-- 可以选做：为已经存在的智控账号初始化一个默认的 merchant_name
-- UPDATE public.profiles
-- SET merchant_name = '智控 ' || SUBSTRING(merchant_gx_id FROM LENGTH(merchant_gx_id) - 3)
-- WHERE merchant_gx_id IS NOT NULL AND merchant_name IS NULL;
