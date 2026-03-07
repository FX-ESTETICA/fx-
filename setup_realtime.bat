@echo off
echo 正在配置 Supabase Realtime 发布...
echo.
echo 请按以下步骤操作：
echo 1. 打开 Supabase 控制台: https://app.supabase.com/project/otkzntibwinszparrkru
echo 2. 点击左侧菜单的 "Database"
echo 3. 选择 "Replication" 选项卡
echo 4. 找到 "Publications" 部分
echo 5. 点击 "supabase_realtime" 发布
echo 6. 在 "Tables" 部分，勾选 "fx_events" 表
echo 7. 点击 "Save" 保存
echo.
echo 或者执行以下 SQL 命令：
echo ALTER PUBLICATION supabase_realtime ADD TABLE fx_events;
echo.
echo 配置完成后，Realtime 同步将自动生效。
pause