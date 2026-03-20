import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabase Client - GX 唯一后端服务出口
 * 包含数据库访问与实时推送功能
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
