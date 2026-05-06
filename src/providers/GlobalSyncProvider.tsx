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

    // 探针 2: 网络恢复 (Online)
    const handleOnline = () => {
      triggerGlobalSync("network_online");
    };
    window.addEventListener("online", handleOnline);

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
      window.removeEventListener("online", handleOnline);
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

          document.addEventListener("visibilitychange", onVisibilityChange);
          window.addEventListener("focus", onFocus);

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
            if (appStateListener && appStateListener.remove) appStateListener.remove();
          };
        }
      }}
    >
      {children}
    </SWRConfig>
  );
};
