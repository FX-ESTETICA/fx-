-- 检查当前数据库中的 Realtime 发布配置
SELECT * FROM pg_publication WHERE pubname LIKE '%supabase_realtime%';

-- 检查 fx_events 表是否已加入 Realtime 发布
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'fx_events';

-- 如果 fx_events 表未加入，执行以下命令添加
-- ALTER PUBLICATION supabase_realtime ADD TABLE fx_events;