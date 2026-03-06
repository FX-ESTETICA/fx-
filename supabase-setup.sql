-- Drop the old table if it exists
DROP TABLE IF EXISTS public.fx_events;
DROP TABLE IF EXISTS public.events;

-- Create the new FX events table with Chinese column names
CREATE TABLE IF NOT EXISTS public.fx_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    "服务项目" TEXT NOT NULL,
    "会员信息" TEXT, -- Format: (编号)电话
    "服务日期" DATE NOT NULL, -- Format: 2026-03-06
    "开始时间" TIME NOT NULL, -- Format: 09:00:00
    "持续时间" INTEGER DEFAULT 60, -- Minutes
    "背景颜色" TEXT,
    "备注" TEXT,
    
    -- Staff amount fields (matching the five specific staff members)
    "金额_FANG" NUMERIC DEFAULT 0,
    "金额_SARA" NUMERIC DEFAULT 0,
    "金额_DAN" NUMERIC DEFAULT 0,
    "金额_ALEXA" NUMERIC DEFAULT 0,
    "金额_FEDE" NUMERIC DEFAULT 0
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.fx_events ENABLE ROW LEVEL SECURITY;

-- Create basic access policies (Public for development)
CREATE POLICY "Public can read fx_events" ON public.fx_events
    FOR SELECT USING (true);

CREATE POLICY "Public can insert fx_events" ON public.fx_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update fx_events" ON public.fx_events
    FOR UPDATE USING (true);

CREATE POLICY "Public can delete fx_events" ON public.fx_events
    FOR DELETE USING (true);
