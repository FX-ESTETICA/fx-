"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import { Home, Compass, User, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useViewStack, TabId } from "@/hooks/useViewStack";
import { useActiveTab } from "@/hooks/useActiveTab";
import { useVisualSettings } from "@/hooks/useVisualSettings";

export const BottomNavBar = ({ className }: { className?: string }) => {
  const t = useTranslations('BottomNavBar');
  const pathname = usePathname();
  const { setActiveTab } = useViewStack();
  const activeTab = useActiveTab();
  const { settings } = useVisualSettings();
  const isLight = settings.frontendBgIndex !== 0;

  
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
  const tabRoutes: { id: TabId, label: string, icon: any }[] = [
    { id: "home", label: t('nav_home'), icon: Home },
    { id: "discovery", label: t('nav_discovery'), icon: Compass },
    { id: "chat", label: t('nav_chat'), icon: MessageSquare },
    { id: "me", label: t('nav_me'), icon: User },
  ];

  return (
    <div 
      className={cn(
        "z-50 pointer-events-none transition-opacity duration-1000",
        isIdle ? "opacity-0" : "opacity-100",
        className
      )}
    >
      <div 
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" 
        style={{ background: 'linear-gradient(to top, rgba(0,0,0, 0.9) 0%, rgba(0,0,0, 0) 100%)' }} 
      />
      <div className="w-full px-4 pb-[env(safe-area-inset-bottom)] relative pointer-events-auto">
        <div className="flex items-center justify-around p-2 bg-transparent">
          {tabRoutes.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id || (id === "me" && activeTab === "dashboard" as any);
            return (
              <button
                key={label}
                onClick={() => {
                  // 【降维打击终极防逃逸】：如果当前其实并不在主舞台 (MainStage)，
                  // 比如通过手速或者后退键到了星云页面，点击底导时必须强制 router.push('/')
                  // 然后再派发 setActiveTab，从而强行把用户拉回单页架构的世界！
                  // 【修复】：/chat 页面已经在我们的白名单里，不再属于外部逃逸页面，不需要重置！
                  if (!["/", "/home", "/dashboard", "/me", "/chat", "/discovery", "/calendar"].some(p => pathname === p || pathname.startsWith("/calendar/"))) {
                    window.location.href = '/';
                    // 不用等待跳转，直接先改状态，下个页面瞬间就对位
                    setTimeout(() => setActiveTab(id), 10);
                  } else {
                    setActiveTab(id);
                  }
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all",
                  active 
                    ? (isLight ? "text-black" : "text-white") 
                    : (isLight ? "text-black/40 hover:text-black/70" : "text-white/40 hover:text-white/70")
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
