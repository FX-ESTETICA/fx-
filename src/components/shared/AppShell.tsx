"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AppPlatformGuard } from "./AppPlatformGuard";
import { CyberOnboardingModal } from "./CyberOnboardingModal";
import { BottomNavBar } from "./BottomNavBar";
import { GlobalWormholeCapsule } from "./GlobalWormholeCapsule";
import { SubscriptionLimitModal } from "@/features/nebula/components/SubscriptionLimitModal";
import { useShop } from "@/features/shop/ShopContext";
import { useViewStack } from "@/hooks/useViewStack";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const { subscriptionModalMode, closeSubscriptionModal, subscription } = useShop();
  const { activeTab, overlays } = useViewStack();

  const isStandalonePage = pathname === "/login" || pathname === "/vision";
  // 白名单路由：绝对放行，防止回调死锁
  const isPublicRoute = isStandalonePage || pathname === "/auth/callback";
  
  if (isStandalonePage) return <>{children}</>;

  // 终极上下文屏蔽：发现页和聊天室内彻底拔除底栏
  // 在单页架构中，我们通过 activeTab 和 overlays 来判断
  const isDiscovery = activeTab === "discovery";
  const hasOverlay = overlays.length > 0;
  
  // 只有在 Home, Me/Dashboard，且没有全局弹层时才显示底栏
  // 【修复】：星云页面（/nebula）或装修页面（/studio）现在是原生路由，它们也不应该显示这个由 MainStage 控制的底导！
  const isMainStageRoute = ["/", "/home", "/dashboard", "/me", "/chat", "/discovery", "/calendar"].some(p => pathname === p || pathname.startsWith("/calendar/"));
  const showBottomTabs = !hasOverlay && !isDiscovery && activeTab !== "chat" && ["home", "me", "dashboard"].includes(activeTab) && isMainStageRoute;

  return (
    <div className="relative min-h-[100dvh] bg-transparent flex flex-col">
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
      {!hasOverlay && <GlobalWormholeCapsule />}

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
