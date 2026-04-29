"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export function PWAUpdater() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 先注册 SW (幂等操作)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // 通过探针检查 Vercel 最新版本
    const checkVersion = async () => {
      try {
        const res = await fetch("/api/version", { 
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

        // 如果本地没有记录，存下来（首次访问）
        if (!currentVersion) {
          localStorage.setItem("gx_core_version", fetchedVersion);
          return;
        }

        // 如果是本地开发环境 ('dev')，忽略更新提示
        if (fetchedVersion === 'dev' || currentVersion === 'dev') {
          return;
        }

        // 发现 Vercel 有新部署的版本！
        if (currentVersion !== fetchedVersion) {
          setLatestVersion(fetchedVersion);
          setShowPrompt(true);
        }
      } catch (err) {
        console.warn("[GX Updater] 探针检测失败，可能处于离线状态", err);
      }
    };

    // 页面加载时检查一次
    checkVersion();

    // 每次 APP 从后台切回前台时，主动触发静默检查
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleSync = async () => {
    try {
      // 1. 物理清空 Service Worker 缓存池
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys.map(key => {
            if (key.includes('gx-core-cache')) {
              return caches.delete(key);
            }
          })
        );
      }
      
      // 2. 给 SW 发送清理指令（如果有的话，双保险）
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      }

      // 3. 更新本地版本号
      if (latestVersion) {
        localStorage.setItem("gx_core_version", latestVersion);
      }

      // 4. 强制物理重载，由于缓存已空，SW 将从 Vercel 网络直连拉取最新代码
      setShowPrompt(false);
      window.location.reload();
      
    } catch (err) {
      console.error("[GX Updater] 同步失败:", err);
      window.location.reload(); // 兜底刷新
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[99999] animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="bg-black/70 backdrop-blur-xl border border-white/10 rounded-full px-5 py-2.5 flex items-center gap-3 shadow-2xl drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
        <div className="flex items-center gap-2">
          {/* 星云呼吸灯 */}
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]"></div>
          <span className="text-[13px] font-medium text-white/90 tracking-wide whitespace-nowrap">
            星云链路已进化
          </span>
        </div>
        
        <div className="w-[1px] h-3.5 bg-white/20"></div>
        
        <button
          onClick={handleSync}
          className="text-[13px] font-semibold text-cyan-300 hover:text-cyan-200 transition-colors flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>立即同步</span>
        </button>
      </div>
    </div>
  );
}
