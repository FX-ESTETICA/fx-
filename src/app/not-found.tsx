export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-mono relative z-50">
      <h1 className="text-6xl text-gx-cyan mb-4 drop-shadow-[0_0_15px_rgba(0,240,255,0.5)]">404</h1>
      <p className="text-white/60 tracking-widest uppercase">Connection Lost // 页面不存在</p>
    </div>
  );
}