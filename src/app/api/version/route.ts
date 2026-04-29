import { NextResponse } from 'next/server';

// 强制不缓存，确保每次请求都能拿到当前部署的真实环境变量
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    // Vercel 部署时会自动注入这个环境变量，每次 push 都会变化
    // 本地开发时可能没有，降级为 dev
    version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev',
  });
}
