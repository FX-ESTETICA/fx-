"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { BookingService, BookingRealtimePayload } from "@/features/booking/api/booking";
import { useVisualSettings } from '@/hooks/useVisualSettings';
import { useBackground } from '@/hooks/useBackground';

interface SubscriptionState {
  subscriptionTier: string;
  trialStartedAt: string | null;
  subscriptionEndsAt: string | null;
  gracePeriodEndsAt: string | null;
  gracePeriodActionsLeft: number | null;
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
  // --- 全局配置中枢 ---
  shopConfig: any | null; 
  isShopConfigLoaded: boolean;
  updateShopConfig: (key: string, payload: any) => Promise<void>;
  updateFullShopConfig: (patchObj: Record<string, unknown>) => Promise<void>;
  // --- 全局订单中枢 ---
  globalBookings: any[];
  refreshBookings: () => Promise<void>;
  trackAction: () => Promise<void>;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider = ({ children }: { children: ReactNode }) => {
  const { user, activeRole } = useAuth() as any; // activeRole is exposed by useAuth
  const { updateSettings } = useVisualSettings();
  const { setSpecificBackground } = useBackground();
  
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
  // 【致命修复】：使用 JSON.stringify 提取原始签名，防止 user 对象每次内存地址变更导致 availableShops 重算
  const bindingsSignature = useMemo(() => {
    if (!user || !("bindings" in user) || !user.bindings) return "[]";
    return JSON.stringify(user.bindings);
  }, [user]);

  const availableShops = useMemo(() => {
    return JSON.parse(bindingsSignature);
  }, [bindingsSignature]);

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

  const openSubscriptionModal = useCallback((mode: SubscriptionModalMode) => {
    setSubscriptionModalMode(mode);
  }, []);

  const closeSubscriptionModal = useCallback(() => {
    setSubscriptionModalMode(null);
  }, []);

  // ==========================================
  // 全局门店配置中枢 (Shop Config Source of Truth)
  // ==========================================
  // 【水合安全】：初始渲染使用 null，在 useEffect 中提取快照以避免 SSR 报错
  const [shopConfig, setShopConfig] = useState<any | null>(null);
  const [isShopConfigLoaded, setIsShopConfigLoaded] = useState(false);

  // 同步云端视觉配置到本地状态
  useEffect(() => {
    if (shopConfig?.visualSettings) {
      updateSettings(shopConfig.visualSettings);
    }
    if (shopConfig?.globalBgIndex !== undefined) {
      setSpecificBackground(shopConfig.globalBgIndex);
    }
  }, [shopConfig?.visualSettings, shopConfig?.globalBgIndex, updateSettings, setSpecificBackground]);

  // ==========================================
  // 全局订单中枢 (Bookings Source of Truth)
  // ==========================================
  // 【水合安全】：初始渲染使用 []，在 useEffect 中提取快照以避免 SSR 报错
  const [globalBookings, setGlobalBookings] = useState<any[]>([]);

  // 将加载订单提炼成一个全局的刷新函数，任何弹窗保存后都可以直接调它，代替原来的事件
  const refreshBookings = useCallback(async () => {
    if (!resolvedActiveShopId || resolvedActiveShopId === 'default') return;
    try {
      const { data } = await BookingService.getBookings(resolvedActiveShopId);
      // 预处理，防止空字段
      const safeBookings = (data || []).map((booking: any) => ({
        ...booking,
        resourceId: booking.resourceId ?? null,
        date: booking.date || "",
        startTime: booking.startTime || "00:00",
        duration: booking.duration ?? 0
      }));
      setGlobalBookings(safeBookings);
      // 【快照覆写】：真实数据就绪后，静默写入硬盘，供下次 0 秒打开
      if (typeof window !== "undefined") {
        localStorage.setItem(`gx_bookings_snapshot_${resolvedActiveShopId}`, JSON.stringify(safeBookings));
      }
    } catch (e) {
      console.error("[ShopContext] Failed to load cloud bookings:", e);
    }
  }, [resolvedActiveShopId]);

  useEffect(() => {
    const handleOnline = async () => {
      console.log("[ShopContext] 🌐 网络已连接，触发离线队列重传");
      await BookingService.syncOfflineMutations();
      refreshBookings(); // 重传完后拉取最新云端数据，修正乐观更新可能存在的ID偏差
    };
    
    // 【世界顶端：三位一体唤醒引擎】
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("[ShopContext] 👁️ 网页从后台切回可见状态，触发强制数据重载");
        refreshBookings();
      }
    };
    
    const handleFocus = () => {
      console.log("[ShopContext] 🎯 窗口重新获得焦点，触发强制数据重载");
      refreshBookings();
    };
    
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // Capacitor 原生系统级后台唤醒探针
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            console.log('[ShopContext] 📱 原生 App 从后台唤醒，执行物理级强制重载');
            refreshBookings();
          }
        });
      }).catch(e => {
        console.error("Failed to load @capacitor/app", e);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshBookings]);

  useEffect(() => {
    if (!resolvedActiveShopId || resolvedActiveShopId === 'default') {
      setShopConfig(null);
      setIsShopConfigLoaded(true);
      setGlobalBookings([]);
      return;
    }

    let isMounted = true;
    setIsShopConfigLoaded(false);

    // 【水合安全 0秒快照加载】: 在发起网络请求前，瞬间同步读取并更新状态。
    // React 18 会将这个 Effect 中的同步状态更新合并并在绘制前（paint）刷新，从而实现既不报 Hydration Error 又无闪烁的完美 0 秒开屏！
    try {
      const cachedConfig = localStorage.getItem(`gx_shop_config_snapshot_${resolvedActiveShopId}`);
      if (cachedConfig && isMounted) {
        setShopConfig(JSON.parse(cachedConfig));
        setIsShopConfigLoaded(true);
      }
      const cachedBookings = localStorage.getItem(`gx_bookings_snapshot_${resolvedActiveShopId}`);
      if (cachedBookings && isMounted) {
        setGlobalBookings(JSON.parse(cachedBookings));
      }
    } catch (e) {
      console.error("[ShopContext] Failed to load snapshot", e);
    }

    // 1. Initial Fetch
    const fetchShopConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('config')
          .eq('id', resolvedActiveShopId)
          .maybeSingle();

        if (error) throw error;
        if (isMounted) {
          const finalConfig = data?.config || {};
          setShopConfig(finalConfig);
          setIsShopConfigLoaded(true);
          // 【快照覆写】：真实数据就绪后，静默写入硬盘，供下次 0 秒打开
          if (typeof window !== "undefined") {
            localStorage.setItem(`gx_shop_config_snapshot_${resolvedActiveShopId}`, JSON.stringify(finalConfig));
          }
        }
      } catch (err) {
        console.error("[ShopContext] Failed to load shop config:", err);
        if (isMounted) setIsShopConfigLoaded(true);
      }
    };
    fetchShopConfig();
    
    // 同时也立刻拉取一次订单
    refreshBookings();

    // 2. Realtime Subscription (Config)
    let configDebounceTimer: NodeJS.Timeout | null = null;
    const channelConfig = supabase
      .channel(`shop_config_${resolvedActiveShopId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shops', filter: `id=eq.${resolvedActiveShopId}` },
        (payload) => {
          console.log(`[ShopContext] Realtime Config change received for shop ${resolvedActiveShopId}:`, payload);
          const newConfig = payload.new?.config;
          if (newConfig && isMounted) {
            setShopConfig(newConfig);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && isMounted) {
          console.log(`[ShopContext] Realtime Config channel SUBSCRIBED for shop ${resolvedActiveShopId}, fetching latest state...`);
          if (configDebounceTimer) clearTimeout(configDebounceTimer);
          configDebounceTimer = setTimeout(() => {
            fetchShopConfig();
          }, 300);
        }
      });
      
    // 3. Realtime Subscription (Bookings)
    // 接管原有的订单监听，直接在此处触发全局订单拉取
    let realtimeDebounceTimer: NodeJS.Timeout | null = null;
    const handleBookingUpdate = () => {
      if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
      realtimeDebounceTimer = setTimeout(() => {
        if (isMounted) refreshBookings();
      }, 300); // 300ms 防抖，将几十次连续插入合并为 1 次 Fetch
    };

    const channelBookings = BookingService.subscribeToShopBookings(resolvedActiveShopId, (payload: BookingRealtimePayload) => {
      console.log(`[ShopContext] Realtime Bookings change received for shop ${resolvedActiveShopId}:`, payload);
      handleBookingUpdate();
    }, () => {
      // 【世界级物理探针】：无论是初次挂载，还是从长达数小时的后台挂起中苏醒重连
      // 只要 WebSocket 物理通道重建成功，立刻拉取全量快照，填补断连期间的数据黑洞！
      if (isMounted) {
        console.log(`[ShopContext] Realtime Bookings channel SUBSCRIBED for shop ${resolvedActiveShopId}, syncing full state...`);
        handleBookingUpdate(); // 复用已有的防抖逻辑
      }
    });

    return () => {
      isMounted = false;
      if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
      supabase.removeChannel(channelConfig);
      if (channelBookings) {
        BookingService.unsubscribe(channelBookings);
      }
    };
  }, [resolvedActiveShopId, refreshBookings]);

  // 原子级局部更新 API (乐观更新 + 数据库回写)
  const updateShopConfig = useCallback(async (key: string, payload: any) => {
    if (!resolvedActiveShopId || resolvedActiveShopId === 'default') return;

    // 乐观更新
    const patch = { [key]: payload };
    setShopConfig((prev: any) => {
      const newState = { ...(prev || {}), ...patch };
      // 【乐观更新快照同步】
      if (typeof window !== "undefined") {
        localStorage.setItem(`gx_shop_config_snapshot_${resolvedActiveShopId}`, JSON.stringify(newState));
      }
      return newState;
    });

    try {
      // 因为数据库的 patch_shop_config RPC 可能存在静默失败（返回 204 但未实际写入），
      // 这里采取绝对兜底方案：强制拉取最新数据，在前端进行深度合并，然后直接 Update 整行记录。
      const { data: currentShop } = await supabase
        .from('shops')
        .select('config')
        .eq('id', resolvedActiveShopId)
        .single();

      const mergedConfig = {
        ...(currentShop?.config as Record<string, unknown> || {}),
        ...patch
      };

      const { error } = await supabase.from('shops').update({ config: mergedConfig }).eq('id', resolvedActiveShopId);
      if (error) {
        console.error("[ShopContext] Update error:", error);
      }
    } catch (e) {
      console.error("[ShopContext] Failed to update shop config:", e);
    }
  }, [resolvedActiveShopId]);

  // 原子级批量更新 API (乐观更新 + 数据库回写)
  const updateFullShopConfig = useCallback(async (patchObj: Record<string, unknown>) => {
    if (!resolvedActiveShopId || resolvedActiveShopId === 'default') return;

    // 乐观更新
    setShopConfig((prev: any) => {
      const newState = { ...(prev || {}), ...patchObj };
      // 【乐观更新快照同步】
      if (typeof window !== "undefined") {
        localStorage.setItem(`gx_shop_config_snapshot_${resolvedActiveShopId}`, JSON.stringify(newState));
      }
      return newState;
    });

    try {
      // 强制使用 Update 兜底，绕过失效的 RPC
      const { data: currentShop } = await supabase
        .from('shops')
        .select('config')
        .eq('id', resolvedActiveShopId)
        .single();

      const mergedConfig = {
        ...(currentShop?.config as Record<string, unknown> || {}),
        ...patchObj
      };

      const { error } = await supabase.from('shops').update({ config: mergedConfig }).eq('id', resolvedActiveShopId);
      if (error) {
        console.error("[ShopContext] Update error:", error);
      }
    } catch (e) {
      console.error("[ShopContext] Failed to update full shop config:", e);
    }
  }, [resolvedActiveShopId]);

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

        const finalTrialStartedAt = profileData?.trial_started_at;
        
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
            .subscribe((status) => {
              if (status === 'SUBSCRIBED' && isMounted) {
                console.log(`[ShopContext] Realtime Empire sub channel SUBSCRIBED for ${empireId}, fetching latest state...`);
                // 递归调用虽然不太好，但可以提取出来或者直接触发重新拉取。由于 fetchSubscriptionData 已经定义在作用域内，可以直接调。
                // 为了防止无限死循环，确保 fetchSubscriptionData 内部不会重置 channel，我们可以通过一个 fetchState 独立函数。
                // 实际上，这里我们可以只发送一条查询。为了简单且安全，直接重新查库
                supabase
                  .from('profiles')
                  .select('subscription_tier, trial_started_at, current_period_end, grace_period_actions_left')
                  .eq('id', empireId)
                  .maybeSingle()
                  .then(({ data: profileData }) => {
                    if (profileData && isMounted) {
                      setSubscription(prev => {
                        if (activeRole === 'boss') return prev;
                        const updatedState = {
                          ...prev,
                          subscriptionTier: profileData.subscription_tier || 'FREE',
                          trialStartedAt: profileData.trial_started_at,
                          subscriptionEndsAt: profileData.current_period_end,
                          gracePeriodActionsLeft: profileData.grace_period_actions_left ?? null,
                        };
                        if (typeof window !== "undefined") {
                          localStorage.setItem("gx_empire_sub_snapshot", JSON.stringify(updatedState));
                        }
                        return updatedState;
                      });
                    }
                  });
              }
            });
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

      setSubscription(prev => {
        if (!prev.isLoaded) return prev;

        const { trialStartedAt, subscriptionEndsAt, subscriptionTier, gracePeriodEndsAt, gracePeriodActionsLeft } = prev;
        
        let newIsGracePeriodActive = prev.isGracePeriodActive;

        if (subscriptionEndsAt) {
          newIsGracePeriodActive = false;
        } else if (gracePeriodEndsAt) {
          const end = new Date(gracePeriodEndsAt);
          const diff = end.getTime() - trueNow.getTime();
          newIsGracePeriodActive = diff > 0;
        } else if (subscriptionTier === 'FREE' && trialStartedAt) {
          const start = new Date(trialStartedAt);
          const end = new Date(start.getTime() + 5 * 60 * 1000); // 5分钟满血试用
          const diff = end.getTime() - trueNow.getTime();
          
          if (diff <= 0) {
            if (gracePeriodActionsLeft !== null && gracePeriodActionsLeft > 0) {
              newIsGracePeriodActive = true;
            } else {
              newIsGracePeriodActive = false;
            }
          } else {
            newIsGracePeriodActive = false;
          }
        } else {
          newIsGracePeriodActive = false;
        }

        // 只有当 isGracePeriodActive 真正发生物理状态翻转时，才触发 setSubscription 重绘
        if (newIsGracePeriodActive !== prev.isGracePeriodActive) {
          return { ...prev, isGracePeriodActive: newIsGracePeriodActive };
        }
        
        return prev;
      });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, []); // 移除依赖数组，让闭包只跑一次，内部用 setSubscription(prev => ...) 来计算

  // --- 紧急运力续命逻辑：监听任意修改动作并扣减 ---
  const trackAction = useCallback(async () => {
    if (!subscription.isGracePeriodActive || subscription.gracePeriodActionsLeft === null || !subscription.empireId) return;
    try {
      const newActionsLeft = Math.max(0, subscription.gracePeriodActionsLeft - 1);
      await supabase.from('profiles').update({ grace_period_actions_left: newActionsLeft }).eq('id', subscription.empireId);
      // Realtime 会自动把新的次数同步到所有端
    } catch (e) {
      console.error("Failed to deduct grace period action:", e);
    }
  }, [subscription.isGracePeriodActive, subscription.gracePeriodActionsLeft, subscription.empireId]);

  const setActiveShopId = (shopId: string | null) => {
    setActiveShopIdState(shopId);
  };

  const contextValue = useMemo(() => ({
    activeShopId: resolvedActiveShopId, 
    setActiveShopId, 
    availableShops, 
    subscription,
    openSubscriptionModal,
    closeSubscriptionModal,
    subscriptionModalMode,
    shopConfig,
    isShopConfigLoaded,
    updateShopConfig,
    updateFullShopConfig,
    globalBookings,
    refreshBookings,
    trackAction
  }), [
    resolvedActiveShopId, 
    availableShops, 
    subscription,
    openSubscriptionModal,
    closeSubscriptionModal,
    subscriptionModalMode,
    shopConfig,
    isShopConfigLoaded,
    updateShopConfig,
    updateFullShopConfig,
    globalBookings,
    refreshBookings,
    trackAction
  ]);

  return (
    <ShopContext.Provider value={contextValue}>
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
