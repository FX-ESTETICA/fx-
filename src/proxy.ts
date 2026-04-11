import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 边缘环境 (Edge) 无法使用传统 Node.js 的 setInterval 等内存泄漏型计时器。
// 这里我们使用一个简单的 Map 来实现基础的 IP 速率限制。
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

// 清理过期记录
const cleanupRateLimitMap = () => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now - data.timestamp > 10000) { // 10 秒过期
      rateLimitMap.delete(ip);
    }
  }
};

export function proxy(req: NextRequest) {
  // Use x-forwarded-for as a fallback for IP since req.ip might not be defined depending on deployment
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown-ip';
  const path = req.nextUrl.pathname;

  // 仅对特定的敏感 API 进行 WAF 拦截
  if (path.startsWith('/api/places') || path.startsWith('/api/upload')) {
    cleanupRateLimitMap();

    const now = Date.now();
    const record = rateLimitMap.get(ip) || { count: 0, timestamp: now };

    // 重新计时
    if (now - record.timestamp > 10000) {
      record.count = 0;
      record.timestamp = now;
    }

    record.count += 1;
    rateLimitMap.set(ip, record);

    // WAF 规则：同一个 IP，10秒内最多 10 次请求
    if (record.count > 10) {
      console.warn(`🚨 [WAF Blocked] Rate limit exceeded for IP: ${ip} on path: ${path}`);
      return new NextResponse(
        JSON.stringify({ 
          error: "Too Many Requests", 
          message: "触发 WAF 防御机制：您的请求频率过高，请稍后再试。" 
        }),
        { 
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // We no longer set or read NEXT_LOCALE cookie. 
  // All language detection is handled statelessly in i18n/request.ts
  return NextResponse.next();
}

export const config = {
  matcher: [
    // 拦截所有的内部路径和 api
    '/((?!_next|favicon.ico|.*\\..*).*)',
  ],
};