"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AppPlatformGuard } from "./AppPlatformGuard";
import { CyberOnboardingModal } from "./CyberOnboardingModal";
import { BottomNavBar } from "./BottomNavBar";
import { GlobalWormholeCapsule } from "./GlobalWormholeCapsule";
import { SubscriptionLimitModal } from "@/features/nebula/components/SubscriptionLimitModal";
import { useShop } from "@/features/shop/ShopContext";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const { subscriptionModalMode, closeSubscriptionModal, subscription } = useShop();

  const isStandalonePage = pathname === "/login" || pathname === "/" || pathname === "/vision";
  // 白名单路由：绝对放行，防止回调死锁
  const isPublicRoute = isStandalonePage || pathname === "/auth/callback";
  
  if (isStandalonePage) return <>{children}</>;

  // 终极上下文屏蔽：发现页和聊天室内（由于使用统一路由 /chat，通过 zustand 状态判断）彻底拔除底栏
  const isDiscovery = pathname === "/discovery";
  
  // 电脑端：聊天页面全局不显示底栏，由聊天页面自身在左侧渲染 BottomNavBar
  // 手机端：进入聊天室(activeChat !== null)才隐藏，否则显示全局底栏
  // 但为了简化逻辑，既然电脑端已经在左侧渲染了，全局的 BottomNavBar 在 /chat 路由下就直接隐藏
  const showBottomTabs = !isDiscovery && pathname !== "/chat" && ["/home", "/me", "/dashboard"].includes(pathname || "");

  return (
    <div className="relative min-h-screen bg-transparent flex flex-col">
      <AppPlatformGuard />
      
      {/* 1. 底层业务页面：作为背景正常渲染 */}
      <div className="flex-1">
        {children}
      </div>

      {/* 2. 全息档案舱：0冲突悬浮拦截层 */}
      {/* 拦截逻辑升级：只要名字为空、性别未知或生日为空，全部强制拦截！包含历史 Google 账号 */}
      {!isLoading && user && (!(user as any).name || (user as any).gender === "unknown" || !(user as any).birthday) && !isPublicRoute && (
        <CyberOnboardingModal />
      )}

      {showBottomTabs && (
        <BottomNavBar className="fixed bottom-0 left-0 right-0" />
      )}

      {/* 3. 多门店管理全局“虫洞”悬浮枢纽：0冲突极简常驻 */}
      <GlobalWormholeCapsule />

      {/* 4. 全局算力矩阵大一统弹窗 (Global Subscription Matrix) - 修复无响应Bug */}
      <SubscriptionLimitModal 
        isOpen={subscriptionModalMode !== null}
        onClose={closeSubscriptionModal}
        currentTier={subscription.subscriptionTier}
        mode={subscriptionModalMode || undefined}
        onStartGracePeriod={undefined}
      />
    </div>
  );
};
