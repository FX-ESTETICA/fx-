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
    storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: async <R,>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => await fn(),
  }
});

// 导出环境检查标识，供 Service 层决定是否启用 Mock 数据
export const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

if (isMockMode) {
  console.warn('[GX-SANDBOX] Supabase 环境变量缺失，已自动开启 UI 优先 Mock 模式。');
}
