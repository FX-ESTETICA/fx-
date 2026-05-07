"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { SWRConfig } from "swr";

export const GlobalSyncProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // 统一探针收口：向全系统广播静默同步事件
    const triggerGlobalSync = (reason: string) => {
      console.log(`[GlobalSyncEngine] 触发全局静默同步总线. 唤醒源: ${reason}`);
      window.dispatchEvent(new CustomEvent('gx-global-sync', { detail: { reason } }));
    };

    // 探针 1: 浏览器前后台切换 (Visibility Change)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerGlobalSync("visibility_visible");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 探针 1.5: 补充网页焦点事件 (Focus) 解决 WebView/套壳 唤醒盲区
    const handleFocus = () => {
      triggerGlobalSync("window_focus");
    };
    window.addEventListener("focus", handleFocus);

    // 探针 1.6: 补充 BFCache 恢复事件 (PageShow) 解决 iOS 返回缓存盲区
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        triggerGlobalSync("page_show_persisted");
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    // 探针 2: 网络恢复 (Online)
    const handleOnline = () => {
      triggerGlobalSync("network_online");
    };
    window.addEventListener("online", handleOnline);

    // 万能探针：供任何第三方 App 套壳 (WebView) 从原生端手动触发
    // iOS (Swift): webView.evaluateJavaScript("window.gxForceWakeUp && window.gxForceWakeUp()")
    // Android (Java/Kotlin): webView.evaluateJavascript("window.gxForceWakeUp && window.gxForceWakeUp()", null)
    if (typeof window !== "undefined") {
      (window as any).gxForceWakeUp = () => {
        triggerGlobalSync("manual_force_wakeup");
      };
    }

    // 探针 3: Capacitor APP 原生前后台唤醒 (AppState Change)
    let appStateListener: any = null;
    if (Capacitor.isNativePlatform() && App && App.addListener) {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          triggerGlobalSync("capacitor_app_active");
        }
      }).then(listener => {
        appStateListener = listener;
      }).catch(err => {
        console.warn("[GlobalSyncEngine] Capacitor AppState listener failed to attach", err);
      });
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("online", handleOnline);
      if (typeof window !== "undefined") {
        delete (window as any).gxForceWakeUp;
      }
      if (appStateListener && appStateListener.remove) {
        appStateListener.remove();
      }
    };
  }, []);

  return (
    <SWRConfig
      value={{
        // 强制开启焦点和重连验证，保证 SWR 层面的绝对最新
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        // 自定义 SWR 唤醒探针：将 Capacitor 唤醒也接入 SWR 的刷新周期
        initFocus(callback) {
          let appStateListener: any = null;

          const onVisibilityChange = () => {
            if (document.visibilityState === "visible") callback();
          };
          const onFocus = () => callback();
          const onPageShow = (e: PageTransitionEvent) => {
            if (e.persisted) callback();
          };

          document.addEventListener("visibilitychange", onVisibilityChange);
          window.addEventListener("focus", onFocus);
          window.addEventListener("pageshow", onPageShow);

          if (typeof window !== "undefined") {
            const originalForceWakeUp = (window as any).gxForceWakeUp;
            (window as any).gxForceWakeUp = () => {
              if (originalForceWakeUp) originalForceWakeUp();
              callback();
            };
          }

          if (Capacitor.isNativePlatform() && App && App.addListener) {
            App.addListener('appStateChange', ({ isActive }) => {
              if (isActive) callback();
            }).then(listener => {
              appStateListener = listener;
            }).catch(() => {});
          }

          return () => {
            document.removeEventListener("visibilitychange", onVisibilityChange);
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("pageshow", onPageShow);
            if (appStateListener && appStateListener.remove) appStateListener.remove();
          };
        }
      }}
    >
      {children}
    </SWRConfig>
  );
};
