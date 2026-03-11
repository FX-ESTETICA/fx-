'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 打印错误到终端
    console.error('Next.js 运行时错误:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0c] p-6 text-center">
      <div className="mb-6 h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
        <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="mb-2 text-xl font-black text-white uppercase tracking-widest">系统遇到了问题</h2>
      <p className="mb-8 text-sm text-zinc-400 font-medium">{error.message || '发生了一个未知错误'}</p>
      <button
        onClick={() => reset()}
        className="rounded-full bg-cyan-500 px-8 py-3 text-sm font-black uppercase tracking-widest text-white shadow-[0_0_25px_rgba(34,211,238,0.4)] active:scale-95 transition-all hover:bg-cyan-400"
      >
        尝试刷新页面
      </button>
    </div>
  )
}
