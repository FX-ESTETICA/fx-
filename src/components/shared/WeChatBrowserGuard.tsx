"use client";

import { useEffect, useState } from "react";
import { Compass, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

export function WeChatBrowserGuard() {
    const t = useTranslations('WeChatBrowserGuard');
  const [isWeChat, setIsWeChat] = useState(false);

  useEffect(() => {
    // 探测微信内置浏览器环境
    const ua = window.navigator.userAgent.toLowerCase();
    if (ua.includes("micromessenger")) {
      setIsWeChat(true);
      // 物理级防穿透锁：锁死底层页面的滚动，制造“看得到摸不到”的饥饿感
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!isWeChat) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center bg-black/40  px-6 pt-12 text-white pointer-events-auto">
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
          className=" transform -rotate-45 "
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </div>

      <div className="mt-16 w-full max-w-sm rounded-2xl border  bg-black/20  p-8  text-center relative overflow-hidden ring-1 ring-white/5">
        {/* 流光渐变底座 */}
        <div className="absolute inset-0 bg-[length:200%_auto] animate-[shimmer_8s_linear_infinite] bg-gradient-to-r from-transparent  to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full border  flex items-center justify-center bg-black/60 ">
            <Compass className="w-8 h-8  animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-mono tracking-widest font-bold ">{t('txt_8b2cab')}</h2>
            <p className="text-xs text-white uppercase tracking-[0.2em]">{t('txt_285d0c')}</p>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <p className="text-sm text-white leading-relaxed font-light">
            {t('txt_1bc292')}<br />
            {t('txt_a6fbe5')}<strong className="text-white">···</strong> {t('txt_bd26e0')}<br />
            {t('txt_153fa6')}<span className=" font-bold tracking-widest px-1">{t('txt_475860')}</span>
          </p>
          
          <div className="flex items-center gap-2 text-xs text-white bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <ExternalLink className="w-3 h-3" />
            <span>SAFARI / CHROME REQUIRED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
