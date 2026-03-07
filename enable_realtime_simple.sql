-- 直接配置 fx_events 表 Realtime 发布的 SQL 命令
-- 在 Supabase 控制台中执行这些命令

-- 1. 检查当前发布状态
SELECT '=== 检查 fx_events 表是否已启用 Realtime ===' as status;
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'fx_events';

-- 2. 如果未启用，添加到发布（取消注释执行）
-- ALTER PUBLICATION supabase_realtime ADD TABLE fx_events;

-- 3. 验证结果
SELECT '=== 验证 fx_events 表 Realtime 状态 ===' as status;
SELECT * FROM pg_publication_tables WHERE tablename = 'fx_events';