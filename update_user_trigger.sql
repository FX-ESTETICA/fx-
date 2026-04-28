-- 请在 Supabase SQL Editor 中执行以下脚本
-- 目标：当新用户（如通过 Google OAuth）注册时，自动提取其名字和头像到 profiles 业务表。
-- 核心逻辑：监听 auth.users 的 INSERT 事件，并将数据同步。

-- 1. 创建触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_gx_id TEXT;
BEGIN
  -- 生成物理锚点 gx_id (格式: GX-UR-XXXXXX)
  -- 这里使用随机生成的 6 位十六进制字符作为基础后缀
  new_gx_id := 'GX-UR-' || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 6));

  INSERT INTO public.profiles (
    id,
    gx_id,
    email,
    name,
    avatar_url,
    role,
    created_at
  )
  VALUES (
    new.id,
    new_gx_id,
    new.email,
    -- 尝试提取 full_name 或 name，如果都为空则回退到邮箱前缀或降级编号
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      SPLIT_PART(new.email, '@', 1),
      '用户 ' || SUBSTRING(new.id::text FROM 1 FOR 4)
    ),
    -- 尝试提取 avatar_url 或 picture
    COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      ''
    ),
    'user', -- 默认角色
    NOW()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 检查并删除已存在的同名触发器（防冲突）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. 将触发器绑定到 auth.users 表
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. 历史数据修复（可选执行）：将现存名字为空的 Google 用户进行更新
UPDATE public.profiles p
SET 
  name = COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    p.name
  ),
  avatar_url = COALESCE(
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture',
    p.avatar_url
  )
FROM auth.users au
WHERE p.id = au.id 
  AND (p.name IS NULL OR p.name = '' OR p.name LIKE '用户 %');
