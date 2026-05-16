"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { SWRConfig, mutate } from "swr";

export const GlobalSyncProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // 【世界顶端架构】：总线级信号融合锁
    // 专门对抗浏览器/移动端在唤醒瞬间同时触发 visibility、focus、pageshow 导致的信号风暴
    let lastSyncTime = 0;

    // 统一探针收口：向全系统广播静默同步事件
    const triggerGlobalSync = (reason: string) => {
      const now = Date.now();
      // 【融合锁】：如果是 500 毫秒内并发的唤醒事件，直接吞没，物理合并！
      // 这不影响后续（比如几秒后的）真正网络断开重连。
      if (now - lastSyncTime < 500) {
        console.log(`[GlobalSyncEngine] 🛡️ 信号融合锁启动，吞噬并发冗余信号: ${reason}`);
        return;
      }
      lastSyncTime = now;
      console.log(`[GlobalSyncEngine] 触发全局静默同步总线. 唤醒源: ${reason}`);
      window.dispatchEvent(new CustomEvent('gx-global-sync', { detail: { reason } }));
      // 物理斩杀信号：通知全网重建 WebSocket 长连接
      window.dispatchEvent(new CustomEvent('gx-websocket-resurrect', { detail: { reason } }));
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

    // =========================================================================
    // 【世界顶端：物理级全局缓存核弹 (已降级为仅供参考，实权已下放)】
    // 我们发现全局 mutate 常常因为 matcher 匹配失败而变成哑弹。
    // 因此，真正的唤醒数据拉取，已经全部下放到底层组件 (useRecentChats / useChatEngine) 中用原生 fetch 实现了！
    // 这里仅保留兜底的 mutate 轰炸，不再作为核心依赖。
    // =========================================================================
    const handleGlobalSyncCommand = () => {
      console.log("[GlobalSyncEngine] 💥 听到唤醒枪声，执行兜底级全局 SWR 缓存核弹轰炸 (核心拉取已下放到组件内部物理执行)...");
      
      // 1. 首发引爆：命令内存中所有存活的 SWR Key 立刻重新验证，不管组件是否挂载
      mutate(
        () => true, // 匹配所有 Key
        undefined,  // 不改变本地乐观数据
        { revalidate: true } // 强制向服务器发 Fetch
      );

      // 2. 错峰双发：等待 800ms，Android TCP/IP 彻底苏醒后，再进行一次饱和打击
      setTimeout(() => {
        console.log("[GlobalSyncEngine] 💥 SWR 错峰双发：800ms 强心针补刀，确保网络栈已就绪...");
        mutate(() => true, undefined, { revalidate: true });
      }, 800);
    };
    window.addEventListener("gx-global-sync", handleGlobalSyncCommand);

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

    // 【终极防御：探针 4】 物理时间跳跃检测 (Time-Jump Detection)
    // 专门对抗 iOS BFCache 解冻盲区、PWA 墓碑机制、Android Doze 深度休眠导致的系统事件丢失
    let lastTime = Date.now();
    const timeJumpInterval = setInterval(() => {
      const currentTime = Date.now();
      const delta = currentTime - lastTime;
      
      // 设定物理死亡线：如果发现两次执行的时间差超过 10 秒（正常应该是 2 秒左右）
      // 绝对证明 JS 线程刚刚被系统强制冰冻并重新解冻了，此时无视一切系统通知，强制触发唤醒重连
      if (delta > 10000) {
        console.warn(`[GlobalSyncEngine] ⏱️ 物理时间跳跃警报！检测到 ${Math.floor(delta / 1000)} 秒的线程冰冻，触发终极唤醒！`);
        triggerGlobalSync("time_jump_thaw");
      }
      
      lastTime = currentTime;
    }, 2000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("gx-global-sync", handleGlobalSyncCommand);
      window.removeEventListener("online", handleOnline);
      if (typeof window !== "undefined") {
        delete (window as any).gxForceWakeUp;
      }
      if (appStateListener && appStateListener.remove) {
        appStateListener.remove();
      }
      clearInterval(timeJumpInterval);
    };
  }, []);

  return (
    <SWRConfig
      value={{
        // 强制开启焦点和重连验证，保证 SWR 层面的绝对最新
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        // 【大拆锁】：彻底废除 SWR 默认的 5 秒唤醒冷却期！只要收到唤醒信号，哪怕是 1 毫秒后也要重发！
        focusThrottleInterval: 0,
        // 【大拆锁】：缩短全局去重时间到 500ms（原为 2000ms），给“错峰双发”的 800ms 补刀留出绿灯通道
        dedupingInterval: 500,
        // initFocus 已经被废弃，我们在 useEffect 中使用全局 mutate 接管了唤醒轰炸
      }}
    >
      {children}
    </SWRConfig>
  );
};
