-- 1. 智控卡片专属的 ID 搜索开关（之前只有手机号开关，补齐 ID 开关）
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS merchant_allow_search_by_id BOOLEAN DEFAULT true;

-- 2. BOSS 卡片专属的手机号绑定字段
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS boss_phone VARCHAR(255);

-- 3. BOSS 卡片专属的手机号搜索开关
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS boss_allow_search_by_phone BOOLEAN DEFAULT true;

-- 4. BOSS 卡片专属的 ID 搜索开关
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS boss_allow_search_by_id BOOLEAN DEFAULT true;

-- 5. 为老数据赋予默认值
UPDATE public.profiles SET merchant_allow_search_by_id = true WHERE merchant_allow_search_by_id IS NULL;
UPDATE public.profiles SET boss_allow_search_by_phone = true WHERE boss_allow_search_by_phone IS NULL;
UPDATE public.profiles SET boss_allow_search_by_id = true WHERE boss_allow_search_by_id IS NULL;
