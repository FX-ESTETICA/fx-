"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { X, Download } from "lucide-react";

export function WebDownloadPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 只有在浏览器环境且是移动端设备时才显示（排除原生壳子环境）
    if (!Capacitor.isNativePlatform()) {
      const isAndroid = /android/i.test(navigator.userAgent);
      const isMobile = /mobile/i.test(navigator.userAgent);
      
      // 可以使用 localStorage 控制用户关闭后几天内不再显示，这里为了方便测试先每次都展示
      const hasDismissed = sessionStorage.getItem("gx_web_prompt_dismissed");
      
      if (isAndroid && isMobile && !hasDismissed) {
        // 延迟一点显示，让页面先渲染完
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("gx_web_prompt_dismissed", "true");
    setShowPrompt(false);
  };

  const handleDownload = () => {
    // 触发下载 APK
    window.location.href = "https://fx-rapallo.vercel.app/gx-core.apk";
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[50000] p-4 bg-gradient-to-t from-black/90 to-black/60 backdrop-blur-md border-t border-white/10 animate-in slide-in-from-bottom-full duration-500">
      <div className="flex items-center gap-4 max-w-md mx-auto relative">
        {/* 左侧 Icon */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex-shrink-0 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
          <span className="text-xl">🚀</span>
        </div>
        
        {/* 中间文字 */}
        <div className="flex-1">
          <h3 className="text-white font-bold text-sm leading-tight mb-1">
            使用 GX 专属原生 App
          </h3>
          <p className="text-zinc-400 text-xs line-clamp-2 leading-snug">
            享受沉浸式全息体验，完美原生物理返回键与无死角硬件支持。
          </p>
        </div>

        {/* 右侧按钮组 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-cyan-400 hover:bg-white/20 active:scale-95 transition-all"
          >
            <Download size={20} />
          </button>
          
          <button
            onClick={handleDismiss}
            className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
