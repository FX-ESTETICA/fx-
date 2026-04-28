"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import { Home, Compass, User, MessageSquare } from "lucide-react";

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
        "z-50 pointer-events-none",
        className
      )}
    >
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
                    : (isLight ? "text-black hover:text-black" : "text-white hover:text-white")
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
