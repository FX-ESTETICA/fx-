"use client";

import { useEffect, useState } from "react";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { useRouter } from "next/navigation";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { FileTransfer } from "@capacitor/file-transfer";
import { FileOpener } from "@capacitor-community/file-opener";
import { useTranslations } from "next-intl";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useViewStack } from "@/hooks/useViewStack";

export function NativeBridgeProvider() {
    const t = useTranslations('NativeBridgeProvider');
  const router = useRouter();
  const [updateInfo, setUpdateInfo] = useState<{ needsUpdate: boolean; url: string; notes: string } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // --- A. 启动级：强制更新版本检测 ---
      const checkUpdate = async () => {
        try {
          // 1. 获取当前 App 壳子的物理版本号
          const info = await CapacitorApp.getInfo();
          const currentVersion = info.version; // e.g., "1.0"
          
          // 2. 拉取云端最低版本要求
          const res = await fetch("https://fx-rapallo.vercel.app/app-config.json?t=" + Date.now());
          const config = await res.json();
          const minVersion = config.android.min_version;

          // 3. 简易版本对比算法 (1.0 vs 1.0.0)
          const v1 = currentVersion.split('.').map(Number);
          const v2 = minVersion.split('.').map(Number);
          let needsUpdate = false;
          for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
            const num1 = v1[i] || 0;
            const num2 = v2[i] || 0;
            if (num1 < num2) { needsUpdate = true; break; }
            if (num1 > num2) { break; }
          }

          if (needsUpdate) {
            setUpdateInfo({
              needsUpdate: true,
              url: config.android.download_url,
              notes: config.android.release_notes
            });
          }
        } catch (e) {
          console.error("[Native] Failed to check update:", e);
        }
      };
      checkUpdate();

      // --- B. 初始化谷歌登录原生插件 (一键回退到纯净 Web ID) ---
      try {
        GoogleAuth.initialize({
          clientId: "759484201665-h43394q58q16bv83veij84mmbbautl0g.apps.googleusercontent.com",
          scopes: ["profile", "email"],
          grantOfflineAccess: true,
        });
      } catch (e) {
        console.warn("GoogleAuth init warning (often ignored on mobile):", e);
      }

      // 1. 初始化原生状态栏（彻底隐藏，实现极致全屏无字沉浸）
      const initNative = async () => {
        try {
          // 隐藏系统状态栏（电池、时间全部消失）
          await StatusBar.hide();
          // 如果某些机型或弹窗导致状态栏重新出现，确保它依然是沉浸透明的作为 fallback
          await StatusBar.setOverlaysWebView({ overlay: true });
          await StatusBar.setStyle({ style: Style.Dark });
        } catch (e) {
          console.warn("Status bar initialization failed:", e);
        }
      };
      initNative();

      // C. 顶端架构：接管安卓物理返回键（实现多级平滑回退、弹层拦截与状态机同步、二次退出）
      let lastBackPressTime = 0;
      CapacitorApp.addListener("backButton", () => {
        // 1. 最高优先级：触发物理拦截栈（如有打开的聊天室、日历侧边栏等，则仅关闭该子界面）
        const { pop } = useHardwareBack.getState();
        if (pop()) return; // 拦截器已消费该事件，终止后退

        const path = window.location.pathname;
        
        // 2. 第二优先级：主导航归位（发现、聊天、我的页 -> 强制归位到首页，修复 SPA Tab 切换无历史记录的问题）
        const mainTabs = ['/discovery', '/chat', '/me', '/dashboard'];
        if (mainTabs.some(p => path.startsWith(p))) {
          const { setActiveTab } = useViewStack.getState();
          setActiveTab('home');
          router.replace('/');
          return;
        }
        
        // 特殊处理：如果当前在星云主界面 (/nebula) 或数字门店 (/studio)，物理返回键必须强制切回“我的”页 (Dashboard/Me)
        if (path.startsWith('/nebula') || path.startsWith('/studio')) {
          const { setActiveTab } = useViewStack.getState();
          setActiveTab('me');
          router.replace('/dashboard');
          return;
        }

        // 3. 第三优先级：如果已经在首页或登录页，则触发【双击退出】逻辑
        if (path === '/home' || path === '/' || path === '/login') {
          const currentTime = new Date().getTime();
          if (currentTime - lastBackPressTime < 2000) {
            CapacitorApp.exitApp();
          } else {
            lastBackPressTime = currentTime;
            // 触发原生 Toast 提示 (这里简单处理，实际生产可能需要调用 @capacitor/toast)
            console.log("再按一次退出应用 / Press again to exit");
            // 可选：在这里可以通过一个全局状态展示个幽灵 Toast "再按一次退出"
          }
        } else {
          // 4. 常规后退：比如日历页面，为了保证绝对不会闪退，我们强制将日历退回到“我的”页，因为大多数人是从“我的”进的日历
          if (path.startsWith('/calendar')) {
            const { setActiveTab } = useViewStack.getState();
            setActiveTab('me');
            router.replace('/dashboard');
          } else {
            router.back();
          }
        }
      });

      // D. 监听深度链接 (Deep Links/App Links) 唤醒事件
      CapacitorApp.addListener("appUrlOpen", (data) => {
        try {
          const url = new URL(data.url);
          // 仅拦截属于我们网站的路径，如果是别的外部链接不予理会
          if (url.hostname === "fx-rapallo.vercel.app") {
            // 平滑跳转到链接对应的页面，比如 /discovery
            router.push(url.pathname + url.search);
          }
        } catch (e) {
          console.error("[Native] Error parsing appUrlOpen data:", e);
        }
      });
    }

    return () => {
      if (Capacitor.isNativePlatform()) {
        CapacitorApp.removeAllListeners();
      }
    };
  }, [router]);

  // 如果检测到需要强制更新，渲染全屏锁死遮罩层
  if (updateInfo?.needsUpdate) {
    return (
      <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white overflow-hidden">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
          {/* 赛博朋克光晕背景 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-32 bg-cyan-500/20 blur-[60px] pointer-events-none"></div>
          
          <div className="w-20 h-20 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(6,182,212,0.5)]">
            <span className="text-4xl">🚀</span>
          </div>
          
          <h2 className="text-2xl font-bold mb-3 tracking-wide">{t('txt_1bb828')}</h2>
          
          <div className="text-zinc-400 mb-8 text-sm leading-relaxed whitespace-pre-wrap text-left w-full bg-black/40 p-4 rounded-2xl border border-white/5">
            {updateInfo.notes}
          </div>
          
          <button
            onClick={async () => {
              if (isDownloading) return;
              try {
                setIsDownloading(true);
                setDownloadProgress(0);

                // 1. 注册进度监听
                const progressListener = await FileTransfer.addListener('progress', (progress: { lengthComputable: boolean; type: string; bytes: number; contentLength: number }) => {
                  if (progress.lengthComputable && progress.type === 'download') {
                    setDownloadProgress(Math.round((progress.bytes / progress.contentLength) * 100));
                  }
                });

                // 2. 获取沙盒内的下载绝对路径
                const { uri } = await Filesystem.getUri({ directory: Directory.Data, path: "update.apk" });

                // 3. 开启二进制流真实下载
                const downloadResult = await FileTransfer.downloadFile({
                  url: updateInfo.url,
                  path: uri,
                  progress: true
                });

                progressListener.remove();

                // 4. 原生唤醒系统安装器 (APK)
                if (downloadResult.path) {
                  await FileOpener.open({
                    filePath: downloadResult.path,
                    contentType: 'application/vnd.android.package-archive',
                    openWithDefault: true
                  });
                } else {
                  throw new Error("Download path is undefined");
                }

              } catch (e) {
                console.error("[Native] Download failed:", e);
                // 失败回退到系统浏览器
                window.open(updateInfo.url, '_system');
              } finally {
                setIsDownloading(false);
              }
            }}
            disabled={isDownloading}
            className={`relative w-full py-4 rounded-xl font-bold text-white transition-all overflow-hidden ${
              isDownloading 
                ? "bg-zinc-800 border border-zinc-700" 
                : "bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            {/* 真实物理进度条 UI */}
            {isDownloading && (
              <div 
                className="absolute left-0 top-0 bottom-0 bg-cyan-600/50 transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            )}
            
            <div className="relative z-10 flex items-center justify-center gap-2">
              {isDownloading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                  {t('txt_d8fbcd')}{downloadProgress}%
                </>
              ) : (
                "立即下载体验"
              )}
            </div>
          </button>
        </div>
      </div>
    );
  }

  return null;
}

