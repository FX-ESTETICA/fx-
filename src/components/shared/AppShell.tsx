"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/utils/cn";
import { Home, Compass, User } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { PWAInstallPrompt } from "./PWAInstallPrompt";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const isLoginPage = pathname === "/login" || pathname === "/";
  if (isLoginPage) return <>{children}</>;

  const tabRoutes = [
    { href: "/home", label: "首页", icon: Home },
    { href: "/discovery", label: "发现", icon: Compass },
    { href: user ? "/dashboard" : "/me", label: "我的", icon: User },
  ];
  const showBottomTabs = ["/home", "/discovery", "/me", "/dashboard"].includes(pathname || "");

  return (
    <div className="relative min-h-screen bg-transparent flex flex-col">
      <PWAInstallPrompt />
      <div className="flex-1">
        {children}
      </div>
      {showBottomTabs && (
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
          {/* 
            【返璞归真法则】: 彻底移除 transformZ 和 mixBlendMode。
            使用最原始的 rgba 线性渐变，防止任何移动端浏览器或 WebKit 内核触发底层的“模糊/重绘”Bug。
            这确保了在所有设备上都是绝对通透的“无界幽灵”状态。
          */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" 
            style={{ background: 'linear-gradient(to top, rgba(0,0,0, 0.9) 0%, rgba(0,0,0, 0) 100%)' }} 
          />
          <div className="mx-auto w-[clamp(320px,60vw,900px)] px-4 pb-[env(safe-area-inset-bottom)] relative pointer-events-auto">
            {/* 彻底去除背景与边框，实现幽灵态全息悬浮 */}
            <div className="flex items-center justify-around p-2 bg-transparent">
              {tabRoutes.map(({ href, label, icon: Icon }) => {
                // 智能激活态：如果当前是我的页或仪表盘，且标签为"我的"，则保持高亮
                const active = pathname === href || (label === "我的" && (pathname === "/me" || pathname === "/dashboard"));
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
      )}
    </div>
  );
};
