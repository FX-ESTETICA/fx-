"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

export const TabGuard = () => {
  const [isSuspended, setIsSuspended] = useState(false);

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

  // 物理斩杀：一旦被挂起，强行切断所有底层的 Supabase 连接
  useEffect(() => {
    if (isSuspended) {
      import("@/lib/supabase").then(({ supabase }) => {
        supabase.removeAllChannels();
      });
    }
  }, [isSuspended]);

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
