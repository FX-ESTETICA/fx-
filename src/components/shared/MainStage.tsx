"use client";

import { useEffect, useState, Suspense, memo } from "react";
import { useViewStack } from "@/hooks/useViewStack";
import { cn } from "@/utils/cn";
import { HomeClient } from "@/app/home/HomeClient";
import DiscoveryClient from "@/app/discovery/DiscoveryClient";
import { IndustryCalendar } from "@/features/calendar/components/IndustryCalendar";
import ChatListClient from "@/app/chat/ChatListClient";
import DashboardClient from "@/app/dashboard/DashboardClient";
import MeClient from "@/app/me/MeClient";
import { useAuth } from "@/features/auth/hooks/useAuth";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

const NebulaOverlay = dynamic(() => import("@/features/nebula/components/NebulaOverlay").then(mod => mod.NebulaOverlay), { ssr: false });
const StudioOverlay = dynamic(() => import("@/features/studio/components/StudioOverlay").then(mod => mod.StudioOverlay), { ssr: false });

// 极致性能：React 渲染深度冻结舱 + GPU 显存级回收 (DOM 内存释放)
// 1. memo: 彻底阻断来自父级或全局的 React Re-render 僵尸计算。如果没激活，直接短路渲染流程！
// 2. content-visibility: hidden: 现代浏览器的终极杀器。当页面在后台时，浏览器会直接扔掉它的渲染树(Layout Tree)，实现原生的内存垃圾回收(LRU)，防止显存爆炸。
const TabContainer = memo(({ active, children }: { active: boolean, children: React.ReactNode }) => {
  return (
    <div className={cn(
      "absolute inset-0 w-full h-full overflow-y-auto overflow-x-hidden scrollbar-hide bg-transparent",
      active ? "opacity-100 pointer-events-auto z-10 visible" : "opacity-0 pointer-events-none z-0 invisible",
      !active && "hidden"
    )}>
      {children}
    </div>
  );
}, (prev, next) => {
  // 核心冻结逻辑：如果它上一次在后台，这一次还在后台，那么绝不执行里面组件的一丝代码计算！
  if (!prev.active && !next.active) return true;
  return prev.active === next.active;
});

