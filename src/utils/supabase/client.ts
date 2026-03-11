import { createBrowserClient } from '@supabase/ssr'
import { APP_VERSION } from '@/utils/calendar-constants'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          'x-app-version': APP_VERSION
        }
      }
    }
  )
}

/**
 * 校验当前版本的授权状态
 * 逻辑：从 settings 表中读取 app_status，若为 'locked' 或版本不匹配则返回 false
 */
export async function validateLicense() {
  const supabase = createClient()
  try {
    // 优先检查针对当前版本的特定授权
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', `status_${APP_VERSION}`)
      .single()
    
    // 如果没有特定版本的配置，则检查全局状态
    if (error || !data) {
      const { data: globalData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'app_status')
        .single()
      
      if (!globalData) return true
      return globalData.value !== 'locked'
    }
    
    return data.value !== 'locked'
  } catch (e) {
    return true
  }
}
