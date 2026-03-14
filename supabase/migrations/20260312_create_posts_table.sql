-- 创建发现页帖子表 (Posts)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('image', 'video')) NOT NULL,
    media_url TEXT NOT NULL, -- Bunny Storage 的路径 (如: 123456-photo.jpg)
    video_id TEXT, -- Bunny Stream 的 Video ID
    title TEXT,
    description TEXT,
    likes INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    tags TEXT[],
    category TEXT DEFAULT '全部',
    
    -- 搜索与索引优化
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- 开启 RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 策略：所有人可读
CREATE POLICY "Public posts are viewable by everyone" 
ON public.posts FOR SELECT 
USING (true);

-- 策略：仅登录用户可创建
CREATE POLICY "Authenticated users can create posts" 
ON public.posts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 策略：仅作者可修改或删除自己的帖子
CREATE POLICY "Users can update their own posts" 
ON public.posts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
ON public.posts FOR DELETE 
USING (auth.uid() = user_id);
