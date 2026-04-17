"use client";

import { useEffect, useState } from "react";
import { useViewStack } from "@/hooks/useViewStack";
import { cn } from "@/utils/cn";
import { HomeClient } from "@/app/home/HomeClient";
import DiscoveryClient from "@/app/discovery/DiscoveryClient";
import { IndustryCalendar } from "@/features/calendar/components/IndustryCalendar";
import ChatListClient from "@/app/chat/ChatListClient";
import DashboardClient from "@/app/dashboard/DashboardClient";
import MeClient from "@/app/me/MeClient";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

const NebulaOverlay = dynamic(() => import("@/features/nebula/components/NebulaOverlay").then(mod => mod.NebulaOverlay), { ssr: false });
const StudioOverlay = dynamic(() => import("@/features/studio/components/StudioOverlay").then(mod => mod.StudioOverlay), { ssr: false });

// 移除多余导入

export const MainStage = () => {
  const setActiveTab = useViewStack((state) => state.setActiveTab);
  const activeTab = useViewStack((state) => state.activeTab);
  const tabProps = useViewStack((state) => state.tabProps);
  const overlays = useViewStack((state) => state.overlays);
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  // 初始化时，根据当前的真实 URL 路径来设置正确的激活 Tab
  useEffect(() => {
    const pathname = window.location.pathname;
      // 处理像 /calendar/beauty 这样的子路径
      const segments = pathname.split('/').filter(Boolean);
      const mainPath = segments[0] || 'home';
      
      if (mainPath === 'home' || mainPath === 'discovery' || mainPath === 'calendar' || mainPath === 'chat' || mainPath === 'me' || mainPath === 'dashboard') {
        setActiveTab(mainPath === 'dashboard' ? 'me' : (mainPath as any));
      }
    setMounted(true);
  }, [setActiveTab]);

  // 全局事件监听器
  useEffect(() => {
    const handleReturnHome = () => setActiveTab('home');
    const handleSetTab = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail as any);
      }
    };
    
    window.addEventListener('gx-return-home', handleReturnHome);
    window.addEventListener('gx-set-tab', handleSetTab);
    
    return () => {
      window.removeEventListener('gx-return-home', handleReturnHome);
      window.removeEventListener('gx-set-tab', handleSetTab);
    };
  }, [setActiveTab]);

  if (!mounted) return null;

  const renderMeTab = () => {
    return user ? <DashboardClient /> : <MeClient />;
  };

  // 生成通用的图层控制 class
  const getLayerClass = (targetTab: string) => cn(
    "absolute inset-0 w-full h-full overflow-y-auto overflow-x-hidden scrollbar-hide bg-transparent transition-opacity duration-300",
    activeTab === targetTab ? "opacity-100 pointer-events-auto z-10" : "opacity-0 pointer-events-none z-0"
  );

  return (
    <div className="relative w-full h-[100dvh] bg-transparent overflow-hidden">
      {/* 
        多层画布同轴叠加 (Co-axial Stacking with Visibility Toggling)
        这是 0 错误、0 冲突、0 延迟的最完美架构方案。
        - width: 100vw, height: 100dvh
        - absolute inset-0 叠加，彻底消灭坐标系错乱
        - opacity / pointer-events 切换，瞬间响应且冻结状态
      */}
      <div className="absolute inset-0">
        {/* 1. 首页 */}
        <div className={getLayerClass('home')}>
          <HomeClient initialRealShops={[]} />
        </div>

        {/* 2. 发现 */}
        <div className={getLayerClass('discovery')}>
          <DiscoveryClient />
        </div>

        {/* 3. 日历 */}
        <div className={getLayerClass('calendar')}>
          <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-white/50">Loading Calendar...</div>}>
            <IndustryCalendar initialIndustry={tabProps['calendar']?.industry || "beauty"} mode="admin" />
          </Suspense>
        </div>

        {/* 4. 聊天 */}
        <div className={getLayerClass('chat')}>
          <ChatListClient />
        </div>

        {/* 5. 我的/智控 */}
        <div className={getLayerClass('me')}>
          {renderMeTab()}
        </div>
      </div>

      {/* 全局弹层 (Overlays) */}
      <AnimatePresence>
        {overlays.map((overlay) => {
          if (overlay.id === 'nebula') {
            return (
              <motion.div 
                key={overlay.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-[100] bg-black"
              >
                <NebulaOverlay {...overlay.props} />
              </motion.div>
            )
          }
          if (overlay.id === 'studio') {
            return (
              <motion.div 
                key={overlay.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-[100] bg-black"
              >
                <StudioOverlay {...overlay.props} />
              </motion.div>
            )
          }
          return null;
        })}
      </AnimatePresence>
    </div>
  );
};
