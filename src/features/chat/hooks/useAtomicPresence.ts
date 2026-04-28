import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// 世界顶端架构：视口级动态感知与原子渲染 (Viewport-Aware Atomic Presence)
export function useAtomicPresence(currentUserId: string | undefined) {
  // 记录每个 DOM 节点 (radar-xxx 或 list-xxx) 是否在视口内
  const visibleNodesRef = useRef<Set<string>>(new Set());
  // 核心！记录每个用户的真实在线状态（Single Source of Truth）
  const realPresenceCacheRef = useRef<Map<string, boolean>>(new Map());
  
  // 核心物理级渲染器：绕过 React，直接操作 DOM
  // 【重构】：分离节点渲染。不再“连坐”同时修改 radar 和 list，而是根据节点在视口的状态和用户的真实在线状态，单独控制每个节点
  const renderAtomicPresence = useCallback((userId: string) => {
    const isOnline = realPresenceCacheRef.current.get(userId) || false;

    // 获取所有标记了 data-presence-id 的光环节点 (不分 list 还是 radar，全部接管)
    const nodes = document.querySelectorAll(`[data-presence-id="${userId}"]`);
    
    nodes.forEach(node => {
      const targetAuraId = node.id;
      // 只有当节点在视口内 且 用户真实在线时，才点亮光环
      if (visibleNodesRef.current.has(targetAuraId) && isOnline) {
        node.classList.remove('opacity-0');
        node.classList.add('opacity-100');
      } else {
        node.classList.remove('opacity-100');
        node.classList.add('opacity-0');
      }
    });
  }, []);

  // 根据当前视口内的用户，向服务器动态同步状态
  // 【核心修复】：由于 Supabase Realtime 限制在 subscribe() 之后不能再次调用 .on()
  // 我们不再尝试自己去 getChannels 并挂载回调，而是直接通过原生的 window.addEventListener
  // 监听来自全局 AuthProvider 广播出来的 'gx_presence_sync/join/leave' 事件
  const syncPresenceSubscription = useCallback(() => {
    if (!currentUserId) return; // 移除 visibleUsersRef.current.size 检查，因为我们需要全局初始化缓存

    // 主动抓取一次现有状态用于初次渲染
    const existingChannel = supabase.getChannels().find(c => c.topic === 'realtime:global_presence' || c.topic === 'global_presence');
    if (existingChannel && existingChannel.state === 'joined') {
      const state = existingChannel.presenceState();
      for (const [key, presences] of Object.entries(state)) {
        const isOnline = !!presences && presences.length > 0;
        realPresenceCacheRef.current.set(key, isOnline);
        renderAtomicPresence(key);
      }
    }
  }, [currentUserId, renderAtomicPresence]);

  useEffect(() => {
    if (!currentUserId) return;

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      const state = customEvent.detail;
      for (const [key, presences] of Object.entries(state)) {
        const isOnline = !!presences && (presences as any[]).length > 0;
        realPresenceCacheRef.current.set(key, isOnline);
        renderAtomicPresence(key);
      }
    };

    const handleJoin = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { key } = customEvent.detail;
      realPresenceCacheRef.current.set(key, true);
      renderAtomicPresence(key);
    };

    const handleLeave = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { key } = customEvent.detail;
      realPresenceCacheRef.current.set(key, false);
      renderAtomicPresence(key);
    };

    window.addEventListener('gx_presence_sync', handleSync);
    window.addEventListener('gx_presence_join', handleJoin);
    window.addEventListener('gx_presence_leave', handleLeave);

    return () => {
      window.removeEventListener('gx_presence_sync', handleSync);
      window.removeEventListener('gx_presence_join', handleJoin);
      window.removeEventListener('gx_presence_leave', handleLeave);
    };
  }, [currentUserId, renderAtomicPresence]);

  // Observer 回调：当卡片进入或离开视口时触发
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    let hasChanges = false;
    
    entries.forEach(entry => {
      // 获取节点的唯一 ID (例如 chat-card-list-123_merchant 或 chat-card-radar-123_user)
      // 注意：这里的 entry.target 是我们传递给 observe 的节点
      const nodeId = entry.target.id;
      // 提取出包含身份后缀的复合标识 (例如 123_merchant)
      const extracted = nodeId.replace('chat-card-radar-', '').replace('chat-card-list-', '');
      // 提取出真正的 userId (即 "_" 前面的 UUID)
      const userId = extracted.split('_')[0];
      // 根据规则，将外层卡片容器 ID 精准映射为内部光环节点的 ID
      const targetAuraId = nodeId.replace('chat-card-radar-', 'radar-presence-').replace('chat-card-list-', 'list-presence-');
      
      if (!userId || !targetAuraId) return;

      if (entry.isIntersecting) {
        if (!visibleNodesRef.current.has(targetAuraId)) {
          visibleNodesRef.current.add(targetAuraId);
          hasChanges = true;
          // 进入视口时，点亮（如果在线）
          renderAtomicPresence(userId);
        }
      } else {
        if (visibleNodesRef.current.has(targetAuraId)) {
          visibleNodesRef.current.delete(targetAuraId);
          hasChanges = true;
          // 离开视口时，物理级熄灭光环，防止 GPU 渲染，但不改变用户的真实在线状态
          renderAtomicPresence(userId);
        }
      }
    });

    if (hasChanges) {
      syncPresenceSubscription();
    }
  }, [syncPresenceSubscription, renderAtomicPresence]);

  // ==========================
  // 【废弃逻辑清理】：原有的 channelRef 已被清理，我们现在只作为纯粹的“事件消费者”
  // 不再管理频道的生命周期，频道由全局 AuthProvider 统一把控
  // ==========================
  
  // 暴露给外部绑定 Observer
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // rootMargin: '200px 0px' 就是 Over-scan 缓冲带：
    // 在卡片真正进入屏幕前 200px 就提前触发，实现 0 秒无缝点亮
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '200px 0px',
      threshold: 0
    });

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [handleIntersection]);

  const observeNode = useCallback((node: HTMLElement | null) => {
    if (node && observerRef.current) {
      observerRef.current.observe(node);
    }
  }, []);

  const unobserveNode = useCallback((node: HTMLElement | null) => {
    if (node && observerRef.current) {
      observerRef.current.unobserve(node);
    }
  }, []);

  return { observeNode, unobserveNode };
}
