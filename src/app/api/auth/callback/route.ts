import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin: requestOrigin } = new URL(request.url)
  // 如果在本地开发且是 0.0.0.0，替换为 localhost。在线上环境则保持原样。
  const origin = requestOrigin.includes('0.0.0.0') 
    ? requestOrigin.replace('0.0.0.0', 'localhost')
    : requestOrigin;
  
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/me'

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && user) {
      // 检查用户是否已完善资料（是否有姓名）
      if (!user.user_metadata?.full_name) {
        return NextResponse.redirect(`${origin}/auth/complete-profile`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
