"use client";

import { useEffect } from "react";

export function PWAUpdater() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 彻底放过本地开发环境，防止拦截 Next.js 的 Hot Reload 编译
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return;
    }

    // 先注册 SW (幂等操作)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // 零感知进化核心：只负责探针检查和触发后台缓存更新，绝不弹窗打断用户
    const checkVersionAndSilentUpdate = async () => {
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

        // 如果是本地开发环境 ('dev')，忽略
        if (fetchedVersion === 'dev' || currentVersion === 'dev') {
          return;
        }

        // 发现 Vercel 有新部署的版本！
        if (currentVersion !== fetchedVersion) {
          console.log(`[GX Updater] 发现新版本: ${fetchedVersion}，正在后台静默下载...`);
          
          // 1. 更新本地版本号记录
          localStorage.setItem("gx_core_version", fetchedVersion);

          // 2. 触发 ServiceWorker 主动拉取最新版（SW 的 update 方法会触发重新请求 sw.js 并重新进入 install 生命周期）
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            if (reg) {
              await reg.update();
            }
          }
          
          // 注意：我们绝对不执行 window.location.reload()。
          // 当用户下一次关闭并重新打开 App 时，或者在应用自然卸载/重载时，新的 SW 缓存将自动生效。
        }
      } catch (err) {
        console.warn("[GX Updater] 探针检测失败，可能处于离线状态", err);
      }
    };

    // 页面加载时检查一次
    checkVersionAndSilentUpdate();

    // 每次 APP 从后台切回前台时，主动触发静默检查
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersionAndSilentUpdate();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // 世界顶级软件设计：绝对不要弹窗打断用户的当前心流，返回 null
  return null;
}
