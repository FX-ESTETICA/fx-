"use client";

import { usePathname } from "next/navigation";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  // 登录页不显示 AppShell
  const isLoginPage = pathname === "/login" || pathname === "/";
  if (isLoginPage) return <>{children}</>;

  return (
    <div className="relative min-h-screen bg-black flex flex-col">
      {/* 内容区域 */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
};