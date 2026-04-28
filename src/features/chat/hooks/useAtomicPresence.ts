import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// 世界顶端架构：视口级动态感知与原子渲染 (Viewport-Aware Atomic Presence)
export function useAtomicPresence(currentUserId: string | undefined) {
  const visibleUsersRef = useRef<Set<string>>(new Set());
  
  // 核心物理级渲染器：绕过 React，直接操作 DOM
  const renderAtomicPresence = useCallback((userId: string, isOnline: boolean) => {
    // 同时渲染聊天列表 (list-presence) 和 顶部星轨 (radar-presence)
    const listNode = document.getElementById(`list-presence-${userId}`);
    const radarNode = document.getElementById(`radar-presence-${userId}`);
    
    // 物理注入/剥离 CSS 类，0 重新渲染
    if (listNode) {
      if (isOnline) {
        listNode.classList.remove('opacity-0');
        listNode.classList.add('opacity-100');
      } else {
        listNode.classList.remove('opacity-100');
        listNode.classList.add('opacity-0');
      }
    }
    
    if (radarNode) {
      if (isOnline) {
        radarNode.classList.remove('opacity-0');
        radarNode.classList.add('opacity-100');
      } else {
        radarNode.classList.remove('opacity-100');
        radarNode.classList.add('opacity-0');
      }
    }
  }, []);

  // 根据当前视口内的用户，向服务器动态同步状态
  // 【核心修复】：由于 Supabase Realtime 限制在 subscribe() 之后不能再次调用 .on()
  // 我们不再尝试自己去 getChannels 并挂载回调，而是直接通过原生的 window.addEventListener
  // 监听来自全局 AuthProvider 广播出来的 'gx_presence_sync/join/leave' 事件
  const syncPresenceSubscription = useCallback(() => {
    if (!currentUserId || visibleUsersRef.current.size === 0) {
      return;
    }

    // 主动抓取一次现有状态用于初次渲染
    const existingChannel = supabase.getChannels().find(c => c.topic === 'realtime:global_presence');
    if (existingChannel && existingChannel.state === 'joined') {
      const state = existingChannel.presenceState();
      visibleUsersRef.current.forEach(userId => {
        const isOnline = !!state[userId] && Object.keys(state[userId]).length > 0;
        renderAtomicPresence(userId, isOnline);
      });
    }
  }, [currentUserId, renderAtomicPresence]);

  useEffect(() => {
    if (!currentUserId) return;

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      const state = customEvent.detail;
      visibleUsersRef.current.forEach(userId => {
        const isOnline = !!state[userId] && Object.keys(state[userId]).length > 0;
        renderAtomicPresence(userId, isOnline);
      });
    };

    const handleJoin = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { key } = customEvent.detail;
      if (visibleUsersRef.current.has(key)) {
        renderAtomicPresence(key, true);
      }
    };

    const handleLeave = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { key } = customEvent.detail;
      if (visibleUsersRef.current.has(key)) {
        renderAtomicPresence(key, false);
      }
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
      // 约定 ID 格式为 "chat-card-radar-USER_ID" 或 "chat-card-list-USER_ID"
      const targetId = entry.target.id.replace('chat-card-radar-', '').replace('chat-card-list-', '');
      if (!targetId) return;

      if (entry.isIntersecting) {
        if (!visibleUsersRef.current.has(targetId)) {
          visibleUsersRef.current.add(targetId);
          hasChanges = true;
        }
      } else {
        if (visibleUsersRef.current.has(targetId)) {
          // 移出视口时，我们不一定立刻从 set 里删除，为了做 over-scan 缓冲，
          // 可以保留一段时间，但严格版就是直接删除并熄灭（为了演示极限性能）
          visibleUsersRef.current.delete(targetId);
          // 离开视口后，物理级重置其状态，防止缓存脏数据
          renderAtomicPresence(targetId, false);
          hasChanges = true;
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
