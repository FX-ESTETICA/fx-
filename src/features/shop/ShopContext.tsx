"use client";

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";

interface SubscriptionState {
  subscriptionTier: string;
  trialStartedAt: string | null;
  subscriptionEndsAt: string | null;
  gracePeriodEndsAt: string | null;
  gracePeriodActionsLeft: number | null;
  remainingTime: string | null;
  remainingMilliseconds: number | null; // 新增：提供给 UI 做精确的阈值判断
  isGracePeriodActive: boolean;
  isLoaded: boolean;
  empireId: string | null;
}

export type SubscriptionModalMode = 'NODE_LIMIT' | 'EXPIRED_WARNING' | 'UPGRADE_INTENT' | null;

interface ShopContextType {
  activeShopId: string | null;
  setActiveShopId: (shopId: string | null) => void;
  availableShops: { shopId: string; role: string; industry: string; shopName?: string }[];
  subscription: SubscriptionState;
  openSubscriptionModal: (mode: SubscriptionModalMode) => void;
  closeSubscriptionModal: () => void;
  subscriptionModalMode: SubscriptionModalMode;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider = ({ children }: { children: ReactNode }) => {
  const { user, activeRole } = useAuth() as any; // activeRole is exposed by useAuth
  const [activeShopId, setActiveShopIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("gx_active_shop_id");
  });

  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscriptionTier: 'FREE',
    trialStartedAt: null,
    subscriptionEndsAt: null,
    gracePeriodEndsAt: null,
    gracePeriodActionsLeft: null,
    remainingTime: null,
    remainingMilliseconds: null,
    isGracePeriodActive: false,
    isLoaded: false,
    empireId: null,
  });

  // 【水合安全 (Hydration-Safe) 0秒快照加载】
  // 避免在 useState 初始化时读取 localStorage 导致 SSR 渲染结果与客户端不一致 (Hydration Error)
  useEffect(() => {
    try {
      const cached = localStorage.getItem("gx_empire_sub_snapshot");
      if (cached) {
        const parsed = JSON.parse(cached);
        setSubscription(prev => {
          // 如果云端的真实数据已经先于本地快照加载回来了，就不要用快照去覆盖它
          if (prev.isLoaded) return prev;
          return { ...prev, ...parsed, isLoaded: true };
        });
      }
    } catch (e) {
      console.error("Failed to load subscription snapshot", e);
    }
  }, []);

  // 完全依赖 user.bindings，废除 isMockMode 逻辑
  const availableShops = useMemo(() => {
    return user && "bindings" in user && user.bindings ? user.bindings : [];
  }, [user]);

  const resolvedActiveShopId = useMemo(() => {
    if (availableShops.length === 0) return null;
    if (activeShopId && availableShops.some((s: any) => s.shopId === activeShopId)) {
      return activeShopId;
    }
    if (typeof window !== "undefined") {
      const savedShopId = localStorage.getItem("gx_active_shop_id");
      if (savedShopId && availableShops.some((s: any) => s.shopId === savedShopId)) {
        return savedShopId;
      }
    }
    return availableShops[0].shopId;
  }, [availableShops, activeShopId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (resolvedActiveShopId) {
      localStorage.setItem("gx_active_shop_id", resolvedActiveShopId);
    } else {
      localStorage.removeItem("gx_active_shop_id");
    }
  }, [resolvedActiveShopId]);

  const [subscriptionModalMode, setSubscriptionModalMode] = useState<SubscriptionModalMode>(null);

  const openSubscriptionModal = (mode: SubscriptionModalMode) => {
    setSubscriptionModalMode(mode);
  };

  const closeSubscriptionModal = () => {
    setSubscriptionModalMode(null);
  };

  // ==========================================
  // 世界顶端：帝国级订阅联邦同步中枢 (Global Empire Context + Realtime)
  // ==========================================
  useEffect(() => {
    if (!resolvedActiveShopId || resolvedActiveShopId === 'default') return;

    let isMounted = true;
    let empireId: string | null = null;
    let channel: any = null;

    // 1. 初次挂载时拉取最新状态
    const fetchSubscriptionData = async () => {
      try {
        // 先查出门店的 owner_principal_id (Boss的账号ID)
        const { data: shopData } = await supabase
          .from('shops')
          .select('owner_principal_id, config')
          .eq('id', resolvedActiveShopId)
          .maybeSingle();

        if (!shopData?.owner_principal_id) return;
        empireId = shopData.owner_principal_id;

        // 再查 Boss的 Profile 里的帝国订阅状态
        const { data: profileData } = await supabase
          .from('profiles')
          .select('subscription_tier, trial_started_at, current_period_end, grace_period_actions_left')
          .eq('id', empireId)
          .maybeSingle();

        let finalTrialStartedAt = profileData?.trial_started_at;
        
        // 【单轨制强控】完全废弃前端 localStorage 的双轨同步！
        // 只有当云端真实存在 trial_started_at 时才承认。防止用户篡改本地缓存获取无限试用期。
        const localTrialKey = `gx_trial_empire_${empireId}`;
        if (typeof window !== "undefined") {
          if (finalTrialStartedAt) {
            localStorage.setItem(localTrialKey, finalTrialStartedAt);
          } else {
            localStorage.removeItem(localTrialKey);
          }
        }

        if (isMounted && profileData) {
          let newState: SubscriptionState;

          // 【GOD MODE】: 如果当前是管理员的 Boss 视图，完全免疫拦截！
          if (activeRole === 'boss') {
            newState = {
              ...subscription,
              subscriptionTier: 'ENTERPRISE', // 强制最高权限
              trialStartedAt: null,
              subscriptionEndsAt: '2099-12-31T23:59:59Z',
              gracePeriodEndsAt: null,
              gracePeriodActionsLeft: 9999,
              isLoaded: true,
              empireId: empireId
            };
          } else {
            newState = {
              ...subscription,
              subscriptionTier: profileData.subscription_tier || 'FREE',
              trialStartedAt: finalTrialStartedAt,
              subscriptionEndsAt: profileData.current_period_end,
              gracePeriodEndsAt: (shopData.config as any)?.grace_period_ends_at || null, // 保留店级续命期（如有）
              gracePeriodActionsLeft: profileData.grace_period_actions_left ?? null,
              isLoaded: true,
              empireId: empireId
            };
          }

          setSubscription(prev => ({ ...prev, ...newState }));
          
          // 【快照更新】: 每次从云端获取到最真实的物理数据后，覆写本地的 0 秒快照缓存。
          // 哪怕黑客修改了缓存，这里 0.5 秒后的回包也会立刻把它重新写死。
          if (typeof window !== "undefined") {
            localStorage.setItem("gx_empire_sub_snapshot", JSON.stringify(newState));
          }
        }

        // 2. 建立 Supabase Realtime 物理级监听，监听 Boss Profile 的变动
        if (empireId && isMounted) {
          channel = supabase
            .channel(`empire_sub_${empireId}`)
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${empireId}` },
              (payload) => {
                if (activeRole === 'boss') return; // Boss 免疫实时覆盖
                console.log("[ShopContext] Realtime Empire subscription update received:", payload.new);
                const newData = payload.new;
                
                setSubscription(prev => {
                  const updatedState = {
                    ...prev,
                    subscriptionTier: newData.subscription_tier || 'FREE',
                    trialStartedAt: newData.trial_started_at,
                    subscriptionEndsAt: newData.current_period_end,
                    gracePeriodActionsLeft: newData.grace_period_actions_left ?? null,
                  };
                  if (typeof window !== "undefined") {
                    localStorage.setItem("gx_empire_sub_snapshot", JSON.stringify(updatedState));
                  }
                  return updatedState;
                });
              }
            )
            .subscribe();
        }

      } catch (e) {
        console.error("[ShopContext] Failed to fetch subscription data", e);
      }
    };

    fetchSubscriptionData();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [resolvedActiveShopId, activeRole]);

  // 3. 全局倒计时计算引擎 (Tick Engine)
  useEffect(() => {
    // 强制防篡改引擎：记录初次加载时的系统时间戳，防止用户在页面停留时修改本地时间
    const initSystemTime = Date.now();
    const initPerformanceTime = performance.now();

    const calculateTimeRemaining = () => {
      // 通过 performance.now() 推算当前的真实经过时间，无视操作系统时钟的修改
      const elapsed = performance.now() - initPerformanceTime;
      const trueNow = new Date(initSystemTime + elapsed);

      // 这里不要从外部的 subscription 对象解构，而是使用函数式的 setState
      // 以确保每次 interval 都能拿到最新的 state，而不是闭包旧值
      setSubscription(prev => {
        // 如果数据还没从云端拉下来，先不计算，保持原样，防止初始 null 闪烁
        if (!prev.isLoaded) return prev;

        const { trialStartedAt, subscriptionEndsAt, subscriptionTier, gracePeriodEndsAt, gracePeriodActionsLeft } = prev;

        // 1. 如果有真实的正式订阅到期时间 (通过 Paddle 购买后写入的 current_period_end)
        if (subscriptionEndsAt) {
          const end = new Date(subscriptionEndsAt);
          const diff = end.getTime() - trueNow.getTime();

          if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            
            // 如果大于 1 天，直接显示天数；否则显示精确倒计时
            const timeStr = days > 0 ? `${days} 天` : `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            
            return { ...prev, remainingTime: timeStr, remainingMilliseconds: diff, isGracePeriodActive: false };
          } else {
            return { ...prev, remainingTime: "MEMBERSHIP_EXPIRED", remainingMilliseconds: 0, isGracePeriodActive: false };
          }
        }

        // 2. 原有的店级续命期逻辑 (店级配置的 grace_period_ends_at)
        if (gracePeriodEndsAt) {
          const end = new Date(gracePeriodEndsAt);
          const diff = end.getTime() - trueNow.getTime();
          if (diff > 0) {
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            return { ...prev, remainingTime: `${h}H ${m}M ${s}S`, remainingMilliseconds: diff, isGracePeriodActive: true };
          } else {
            return { ...prev, remainingTime: "MEMBERSHIP_EXPIRED", remainingMilliseconds: 0, isGracePeriodActive: false };
          }
        }

        // 如果在免费试用期
        if (subscriptionTier === 'FREE' && trialStartedAt) {
          const start = new Date(trialStartedAt);
          const end = new Date(start.getTime() + 5 * 60 * 1000); // 5分钟满血试用
          const diff = end.getTime() - trueNow.getTime();
          
          if (diff > 0) {
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            return { ...prev, remainingTime: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`, remainingMilliseconds: diff, isGracePeriodActive: false };
          } else {
            // 试用期结束，检查是否有紧急操作次数
            if (gracePeriodActionsLeft !== null) {
              if (gracePeriodActionsLeft > 0) {
                // 还有剩余次数，处于续命期
                return { ...prev, remainingTime: "GRACE_PERIOD", remainingMilliseconds: 0, isGracePeriodActive: true };
              } else {
                // 次数耗尽
                return { ...prev, remainingTime: "ACTIONS_EXHAUSTED", remainingMilliseconds: 0, isGracePeriodActive: false };
              }
            } else {
              // 未开启续命
              return { ...prev, remainingTime: "LIMIT_EXCEEDED", remainingMilliseconds: 0, isGracePeriodActive: false };
            }
          }
        }
        
        // 如果免费试用尚未开始
        if (subscriptionTier === 'FREE' && !trialStartedAt) {
          return { ...prev, remainingTime: null, remainingMilliseconds: null, isGracePeriodActive: false };
        }
        
        return prev;
      });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, []); // 移除依赖数组，让闭包只跑一次，内部用 setSubscription(prev => ...) 来计算

  const setActiveShopId = (shopId: string | null) => {
    setActiveShopIdState(shopId);
  };

  return (
    <ShopContext.Provider value={{ 
      activeShopId: resolvedActiveShopId, 
      setActiveShopId, 
      availableShops, 
      subscription,
      openSubscriptionModal,
      closeSubscriptionModal,
      subscriptionModalMode
    }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
};
