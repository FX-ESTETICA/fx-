"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/utils/cn";
import { Home, Compass, User, MessageSquare } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

export const BottomNavBar = ({ className }: { className?: string }) => {
  const t = useTranslations('BottomNavBar');
  const pathname = usePathname();
  const { user } = useAuth();
  
  // 闲置渐隐状态控制
  const [isIdle, setIsIdle] = useState(false);

  // 监听全屏交互重置 3 秒闲置定时器
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetIdleTimer = () => {
      setIsIdle(false);
      clearTimeout(timeoutId);
      // 3秒无任何操作进入幽灵渐隐态
      timeoutId = setTimeout(() => setIsIdle(true), 3000);
    };

    // 绑定绝大多数能代表用户“活跃”的事件
    window.addEventListener("mousemove", resetIdleTimer);
    window.addEventListener("touchstart", resetIdleTimer);
    window.addEventListener("touchmove", resetIdleTimer);
    window.addEventListener("keydown", resetIdleTimer);
    window.addEventListener("scroll", resetIdleTimer, true); // 捕获所有容器的滚动

    // 初始启动计时器
    resetIdleTimer();

    return () => {
      window.removeEventListener("mousemove", resetIdleTimer);
      window.removeEventListener("touchstart", resetIdleTimer);
      window.removeEventListener("touchmove", resetIdleTimer);
      window.removeEventListener("keydown", resetIdleTimer);
      window.removeEventListener("scroll", resetIdleTimer, true);
      clearTimeout(timeoutId);
    };
  }, [pathname]); // 路由切换也重置

  // 缝合聊天大枢纽入口
  const tabRoutes = [
    { href: "/home", label: t('nav_home'), icon: Home },
    { href: "/discovery", label: t('nav_discovery'), icon: Compass },
    { href: "/chat", label: t('nav_chat'), icon: MessageSquare },
    { href: user ? "/dashboard" : "/me", label: t('nav_me'), icon: User },
  ];

  return (
    <div 
      className={cn(
        "z-50 pointer-events-none transition-opacity duration-1000",
        isIdle ? "opacity-0" : "opacity-100",
        className
      )}
    >
      {/* 
        【返璞归真法则】: 彻底移除 transformZ 和 mixBlendMode。
        使用最原始的 rgba 线性渐变，防止任何移动端浏览器或 WebKit 内核触发底层的“模糊/重绘”Bug。
        这确保了在所有设备上都是绝对通透的“无界幽灵”状态。
      */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" 
        style={{ background: 'linear-gradient(to top, rgba(0,0,0, 0.9) 0%, rgba(0,0,0, 0) 100%)' }} 
      />
      <div className="w-full px-4 pb-[env(safe-area-inset-bottom)] relative pointer-events-auto">
        {/* 彻底去除背景与边框，实现幽灵态全息悬浮 */}
        <div className="flex items-center justify-around p-2 bg-transparent">
          {tabRoutes.map(({ href, label, icon: Icon }) => {
            // 智能激活态：如果当前是我的页或仪表盘，且标签为"我的"，则保持高亮
            const active = pathname === href || (label === t('nav_me') && (pathname === "/me" || pathname === "/dashboard"));
            return (
              <Link
                key={label} // 使用稳定的 label 作为 key，防止 href 变化导致组件卸载重绘
                href={href}
                prefetch={true} // 启用 Next.js 原生预加载，实现真正的秒开
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all",
                  active ? "text-gx-cyan" : "text-white/40 hover:text-white/70"
                )}
              >
                <Icon className={cn("w-5 h-5", active ? "drop-shadow-[0_0_12px_rgba(0,240,255,0.5)]" : "drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]")} />
                <span className="text-[10px] font-mono uppercase tracking-widest drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
