import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

/**
 * Supabase Client - GX 唯一后端服务出口
 * [UI-First Sandbox Protocol]
 * 如果环境变量缺失，将自动降级为 Mock 模式，确保 UI 渲染不中断。
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 禁用锁机制，解决开发环境下 React 严格模式或多标签页导致的 "NavigatorLockAcquireTimeoutError"
    // 注意：在最新版 supabase-js 中，如果要禁用 lock，应传入自定义无锁函数或保持默认
    // 这里我们传入一个无操作的自定义锁函数来欺骗类型并禁用锁
    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => await fn(),
  }
});

// 导出环境检查标识，供 Service 层决定是否启用 Mock 数据
export const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

if (isMockMode) {
  console.warn('[GX-SANDBOX] Supabase 环境变量缺失，已自动开启 UI 优先 Mock 模式。');
}

