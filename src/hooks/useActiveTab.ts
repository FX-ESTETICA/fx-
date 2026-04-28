"use client";

import { usePathname } from 'next/navigation';
import { useViewStack, TabId } from './useViewStack';
import { useState, useEffect } from 'react';

// 世界顶端架构：彻底抹平 SSR (服务端渲染) 与 CSR (客户端水合) 之间的时空错乱。
// 避免因全局 Zustand 初始状态（默认 home）与真实路由 URL 不符而导致的“第一帧白屏、背景穿帮、底栏闪烁”等 UI 灾难。
export function useActiveTab(): TabId {
  const pathname = usePathname();
  const storeTab = useViewStack((state) => state.activeTab);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
     
    setMounted(true);
  }, []);

  // 在客户端挂载完成后，全面接管为 Zustand 全局状态
  if (mounted) {
    return storeTab;
  }

  // SSR / 首帧水合阶段：物理级强制读取 Next.js 路由，实现第一帧 100% 完美贴合
  if (pathname) {
    const segments = pathname.split('/').filter(Boolean);
    const mainPath = segments[0] || 'home';
    if (['home', 'discovery', 'calendar', 'chat', 'me', 'dashboard'].includes(mainPath)) {
      return mainPath === 'dashboard' ? 'me' : (mainPath as TabId);
    }
  }

  return 'home';
}
