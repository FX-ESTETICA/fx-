"use client";

import { useEffect, useState } from "react";
import { App } from '@capacitor/app';

export function OTAUpdater() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 彻底放过本地开发环境
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return;
    }

    const checkVersionAndSilentUpdate = async () => {
      try {
        const res = await fetch(`/api/version?t=${Date.now()}`, { 
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          }
        });
        const data = await res.json();
        const currentVersion = localStorage.getItem("gx_core_version");
        const fetchedVersion = data.version;

        if (!currentVersion) {
          localStorage.setItem("gx_core_version", fetchedVersion);
          return;
        }

        if (fetchedVersion === 'dev' || currentVersion === 'dev') {
          return;
        }

        if (currentVersion !== fetchedVersion) {
          console.log(`[GX Updater] 发现新版本: ${fetchedVersion}，启动全量静默更新...`);
          setIsUpdating(true);
          
          // 彻底粉碎旧版 Service Worker 和 Cache API，防止任何缓存玄学干扰
          if ('serviceWorker' in navigator) {
            try {
              const regs = await navigator.serviceWorker.getRegistrations();
              for (const reg of regs) {
                await reg.unregister();
              }
            } catch (e) {}
          }
          if ('caches' in window) {
            try {
              const cacheNames = await caches.keys();
              await Promise.all(
                cacheNames.filter(name => name.includes('gx')).map(name => caches.delete(name))
              );
            } catch (e) {}
          }

          // 物理预下载开始
          await performPhysicalPreload();

          // 下载完成，保存新版本号并重载
          localStorage.setItem("gx_core_version", fetchedVersion);
          
          // 稍作延迟让用户看清 100%
          setTimeout(() => {
            // 物理强袭重载：在 URL 附加强制更新时间戳，彻底击穿 WKWebView 的顽固缓存
            const url = new URL(window.location.href);
            url.searchParams.set('gx_force_update', Date.now().toString());
            window.location.href = url.toString();
          }, 800);
        }
      } catch (err) {
        console.warn("[GX Updater] 探针检测失败，可能处于离线状态", err);
      }
    };

    // 初始检查
    checkVersionAndSilentUpdate();

    // 每次 APP 从后台切回前台时，主动触发静默检查
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersionAndSilentUpdate();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Capacitor AppState 唤醒时检查
    let appStateListener: { remove: () => void } | null = null;
    if (typeof App !== 'undefined' && App.addListener) {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) checkVersionAndSilentUpdate();
      }).then(listener => {
        appStateListener = listener;
      }).catch(() => {});
    }

    // 轮询探针（每3分钟检测一次，确保长驻前台也能收到更新）
    const interval = setInterval(checkVersionAndSilentUpdate, 3 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (appStateListener && appStateListener.remove) appStateListener.remove();
      clearInterval(interval);
    };
  }, []);

  const performPhysicalPreload = async () => {
    try {
      // 1. 强行拉取最新的 index.html
      const htmlRes = await fetch(`/?t=${Date.now()}`, { cache: 'no-store' });
      const htmlText = await htmlRes.text();
      
      // 2. 纯文本解析，提取 JS/CSS 资源 (不用 DOMParser 避免在某些 WebView 下的安全限制)
      const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
      // 匹配 href 在前或 href 在后的两种 link 写法
      const linkRegex1 = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi;
      const linkRegex2 = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["']/gi;
      
      const resources: string[] = [];
      let match;
      
      while ((match = scriptRegex.exec(htmlText)) !== null) {
        resources.push(match[1]);
      }
      while ((match = linkRegex1.exec(htmlText)) !== null) {
        resources.push(match[1]);
      }
      while ((match = linkRegex2.exec(htmlText)) !== null) {
        resources.push(match[1]);
      }
      
      // 过滤第三方资源，只预加载本站的静态文件 (如 /_next/static/...)
      const origin = window.location.origin;
      const internalResources = resources.filter(url => {
        return url.startsWith('/_next/') || (url.startsWith(origin) && url.includes('/_next/'));
      });
      
      const uniqueResources = Array.from(new Set(internalResources));
      
      if (uniqueResources.length === 0) {
         setProgress(100);
         return;
      }

      let loaded = 0;
      const total = uniqueResources.length;
      
      // 3. 并发强行预载
      await Promise.all(uniqueResources.map(async (url) => {
        try {
          // fetch 本身会将资源存入浏览器的底层网络缓存中
          await fetch(url, { cache: "reload" }); 
        } catch {
          console.warn("[GX Updater] Preload chunk failed:", url);
        } finally {
          loaded++;
          // 更新进度条
          setProgress(Math.floor((loaded / total) * 100));
        }
      }));

    } catch (err) {
      console.error("[GX Updater] Physical preload failed", err);
      setProgress(100); // 失败也让进度条走完重载流程
    }
  };

  if (!isUpdating) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xl transition-all duration-500">
      <div className="w-80 rounded-2xl border border-white/20 bg-black/40 p-6 shadow-[0_0_50px_rgba(255,255,255,0.1)] text-center relative overflow-hidden flex flex-col items-center">
        {/* Cyberpunk Glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-80 shadow-[0_0_15px_#0ff]"></div>
        
        <h3 className="text-white font-medium text-lg tracking-widest mb-4 uppercase">System Update</h3>
        <p className="text-white/50 text-sm mb-6">正在同步最新版本...</p>
        
        {/* Progress Bar Container */}
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mb-3 relative">
          <div 
            className="absolute top-0 left-0 h-full bg-cyan-400 shadow-[0_0_15px_#0ff] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Percentage */}
        <div className="text-cyan-400 font-mono text-xs tracking-[0.2em] animate-pulse">
          {progress}%
        </div>
      </div>
    </div>
  );
}