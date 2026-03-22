"use client";

import { useState } from 'react';
import { Sparkles, Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Settings, Trash2, RotateCcw, User } from 'lucide-react';
import { cn } from "@/utils/cn";

export default function BookingSandboxPro() {
  const [selectedService] = useState<string | null>(null);

  return (
    <div 
      className="min-h-screen w-full relative overflow-hidden bg-black text-white font-sans flex flex-col items-center justify-center p-8"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1614200187524-dc4b892acf16?q=80&w=2560&auto=format&fit=crop)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* 沉浸式暗场遮罩，保证文字可读性 */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      
      {/* 顶部控制栏 */}
      <div className="relative z-20 flex items-center gap-6 bg-black/50 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 mb-8">
        <div className="flex items-center gap-2">
          <button className="p-1 hover:bg-white/10 rounded transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <button className="p-1 hover:bg-white/10 rounded transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-2 text-sm font-mono tracking-widest text-gx-cyan">
          <Settings className="w-4 h-4" /> 16°C
        </div>
        <div className="text-xl font-bold tracking-widest font-mono">
          2026 / 三月
          <span className="text-[10px] ml-2 text-white/50">星期六 7</span>
        </div>
        <div className="flex bg-white/5 rounded-lg p-1">
          {["日视图", "周视图", "月视图", "年视图"].map((v, i) => (
            <button key={v} className={cn("px-3 py-1 text-xs rounded-md transition-colors", i === 0 ? "bg-white/20 text-white" : "text-white/40 hover:text-white/80")}>
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 hover:bg-white/10 rounded transition-colors"><RotateCcw className="w-4 h-4" /></button>
          <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-red-400/80"><Trash2 className="w-4 h-4" /></button>
          <button className="p-1.5 hover:bg-white/10 rounded transition-colors"><Settings className="w-4 h-4" /></button>
        </div>
      </div>

      {/* 核心双窗容器 (Glassmorphism + Neon Border) */}
      <main className="relative z-10 w-full max-w-[1400px] h-[750px] flex rounded-3xl overflow-hidden backdrop-blur-xl bg-black/40 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        
        {/* ===================== 左侧：控制台面板 ===================== */}
        <section className="w-[50%] h-full p-8 flex flex-col gap-6 border-r border-white/5 relative">
          
          {/* AI 洞察面板 */}
          <div className="bg-gx-cyan/5 border border-gx-cyan/20 rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gx-cyan" />
            <div className="flex items-center gap-2 text-gx-cyan mb-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold tracking-widest">AI 趋势建议 · 需求激增预测</span>
            </div>
            <p className="text-sm text-white/80 mb-3 leading-relaxed">
              💡 资源优化: ALEXA 处于超负荷期, 可安排技能培训或设备维护。
            </p>
            <div className="flex gap-4 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 当前负载: 68%
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400" /> 预测趋势: 82%
              </span>
            </div>
          </div>

          {/* 表单录入区 */}
          <div className="grid grid-cols-2 gap-6 mt-2">
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 font-mono tracking-widest uppercase">服务内容</label>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-2 focus-within:border-gx-cyan/50 transition-colors">
                <Settings className="w-4 h-4 text-white/30" />
                <input 
                  type="text" 
                  placeholder="输入服务项目..." 
                  className="bg-transparent border-none outline-none text-sm w-full placeholder:text-white/20 text-white"
                  value={selectedService || ""}
                  readOnly
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 font-mono tracking-widest uppercase">会员信息</label>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-2 focus-within:border-gx-cyan/50 transition-colors">
                <User className="w-4 h-4 text-white/30" />
                <input 
                  type="text" 
                  placeholder="姓名/卡号/电话" 
                  className="bg-transparent border-none outline-none text-sm w-full placeholder:text-white/20 text-white"
                />
              </div>
            </div>
          </div>

          {/* 时间与持续时间 */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 font-mono tracking-widest uppercase">预约日期</label>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex justify-between items-center text-sm cursor-pointer hover:bg-white/10 transition-colors">
                <span>2026/03/07</span>
                <CalendarIcon className="w-4 h-4 text-white/30" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 font-mono tracking-widest uppercase">开始时间</label>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex justify-between items-center text-sm cursor-pointer hover:bg-white/10 transition-colors">
                <span>09:15</span>
                <Clock className="w-4 h-4 text-white/30" />
              </div>
            </div>
          </div>

          {/* AI 推荐时间块 */}
          <div className="space-y-2">
            <label className="text-[10px] text-gx-cyan font-mono tracking-widest flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI 智能空档推荐
            </label>
            <div className="flex gap-3">
              {["09:00", "10:00", "11:00"].map((time, i) => (
                <button 
                  key={time} 
                  className={cn(
                    "flex-1 py-3 rounded-lg border text-sm font-mono flex flex-col items-center justify-center transition-all duration-300",
                    i === 0 
                      ? "bg-gx-cyan/20 border-gx-cyan text-gx-cyan shadow-[0_0_15px_rgba(0,255,255,0.2)]" 
                      : "bg-white/5 border-white/10 text-white/50 hover:border-white/30 hover:text-white"
                  )}
                >
                  {time}
                  <span className="text-[8px] opacity-60 mt-1 tracking-widest">OPTIMAL</span>
                </button>
              ))}
            </div>
          </div>

          {/* 底部按钮栏 */}
          <div className="mt-auto flex gap-4 pt-4">
            <button className="flex-1 py-3.5 rounded-xl bg-gx-cyan text-black font-bold tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(0,255,255,0.3)]">
              确认预约 / CONFIRM
            </button>
            <button className="px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-mono text-sm uppercase tracking-widest">
              取消 / CANCEL
            </button>
          </div>
        </section>

        {/* ===================== 右侧：矩阵数据区 ===================== */}
        <section className="flex-1 h-full p-10 relative">
          {/* 预留给动态项目渲染的空容器 */}
          <div className="flex justify-between items-end border-b border-white/10 pb-4 mb-6 min-h-[44px]">
             {/* 未来分类标题将渲染在这里 */}
          </div>

          <div className="grid grid-cols-4 gap-x-8 gap-y-2 h-[calc(100%-100px)] overflow-y-auto pr-2 custom-scrollbar">
             {/* 未来项目内容将渲染在这里 */}
          </div>

          {/* 悬浮精灵小球 (装饰) */}
          <div className="absolute bottom-10 right-10 w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 p-[1px] shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:shadow-[0_0_60px_rgba(6,182,212,0.6)] transition-all cursor-pointer">
            <div className="w-full h-full rounded-full bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1/2 bg-white/10 rounded-t-full" />
               <div className="flex gap-2 z-10">
                 <div className="w-2 h-1 bg-cyan-400 rounded-full animate-pulse" />
                 <div className="w-2 h-1 bg-cyan-400 rounded-full animate-pulse" />
               </div>
               <div className="w-4 h-[2px] bg-cyan-400/50 mt-2 rounded-full z-10" />
            </div>
          </div>
        </section>
      </main>

      {/* Global styles for custom scrollbar to match the futuristic vibe */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.5);
        }
      `}</style>
    </div>
  );
}
