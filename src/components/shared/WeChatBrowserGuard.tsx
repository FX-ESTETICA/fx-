"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Compass, ExternalLink } from "lucide-react";

export function WeChatBrowserGuard() {
  const [isWeChat, setIsWeChat] = useState(false);

  useEffect(() => {
    // 探测微信内置浏览器环境
    const ua = window.navigator.userAgent.toLowerCase();
    if (ua.includes("micromessenger")) {
      setIsWeChat(true);
    }
  }, []);

  if (!isWeChat) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center bg-black/95 backdrop-blur-xl px-6 pt-12 text-white">
      {/* 右上角指示箭头 */}
      <div className="absolute top-4 right-6 animate-bounce">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gx-cyan transform -rotate-45 drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </div>

      <div className="mt-16 w-full max-w-sm rounded-2xl border border-gx-cyan/30 bg-black/60 p-8 shadow-[0_0_30px_rgba(0,240,255,0.15)] text-center relative overflow-hidden">
        {/* 流光渐变底座 */}
        <div className="absolute inset-0 bg-[length:200%_auto] animate-[shimmer_8s_linear_infinite] bg-gradient-to-r from-transparent via-gx-cyan/10 to-transparent" />
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full border border-gx-cyan/50 flex items-center justify-center bg-black/80 shadow-[0_0_15px_rgba(0,240,255,0.4)]">
            <Compass className="w-8 h-8 text-gx-cyan animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-mono tracking-widest font-bold text-gx-cyan">RESTRICTED ZONE</h2>
            <p className="text-xs text-white/60 uppercase tracking-[0.2em]">微信环境拦截</p>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <p className="text-sm text-white/80 leading-relaxed font-light">
            为保障世界级全息渲染体验与数据通信安全，
            <br />
            请点击右上角 <strong className="text-white">···</strong> 按钮，
            <br />
            选择 <span className="text-gx-cyan font-bold tracking-widest px-1">在浏览器打开</span>
          </p>
          
          <div className="flex items-center gap-2 text-xs text-white/40 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <ExternalLink className="w-3 h-3" />
            <span>SAFARI / CHROME REQUIRED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
