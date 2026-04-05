"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share, X, Zap } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // default true to avoid hydration mismatch flashes
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. Check standalone mode
    const checkStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    if (checkStandalone) return;

    // 2. Check iOS
    const ua = window.navigator.userAgent;
    // const webkit = !!ua.match(/WebKit/i);
    const isIPad = !!ua.match(/iPad/i);
    const isIPhone = !!ua.match(/iPhone/i);
    const isIOSDevice = isIPad || isIPhone;
    // const isSafari = isIOSDevice && webkit && !ua.match(/CriOS/i);

    setIsIOS(isIOSDevice);

    // If iOS and not standalone, we can optionally show the guide after a delay
    if (isIOSDevice && !checkStandalone && !sessionStorage.getItem("gx_pwa_dismissed")) {
      const timer = setTimeout(() => setShowIOSGuide(true), 3000);
      return () => clearTimeout(timer);
    }

    // 3. Android / PC: Intercept beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    setShowIOSGuide(false);
    sessionStorage.setItem("gx_pwa_dismissed", "true");
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setDismissed(true);
      }
    }
  };

  return (
    <AnimatePresence>
      {/* Android / PC 完美一键安装 */}
      {deferredPrompt && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
        >
          <div className="relative overflow-hidden rounded-2xl bg-black/60 backdrop-blur-xl border border-gx-cyan/30 p-4 shadow-[0_0_30px_rgba(0,240,255,0.15)]">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gx-cyan/10 to-transparent translate-x-[-100%] animate-[shimmer_3s_infinite]" />
            <button onClick={handleDismiss} className="absolute top-2 right-2 text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gx-cyan/20 flex items-center justify-center shrink-0 border border-gx-cyan/50">
                <Zap className="w-5 h-5 text-gx-cyan" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white tracking-widest">系统链路就绪</h3>
                <p className="text-[10px] text-white/60 font-mono">一键接入物理节点，获取最高权限</p>
              </div>
              <button
                onClick={handleInstall}
                className="shrink-0 bg-gx-cyan text-black text-xs font-bold px-4 py-2 rounded-full shadow-[0_0_15px_rgba(0,240,255,0.5)] active:scale-95 transition-transform"
              >
                INSTALL
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* iOS 赛博全息引导浮层 (规避描述文件) */}
      {isIOS && showIOSGuide && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
        >
          <div className="relative rounded-2xl bg-black/80 backdrop-blur-2xl border border-white/20 p-5 text-center shadow-2xl">
            <button onClick={handleDismiss} className="absolute top-3 right-3 text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
            
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <Share className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-widest mb-1">获取完整 GX 沉浸体验</h3>
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
    </AnimatePresence>
  );
};
