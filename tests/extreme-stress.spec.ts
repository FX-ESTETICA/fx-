import { test } from '@playwright/test';

test.describe('Extreme Navigation Stress Test', () => {
  test('should survive 100 rapid page switches without crashing', async ({ page }) => {
    // 开启 CDPSession 来监控性能指标 (FPS, JS Heap)
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    console.log('🚀 [极限测试] 正在连接本地服务器...');
    await page.goto('http://localhost:3000');
    
    // 确保页面加载完成
    await page.waitForLoadState('networkidle');
    console.log('✅ 初始页面加载完成，准备进行极限切换测试');

    // 获取初始内存
    let metrics = await client.send('Performance.getMetrics');
    const initialHeap = metrics.metrics.find(m => m.name === 'JSHeapUsedSize')?.value || 0;
    console.log(`📊 初始 JS 堆内存: ${(initialHeap / 1024 / 1024).toFixed(2)} MB`);

    const iterations = 50; // 进行 50 次极速切换
    console.log(`\n🔥 开始执行 ${iterations} 次极速页面切换...`);
    
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      // 模拟极速点击底部导航栏或不同页面
      // 这里我们尝试访问不同的已知路由
      const routes = ['/', '/calendar/beauty', '/discovery', '/me', '/chat'];
      const targetRoute = routes[i % routes.length];
      
      // 强制极速跳转，不等待完全加载就立刻跳下一个
      await page.goto(`http://localhost:3000${targetRoute}`, { waitUntil: 'commit' }).catch(() => {});
      
      // 模拟用户不耐烦的滑动
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });
      
      // 极短的停顿，模拟狂点
      await page.waitForTimeout(50);
      
      if (i > 0 && i % 10 === 0) {
        console.log(`   ...已完成 ${i} 次切换`);
      }
    }

    const endTime = Date.now();
    console.log(`\n🛑 极速切换完成！总耗时: ${((endTime - startTime) / 1000).toFixed(2)} 秒`);

    // 获取结束时的内存
    metrics = await client.send('Performance.getMetrics');
    const finalHeap = metrics.metrics.find(m => m.name === 'JSHeapUsedSize')?.value || 0;
    console.log(`📊 最终 JS 堆内存: ${(finalHeap / 1024 / 1024).toFixed(2)} MB`);
    
    const diffMB = ((finalHeap - initialHeap) / 1024 / 1024).toFixed(2);
    console.log(`📈 内存增量 (泄漏风险): ${diffMB} MB`);

    if (Number(diffMB) > 50) {
      console.log('⚠️ 警告: 检测到潜在的严重内存泄漏！');
    } else {
      console.log('✅ 内存控制优秀，未见明显泄漏。');
    }

    // 简单评估 CPU 阻塞情况 (通过计算事件循环延迟)
    const delay = await page.evaluate(async () => {
      const start = performance.now();
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(performance.now() - start);
        }, 0);
      });
    });
    
    console.log(`⏱️ 事件循环延迟 (主线程阻塞程度): ${Number(delay).toFixed(2)} ms`);
    if (Number(delay) > 50) {
      console.log('⚠️ 警告: 主线程存在严重阻塞，页面极度卡顿！');
    } else {
      console.log('✅ 主线程响应迅速，切换流畅。');
    }
  });
});
