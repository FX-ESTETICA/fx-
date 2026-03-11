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
