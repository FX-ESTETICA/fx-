-- 配置 fx_events 表 Realtime 发布的完整 SQL 脚本
-- 步骤1：检查当前发布状态
SELECT '当前 Realtime 发布状态：' as info;
SELECT pubname, puballtables 
FROM pg_publication 
WHERE pubname = 'supabase_realtime';

-- 步骤2：检查 fx_events 表是否已加入发布
SELECT 'fx_events 表发布状态：' as info;
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'fx_events';

-- 步骤3：如果未加入，添加到 Realtime 发布
-- 注意：如果 supabase_realtime 发布不存在，需要先创建
DO $$
BEGIN
    -- 检查表是否已加入发布
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'fx_events'
    ) THEN
        -- 确保发布存在
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
        ) THEN
            CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
        END IF;
        
        -- 添加 fx_events 表到发布
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.fx_events';
        RAISE NOTICE '✅ fx_events 表已成功添加到 Realtime 发布';
    ELSE
        RAISE NOTICE '✅ fx_events 表已在 Realtime 发布中';
    END IF;
END $$;

-- 步骤4：验证最终状态
SELECT '最终验证 - fx_events 表发布状态：' as info;
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'fx_events';