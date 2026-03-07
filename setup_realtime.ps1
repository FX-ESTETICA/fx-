# PowerShell 脚本：检查并配置 Supabase Realtime
$headers = @{
    "apikey" = "sb_publishable_zvSB8MZJ4T_Oq51aNlzMEg_gDl1HeBM"
    "Authorization" = "Bearer sb_publishable_zvSB8MZJ4T_Oq51aNlzMEg_gDl1HeBM"
    "Content-Type" = "application/json"
}

# 检查 fx_events 表是否已加入 Realtime 发布
$checkQuery = @{
    query = "SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'fx_events';"
} | ConvertTo-Json

try {
    Write-Host "🔍 正在检查 fx_events 表的 Realtime 发布状态..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "https://otkzntibwinszparrkru.supabase.co/rest/v1/rpc/exec_sql" `
        -Method Post -Headers $headers -Body $checkQuery
    
    if ($response -and $response.Count -gt 0) {
        Write-Host "✅ fx_events 表已在 Realtime 发布中" -ForegroundColor Green
    } else {
        Write-Host "⚠️  fx_events 表未加入 Realtime 发布，正在配置..." -ForegroundColor Orange
        
        # 添加 fx_events 表到 Realtime 发布
        $addQuery = @{
            query = "ALTER PUBLICATION supabase_realtime ADD TABLE fx_events;"
        } | ConvertTo-Json
        
        $addResponse = Invoke-RestMethod -Uri "https://otkzntibwinszparrkru.supabase.co/rest/v1/rpc/exec_sql" `
            -Method Post -Headers $headers -Body $addQuery
        
        Write-Host "✅ fx_events 表已添加到 Realtime 发布" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ 配置失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "请手动在 Supabase 控制台中配置：Database > Replication > Publications" -ForegroundColor Yellow
}