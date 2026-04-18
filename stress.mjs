import fs from 'fs';

const target = 'http://localhost:3000/';
const concurrent = 50; 
const total = 500;

console.log(`[GX 极限压测探针] 目标: ${target} | 总请求: ${total} | 并发: ${concurrent}`);

// 1. 先发送一次冷启动请求，触发 Next.js / Turbopack 的首次懒编译
console.log("[GX 极限压测探针] 正在触发首次冷启动编译 (由于使用了 Turbopack，可能会有大量组件即时编译)...");
try {
    const startCold = Date.now();
    const res = await fetch(target);
    await res.text();
    console.log(`[GX 极限压测探针] 冷启动编译完成！耗时: ${((Date.now() - startCold) / 1000).toFixed(2)}s`);
} catch (e) {
    console.log("[GX 极限压测探针] 冷启动请求失败，可能服务未就绪。", e.message);
    process.exit(1);
}

// 2. 开始并发轰炸
console.log("[GX 极限压测探针] 开始并发压测轰炸...");
let completed = 0;
let failed = 0;
let active = 0;
const start = Date.now();

const workers = Array(concurrent).fill(0).map(async () => {
    while (completed + active < total) {
        active++;
        try {
            const res = await fetch(target);
            await res.text(); 
        } catch (e) {
            failed++;
        } finally {
            active--;
            completed++;
            if (completed % 100 === 0) console.log(`[GX 极限压测探针] 进度: ${completed}/${total} | 失败: ${failed}`);
        }
    }
});

await Promise.all(workers);

const time = (Date.now() - start) / 1000;
console.log(`\n================================`);
console.log(`[GX 极限压测报告]`);
console.log(`耗时: ${time.toFixed(2)} 秒`);
console.log(`成功: ${total - failed}`);
console.log(`失败: ${failed}`);
console.log(`吞吐量 (RPS): ${(total / time).toFixed(2)} req/s`);
console.log(`================================\n`);
