"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { Share, X, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

export const AppPlatformGuard = () => {
 const t = useTranslations('AppPlatformGuard');
 const [platform, setPlatform] = useState<"ios" | "android" | "pc" | "other">("other");
 const [dismissed, setDismissed] = useState(false);
 const [isNative, setIsNative] = useState(false);
 const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

 useEffect(() => {
 // 拦截 PC 端的系统级 PWA 安装事件
 const handleBeforeInstallPrompt = (e: Event) => {
 e.preventDefault();
 setDeferredPrompt(e);
 };
 window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

 // 1. 检查是否在原生 App 壳子内
 if (Capacitor.isNativePlatform()) {
 setIsNative(true);
 return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
 }

 // 2. 检查是否在 PWA 独立模式 (Standalone)
 const isStandalone = 
 window.matchMedia("(display-mode: standalone)").matches || 
 (window.navigator as any).standalone === true;
 if (isStandalone) {
 setIsNative(true); // 当作原生对待，不显示
 return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
 }

 // 3. 检查是否已经关闭过提示
 if (sessionStorage.getItem("gx_app_guard_dismissed")) {
 setDismissed(true);
 return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
 }

 // 4. 精准嗅探设备类型（世界顶级修复：击穿三星平板/DeX 的桌面端伪装）
 const ua = window.navigator.userAgent.toLowerCase();
 const isIOS = /ipad|iphone|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
 
 // 终极 Android 嗅探：
 // 1. UA 自带 android（常规手机）
 // 2. Client Hints API 明确告知底层是 Android（无视 UA 伪装）
 // 3. UA 伪装成了 Linux 电脑，但带有物理多点触控屏幕（完美涵盖三星平板“请求桌面网站”和 DeX 模式）
 const isAndroid = 
 /android/.test(ua) || 
 ((navigator as any).userAgentData?.platform === 'Android') ||
 (/linux/.test(ua) && navigator.maxTouchPoints > 1);

 if (isIOS) {
 setPlatform("ios"); // 苹果全系（iPhone + iPad）
 } else if (isAndroid) {
 setPlatform("android"); // 安卓全系（手机 + 平板）
 } else {
 setPlatform("pc"); // 电脑端
 }

 return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
 }, []);

 const handleDismiss = () => {
 setDismissed(true);
 sessionStorage.setItem("gx_app_guard_dismissed", "true");
 };

 const handleAndroidAction = async () => {
 if (platform === "pc") {
 // PC 端 PWA 系统级降临逻辑
 if (deferredPrompt) {
 deferredPrompt.prompt();
 const { outcome } = await deferredPrompt.userChoice;
 if (outcome === 'accepted') {
 setDeferredPrompt(null);
 handleDismiss();
 }
 }
 } else {
 // 安卓终极唤醒/下载逻辑 (世界顶级：双轨竞速协议 Double-Track Racing)
 const start = Date.now();
 let hasResponded = false;

 // 监听手机屏幕是否失去焦点（如果 APP 成功拉起，网页必定被系统挂起进入 hidden 状态）
 const handleVisibilityChange = () => {
 if (document.hidden) {
 hasResponded = true;
 }
 };
 document.addEventListener("visibilitychange", handleVisibilityChange);

 // 第 1 轨 (0ms)：发射隐形 Intent（带 fallback 兜底防报错）
 const fallbackUrl = encodeURIComponent("https://fx-rapallo.vercel.app/gx-core.apk");
 const intentUrl = `intent://fx-rapallo.vercel.app/#Intent;scheme=https;package=com.gx.core;S.browser_fallback_url=${fallbackUrl};end`;
 
 const a = document.createElement("a");
 a.href = intentUrl;
 a.style.display = "none";
 document.body.appendChild(a);
 a.click(); // 瞬间开枪！

 // 第 2 轨 (800ms)：生死时速裁判长
 setTimeout(() => {
 document.removeEventListener("visibilitychange", handleVisibilityChange);
 if (document.body.contains(a)) document.body.removeChild(a);

 // 如果 800ms 后，网页既没有被挂起，也没有隐藏，说明系统根本没去找 APP！
 if (!hasResponded && !document.hidden) {
 const elapsed = Date.now() - start;
 // 容错判断：如果时间流逝在 1200ms 以内（说明系统并没有因为打开 APP 导致 JS 线程严重阻塞），判定为“未安装”
 if (elapsed < 1200) {
 // 裁判宣判：强行拉起下载，不再干等系统的 2-3 秒！
 window.location.href = "https://fx-rapallo.vercel.app/gx-core.apk";
 }
 }
 }, 800);
 }
 };

 // 如果是原生、已关闭，或者 (是PC但不支持/已安装PWA)，空气般消失
 if (isNative || dismissed || (platform === "pc" && !deferredPrompt) || platform === "other") return null;

 return (
 <AnimatePresence>
 {/* iOS 赛博全息引导浮层 */}
 {platform === "ios" && (
 <motion.div
 
 
 
 className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
 >
 <div className="relative rounded-2xl bg-black/80 border border-white/20 p-5 text-center ">
 <button onClick={handleDismiss} className="absolute top-3 right-3 text-white hover:text-white ">
 <X className="w-4 h-4" />
 </button>
 
 <div className="space-y-4">
 <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
 <Share className="w-5 h-5 text-white" />
 </div>
 <div>
 <h3 className="text-sm text-white tracking-widest mb-1">{t('txt_b3de79')}</h3>
 <p className="text-xs text-white leading-relaxed">
 {t('txt_391968')}<span className="text-white mx-1">{t('txt_c31f48')}</span> {t('txt_55165d')}<br/>
 {t('txt_153fa6')}<span className="text-white mx-1">{t('txt_2d94a4')}</span> {t('txt_2fbaf0')}</p>
 </div>
 </div>

 {/* 向下指向分享按钮的光效箭头 */}
 <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center ">
 <div className="w-0.5 h-4 bg-gradient-to-b from-white/50 to-transparent" />
 </div>
 </div>
 </motion.div>
 )}

 {/* Android / PC 极简赛博唤醒/下载按钮 */}
 {(platform === "android" || platform === "pc") && (
 <motion.div
 
 
 
 className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
 >
 <div className="relative overflow-hidden rounded-2xl bg-black/60 border p-4 flex items-center justify-between group">
 <div className="absolute inset-0 bg-gradient-to-r from-transparent to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
 
 <div className="flex items-center gap-3 z-10">
 <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ">
 <Zap className="w-5 h-5 " />
 </div>
 <div className="flex flex-col text-left">
 <span className="text-sm text-white tracking-widest leading-none mb-1">{t('txt_c5d070')}</span>
 <span className="text-[11px] text-white leading-none">{t('txt_e66fa2')}</span>
 </div>
 </div>

 <div className="flex items-center gap-2 z-10">
 <button
 onClick={handleAndroidAction}
 className=" text-black text-xs px-4 py-2 rounded-full active:scale-95 whitespace-nowrap"
 >
 {t('txt_f3dda5')}</button>
 <button onClick={handleDismiss} className="text-white hover:text-white p-2 shrink-0 flex items-center justify-center">
 <X className="w-4 h-4" />
 </button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 );
};
