import { test, expect } from '@playwright/test';

test('GX System Full Audit (Real Browser)', async ({ page }) => {
  const errors: string[] = [];
  
  // 拦截所有浏览器控制台报错
  page.on('pageerror', err => errors.push(`[Fatal Crash] ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[Console Error] ${msg.text()}`);
  });
  
  // 拦截失败的网络请求
  page.on('response', response => {
    if (response.status() >= 400 && response.url().includes('api')) {
      errors.push(`[API Failed] ${response.status()} at ${response.url()}`);
    }
  });

  console.log('\n>>> 开始真实穿透测试 (Real End-to-End Audit) <<<\n');

  // 1. 访问首页 (Home)
  console.log('1. [Home] 正在访问首页...');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('body')).toBeVisible();

  // 2. 访问发现页 (Discovery)
  console.log('2. [Discovery] 正在访问发现页...');
  await page.goto('/discovery');
  await page.waitForLoadState('networkidle');
  // 给 UGC 瀑布流和图片一点加载时间
  await page.waitForTimeout(2000);

  // 3. 访问我的/登录页 (Me/Login)
  console.log('3. [Auth/Me] 正在访问个人中心/登录验证...');
  await page.goto('/me');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // 4. 访问日历矩阵 (Calendar)
  console.log('4. [Calendar] 正在拉取日历矩阵 (Web Worker / Supabase Sync)...');
  await page.goto('/calendar');
  await page.waitForLoadState('networkidle');
  // 给日历渲染留出计算时间
  await page.waitForTimeout(3000);

  // 5. 访问星云架构 (Nebula)
  console.log('5. [Nebula] 正在测试星云 3D 节点图谱...');
  await page.goto('/nebula');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // 打印测试捕获的所有异常
  console.log('\n=======================================');
  console.log('         REAL AUDIT REPORT             ');
  console.log('=======================================\n');
  
  if (errors.length > 0) {
    console.log(`🚨 警告：系统在真实运行中捕获到了 ${errors.length} 个严重报错！\n`);
    errors.forEach((err, idx) => console.log(`${idx + 1}. ${err}`));
  } else {
    console.log('✅ 系统前台路由巡检通过，未捕获到显式崩溃或红字报错。');
  }
  
  console.log('\n=======================================\n');
});