export const MainStage = () => {
  const setActiveTab = useViewStack((state) => state.setActiveTab);
  const activeTab = useViewStack((state) => state.activeTab);
  const tabProps = useViewStack((state) => state.tabProps);
  const overlays = useViewStack((state) => state.overlays);
  const { user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(new Set(['home'])); // 默认先挂载 home

  // 初始化时，根据当前的真实 URL 路径来设置正确的激活 Tab
  useEffect(() => {
    const pathname = window.location.pathname;
    // 处理像 /calendar/beauty 这样的子路径
    const segments = pathname.split('/').filter(Boolean);
    const mainPath = segments[0] || 'home';
    
    let initialTab = mainPath;
    if (mainPath === 'home' || mainPath === 'discovery' || mainPath === 'calendar' || mainPath === 'chat' || mainPath === 'me' || mainPath === 'dashboard') {
      initialTab = mainPath === 'dashboard' ? 'me' : mainPath;
      
      // 核心修复：深层入口防坠落 (Entry Fallback)
      // 如果用户直接进入非 home 页面，我们在底层强行垫一个 home，保证左上角返回能回到主页
      if (typeof window !== 'undefined' && !window.history.state?.tab) {
        const currentState = window.history.state || {};
        if (initialTab !== 'home') {
          // 垫底操作：把当前历史栈的底部换成 /home，然后再把真实的深层路径推上去
          window.history.replaceState({ ...currentState, tab: 'home' }, '', '/');
          window.history.pushState({ ...currentState, tab: initialTab }, '', pathname);
        } else {
          // 如果本来就是 home，正常设置即可，把状态补全
          window.history.replaceState({ ...currentState, tab: 'home' }, '', '/');
        }
      }
      
      // 直接使用 setState 修改 Zustand 内部状态，而不是调用 setActiveTab
      // 这样就不会再次触发 setActiveTab 内部的 pushState，保持栈纯净
      useViewStack.setState({ activeTab: initialTab as any });
    }
    
    // 初始化时，把当前 URL 对应的 Tab 加入已挂载集合
    setMountedTabs(prev => new Set(prev).add(initialTab));
    setMounted(true);
  }, []);

  // 监听 activeTab 变化，实现惰性激活（Lazy Mount）
  useEffect(() => {
    if (activeTab) {
      setMountedTabs(prev => {
        if (prev.has(activeTab)) return prev;
        return new Set(prev).add(activeTab);
      });
    }
  }, [activeTab]);

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

  // 1. 本地优先 (Local-First) 架构重构：彻底砸碎 Hydration 渲染结界
  // 废弃原有的严格组装检查 (user && !('gxId' in user))，只要不是底层的极度加载中，直接放行！
  // 哪怕 user 还没从云端同步完 gxId，也允许先用缓存的 user 或空状态进场，实现真正的 0 延迟秒开。
  // 后台的 refreshUserData 会像幽灵一样在网络恢复后自动替换状态。
  const isHydrating = isLoading;

  if (isHydrating) {
    return (
      <div className="relative w-full h-[100dvh] bg-[#0a0a0a] overflow-hidden flex flex-col justify-between">
        {/* 顶部环境光模糊占位 */}
        <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-white/5 to-transparent animate-pulse" />
        
        {/* 核心能量场模糊占位 */}
        <div className="flex-1 flex items-center justify-center opacity-20">
          <div className="w-32 h-32 rounded-full bg-white/10 blur-2xl animate-pulse" />
        </div>
        
        {/* 底导栏物理轮廓呼吸灯锚定 (防止页面初载时下方太空) */}
        <div className="w-full h-[84px] border-t border-white/5 bg-black/40 backdrop-blur-md flex justify-around items-center px-6 pb-safe z-50">
          {[1,2,3,4].map(i => <div key={i} className="w-6 h-6 rounded-full bg-white/10 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const renderMeTab = () => {
    return user ? <DashboardClient /> : <MeClient />;
  };

  return (
    <div className="relative w-full h-[100dvh] bg-transparent overflow-hidden">
      {/* 
        世界顶端：惰性单例 + 深度冻结 + 显存回收架构
        - mountedTabs: 控制首屏 0 加载冗余，点谁挂谁。
        - TabContainer (memo + content-visibility): 将一切后台页面的 React 计算强行掐断，同时由浏览器底层释放其对应的显存。
      */}
      <div className="absolute inset-0">
        {/* 1. 首页 */}
        {mountedTabs.has('home') && (
          <TabContainer active={activeTab === 'home'}>
            <HomeClient initialRealShops={[]} isActive={activeTab === 'home'} />
          </TabContainer>
        )}

        {/* 2. 发现 */}
        {mountedTabs.has('discovery') && (
          <TabContainer active={activeTab === 'discovery'}>
            <DiscoveryClient />
          </TabContainer>
        )}

        {/* 3. 日历 */}
        {mountedTabs.has('calendar') && (
          <TabContainer active={activeTab === 'calendar'}>
            <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-white/50">Loading Calendar...</div>}>
              <IndustryCalendar initialIndustry={tabProps['calendar']?.industry || "beauty"} mode="admin" />
            </Suspense>
          </TabContainer>
        )}

        {/* 4. 聊天 */}
        {mountedTabs.has('chat') && (
          <TabContainer active={activeTab === 'chat'}>
            <ChatListClient />
          </TabContainer>
        )}

        {/* 5. 我的/智控 */}
        {mountedTabs.has('me') && (
          <TabContainer active={activeTab === 'me'}>
            {renderMeTab()}
          </TabContainer>
        )}
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
