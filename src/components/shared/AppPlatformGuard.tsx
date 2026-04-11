"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { Share, X, Zap } from "lucide-react";

export const AppPlatformGuard = () => {
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [dismissed, setDismissed] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // 1. 检查是否在原生 App 壳子内
    if (Capacitor.isNativePlatform()) {
      setIsNative(true);
      return;
    }

    // 2. 检查是否在 PWA 独立模式 (Standalone)
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsNative(true); // 当作原生对待，不显示
      return;
    }

    // 3. 检查是否已经关闭过提示
    if (sessionStorage.getItem("gx_app_guard_dismissed")) {
      setDismissed(true);
      return;
    }

    // 4. 精准嗅探设备类型
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /ipad|iphone|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(ua);
    const isMobile = /mobile/.test(ua);

    if (isIOS && isMobile) {
      setPlatform("ios");
    } else if (isAndroid && isMobile) {
      setPlatform("android");
    } else {
      setPlatform("other"); // PC 或其他，什么都不显示
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("gx_app_guard_dismissed", "true");
  };

  const handleAndroidAction = () => {
    // 安卓终极唤醒逻辑
    // 1. 盲发 Scheme 尝试拉起已安装的 APP
    window.location.href = "intent://fx-rapallo.vercel.app/#Intent;scheme=https;package=com.gx.core;end";
    
    // 2. 挂载 2 秒计时器。如果 2 秒后页面没有被挂起，直接下载 APK
    setTimeout(() => {
      if (document.hasFocus()) {
        window.location.href = "https://fx-rapallo.vercel.app/gx-core.apk";
      }
    }, 2000);
  };

  // 如果是原生、PC 或者已关闭，空气般消失
  if (isNative || platform === "other" || dismissed) return null;

  return (
    <AnimatePresence>
      {/* iOS 赛博全息引导浮层 */}
      {platform === "ios" && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
        >
          <div className="relative rounded-2xl bg-black/80 backdrop-blur-2xl border border-white/20 p-5 text-center shadow-2xl">
            <button onClick={handleDismiss} className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
            
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <Share className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-widest mb-1">获取完整 GX 体验</h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  系统已就绪。请激活底部 <span className="text-white font-bold mx-1">分享</span> 链路，<br/>
                  选择 <span className="text-white font-bold mx-1">添加到主屏幕</span> 注入物理桌面。
                </p>
              </div>
            </div>

            {/* 向下指向分享按钮的光效箭头 */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
              <div className="w-0.5 h-4 bg-gradient-to-b from-white/50 to-transparent" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Android 极简赛博唤醒/下载按钮 */}
      {platform === "android" && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
        >
          <div className="relative overflow-hidden rounded-2xl bg-black/60 backdrop-blur-xl border border-gx-cyan/30 p-4 shadow-[0_0_30px_rgba(0,240,255,0.15)] flex items-center justify-between group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gx-cyan/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
            
            <div className="flex items-center gap-3 z-10">
              <div className="w-10 h-10 rounded-xl bg-gx-cyan/20 flex items-center justify-center shrink-0 border border-gx-cyan/50">
                <Zap className="w-5 h-5 text-gx-cyan animate-pulse" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold text-white tracking-widest leading-none mb-1">完美体验</span>
                <span className="text-[10px] text-white/60 font-mono leading-none">请在 APP 中打开</span>
              </div>
            </div>

            <div className="flex items-center gap-2 z-10">
              <button
                onClick={handleAndroidAction}
                className="bg-gx-cyan text-black text-xs font-bold px-4 py-2 rounded-full shadow-[0_0_15px_rgba(0,240,255,0.5)] active:scale-95 transition-transform whitespace-nowrap"
              >
                OPEN APP
              </button>
              <button onClick={handleDismiss} className="text-white/40 hover:text-white p-2 shrink-0 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
