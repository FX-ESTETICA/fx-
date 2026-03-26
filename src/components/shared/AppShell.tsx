"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/utils/cn";
import { Home, Compass, User } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
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
    <div className="relative min-h-screen bg-black flex flex-col">
      <div className="flex-1">
        {children}
      </div>
      {showBottomTabs && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="mx-auto max-w-[900px] px-4 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-around rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-2">
              {tabRoutes.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <button
                    key={href}
                    onClick={() => router.push(href)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all",
                      active ? "text-gx-cyan" : "text-white/40 hover:text-white/70"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", active ? "drop-shadow-[0_0_12px_rgba(0,240,255,0.35)]" : "")} />
                    <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
