import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0c] p-6 text-center">
      <div className="mb-6 h-16 w-16 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
        <svg className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </div>
      <h2 className="mb-2 text-xl font-black text-white uppercase tracking-widest">404 - 导航丢失</h2>
      <p className="mb-8 text-sm text-zinc-400 font-medium tracking-wide">
        无法定位到目标坐标，请尝试返回系统主页。
      </p>
      <Link
        href="/"
        className="rounded-full bg-cyan-500 px-8 py-3 text-sm font-black uppercase tracking-widest text-white shadow-[0_0_25px_rgba(34,211,238,0.4)] active:scale-95 transition-all hover:bg-cyan-400"
      >
        重置导航
      </Link>
    </div>
  )
}
