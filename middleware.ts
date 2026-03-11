import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isAuthPage = url.pathname.startsWith('/auth')
  const isMePage = url.pathname.startsWith('/me')
  const isAdminPage = url.pathname.startsWith('/admin')
  const isMerchantOnboarding = url.pathname.startsWith('/merchant/onboarding')

  // 1. 如果已登录且在登录/注册页，重定向到首页
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 2. 路由保护：只有登录用户或商家能访问 /admin 或 /merchant/onboarding
  if (!user && (isAdminPage || isMerchantOnboarding)) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // 3. /me 页面由客户端同步逻辑处理（支持游客模式），中间件仅确保基础访问
  
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
