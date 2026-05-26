"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import { useSyncStore } from '@/store/useSyncStore';

export const TabGuard = () => {
  const [isSuspended, setIsSuspended] = useState(false);

  // 世界顶级：时空跳跃探测器 (Time Skip Detector) + 物理心跳探针 (Low-Power Ping)
  useEffect(() => {
    let lastTick = Date.now();
    let lastPing = Date.now();

    const interval = setInterval(async () => {
      const now = Date.now();
      
      // 1. 防御休眠：如果两次 tick 间隔超过 10 秒，物理证明 JS 线程刚刚被系统冷冻并解冻了
      if (now - lastTick > 10000) {
        console.log("⚠️ [TabGuard] 检测到时空跳跃！强制触发全局唤醒！");
        useSyncStore.getState().triggerSync("time_skip_detected");
      }
      lastTick = now;

      // 2. 防御亮屏死锁：每隔 3 分钟 (180000 毫秒) 射出一发超轻量级物理探针
      if (now - lastPing > 180000) {
        lastPing = now;
        try {
          // 极低开销探针：仅获取一个最新版本号字符串，不查数据库
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒物理死亡线
          
          const res = await fetch(`/api/version?t=${Date.now()}`, { 
            signal: controller.signal,
            cache: "no-store" 
          });
          
          clearTimeout(timeoutId);

          if (!res.ok) {
            throw new Error(`Ping HTTP error: ${res.status}`);
          }
          // 探针存活，系统健康，什么都不做
        } catch (error) {
          // 探针坠毁！证明 TCP 隧道已被掐断或网络静默死亡
          console.warn("💀 [TabGuard] 物理心跳探针坠毁！检测到亮屏静默死锁，正在执行全局涅槃重建...", error);
          // 触发最高级指令：重建底层连接并全量补扫
          useSyncStore.getState().triggerResurrect("silent_drop_detected");
        }
      }
    }, 2000); // 每 2 秒检查一次时空，但 Ping 探针内部控制 3 分钟发一次

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.BroadcastChannel) return;

    const channel = new BroadcastChannel("gx_tab_guard");

    // 当当前标签页变为可见或加载时，通知其他标签页
    const announceActive = () => {
      if (document.visibilityState === "visible") {
        setIsSuspended(false);
        channel.postMessage({ type: "takeover", id: Date.now() });
      }
    };

    // 初始加载时宣告
    announceActive();

    // 监听其他标签页的接管宣告
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "takeover") {
        // 其他标签页接管了，暂停当前标签页
        setIsSuspended(true);
      }
    };

    channel.addEventListener("message", handleMessage);
    document.addEventListener("visibilitychange", announceActive);

    return () => {
      channel.removeEventListener("message", handleMessage);
      document.removeEventListener("visibilitychange", announceActive);
      channel.close();
    };
  }, []);

  const handleResume = () => {
    setIsSuspended(false);
    if (window.BroadcastChannel) {
      const channel = new BroadcastChannel("gx_tab_guard");
      channel.postMessage({ type: "takeover", id: Date.now() });
      channel.close();
    }
    // 世界顶级防线：为了确保底层 WebSocket 通道完美重建，直接物理重载当前页面
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {isSuspended && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-xl"
        >
          <div className="flex flex-col items-center gap-6 p-8 rounded-3xl bg-white/5 border border-white/10 max-w-sm text-center shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Zap className="w-8 h-8 text-white" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-widest">连接已休眠</h2>
              <p className="text-sm text-white/60 leading-relaxed tracking-wider">
                您在另一个标签页打开了系统。<br/>为了释放并发资源并保持0延迟同步，<br/>当前页面的实时通信已被自动挂起。
              </p>
            </div>

            <button
              onClick={handleResume}
              className="mt-4 px-8 py-3 bg-white text-black text-sm font-bold tracking-widest rounded-full hover:scale-105 active:scale-95 transition-transform"
            >
              在此页面恢复使用
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
