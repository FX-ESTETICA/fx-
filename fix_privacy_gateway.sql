-- 1. 添加缺失的智控专属手机号搜索开关
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS merchant_allow_search_by_phone BOOLEAN DEFAULT true;

-- 2. 添加缺失的陌生人消息拦截开关
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS allow_stranger_messages BOOLEAN DEFAULT false;

-- 如果需要，为之前已经存在的用户赋予默认值
UPDATE public.profiles SET merchant_allow_search_by_phone = true WHERE merchant_allow_search_by_phone IS NULL;
UPDATE public.profiles SET allow_stranger_messages = false WHERE allow_stranger_messages IS NULL;
