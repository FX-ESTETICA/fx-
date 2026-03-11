export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c]">
      <div className="relative">
        {/* 核心旋转环 */}
        <div className="h-20 w-20 animate-spin rounded-full border-b-2 border-l-2 border-cyan-400 border-t-2 border-t-transparent shadow-[0_0_20px_rgba(34,211,238,0.3)]" />
        
        {/* 装饰发光环 */}
        <div className="absolute inset-0 h-20 w-20 rounded-full border border-cyan-400/10 animate-pulse" />
        
        {/* 中心文字 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping shadow-[0_0_15px_rgba(34,211,238,1)]" />
        </div>
        
        {/* 底部加载文字 */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-48 text-center">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
            SYSTEM LOADING
          </span>
        </div>
      </div>
    </div>
  )
}
