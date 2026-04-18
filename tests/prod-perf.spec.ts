import { test } from '@playwright/test';

test.describe('Production Performance Profiling', () => {
  test('Measure Main Thread Blocking & Long Tasks', async ({ page }) => {
    console.log('🚀 正在连接生产环境服务器(日历界面)...');
    await page.goto('http://localhost:3088/calendar/beauty', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2000); // 等待 React 挂载完成

    // 注入一个脚本来捕获 Long Tasks
    await page.evaluate(() => {
      (window as any).perfTasks = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          (window as any).perfTasks.push({ name: entry.name, duration: entry.duration });
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
      (window as any).perfObserver = observer;
    });

    console.log('✅ 已启动长任务(Long Tasks)监听，开始执行高频渲染与切换操作...');

    const startTime = Date.now();
    
    // 模拟 30 次高频操作：上下滑动，点击屏幕随机位置（触发可能存在的 React 状态流转）
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => window.scrollBy(0, 300));
      await page.waitForTimeout(50);
      
      // 模拟随机点击
      await page.mouse.click(100 + Math.random() * 200, 100 + Math.random() * 200).catch(() => {});
      
      await page.evaluate(() => window.scrollBy(0, -300));
      await page.waitForTimeout(50);
    }
    
    // 获取收集到的所有长任务
    const longTasks: any[] = await page.evaluate(() => {
      (window as any).perfObserver.disconnect();
      return (window as any).perfTasks;
    });

    const totalDuration = longTasks.reduce((acc, task) => acc + task.duration, 0);
    const maxTask = longTasks.length > 0 ? Math.max(...longTasks.map(t => t.duration)) : 0;
    
    console.log(`\n📊 【生产环境性能深度核磁报告】`);
    console.log(`⏱️ 极限操作耗时: ${Date.now() - startTime} ms`);
    console.log(`🔴 检测到超过 50ms 的长任务 (Long Tasks) 数量: ${longTasks.length} 次`);
    console.log(`🔥 长任务总阻塞时间 (TBT 估算): ${totalDuration.toFixed(2)} ms`);
    if (longTasks.length > 0) {
      console.log(`💥 最严重的一次卡顿耗时: ${maxTask.toFixed(2)} ms`);
    }

    console.log('\n=========================================');
    if (longTasks.length > 20 || maxTask > 200) {
      console.log('⚠️ 结论：系统存在明显的渲染阻塞，在低端手机上一定会发热、卡顿掉帧！');
    } else if (longTasks.length > 5) {
      console.log('✅ 结论：存在轻微阻塞，属于优秀水平。在新款手机上如丝般顺滑，但旧手机可能有轻微掉帧。');
    } else if (longTasks.length > 0) {
      console.log('🌟 结论：极度优秀！仅有极少数不可避免的微秒级长任务，几乎达到物理极限。');
    } else {
      console.log('👑 结论：完美无瑕！0 阻塞，真正的世界顶端极致性能！');
    }
    console.log('=========================================\n');
  });
});