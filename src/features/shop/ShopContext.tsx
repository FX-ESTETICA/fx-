"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode, useRef } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { BookingService, BookingRealtimePayload } from "@/features/booking/api/booking";
import { useVisualSettings } from '@/hooks/useVisualSettings';
import { useBackground } from '@/hooks/useBackground';
import { useSyncStore } from '@/store/useSyncStore';

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
  applyOptimisticPatch: (patchFn: (prev: any[]) => any[]) => () => void;
  trackAction: () => Promise<void>;
  // --- 僵尸网络态防伪探针 ---
  isDataStale: boolean;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider = ({ children }: { children: ReactNode }) => {
  const { user, activeRole } = useAuth() as any; // activeRole is exposed by useAuth
  const { updateSettings } = useVisualSettings();
  const { setSpecificBackground } = useBackground();
  const syncTick = useSyncStore(state => state.syncTick);
  const resurrectTick = useSyncStore(state => state.resurrectTick);
  
  const [activeShopId, setActiveShopIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("gx_active_shop_id");
  });

  const [isDataStale, setIsDataStale] = useState(false);

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
  const rawBindingsSignature = useMemo(() => {
    if (!user || !("bindings" in user) || !user.bindings) return "[]";
    return JSON.stringify(user.bindings);
  }, [user]);

  // 【金钟罩】：防闪断 bindings 锁。抵御切回前台时，useAuth 刷新导致的短暂 bindings 丢失，从而引发整个 UI 树被卸载
  const latchedBindings = useRef<string>(rawBindingsSignature);
  if (rawBindingsSignature !== "[]") {
    latchedBindings.current = rawBindingsSignature;
  }
  const bindingsSignature = rawBindingsSignature !== "[]" ? rawBindingsSignature : latchedBindings.current;

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒物理死亡线

    try {
      const { data } = await BookingService.getBookings(resolvedActiveShopId, controller.signal);
      clearTimeout(timeoutId);
      setIsDataStale(false); // 成功拉取，解除失联状态

      // 预处理，防止空字段
      const safeBookings = (data || []).map((booking: any) => ({
        ...booking,
        resourceId: booking.resourceId ?? null,
        date: booking.date || "",
        startTime: booking.startTime || "00:00",
        duration: booking.duration ?? 0
      }));
      setGlobalBookings(safeBookings);
      // 【快照覆写】：带上时间戳的物理封装
      if (typeof window !== "undefined") {
        const snapshotPayload = {
          timestamp: Date.now(),
          data: safeBookings
        };
        localStorage.setItem(`gx_bookings_snapshot_${resolvedActiveShopId}`, JSON.stringify(snapshotPayload));
      }
      } catch (e: any) {
        clearTimeout(timeoutId);
        const errMsg = e?.message || String(e);
        if (errMsg.includes('Failed to fetch') || errMsg.includes('AbortError')) {
          console.warn("🛡️ [ShopContext] 监测到网络波动 (Failed to fetch/AbortError)，触发物理快照护盾，界面安全。");
        } else {
          console.error("[ShopContext] Failed to load cloud bookings:", e);
        }
        // 【绝对铁壁法则】：网络超时或报错时，绝对信任并保留本地快照，仅触发 stale 状态供后台监控
        // 废除自毁代码，彻底杜绝切回前台瞬间网速不佳导致的“永久白板” Bug
        setIsDataStale(true);
      }
    }, [resolvedActiveShopId]);

  // ==========================================
  // 【世界顶端：乐观更新引擎 (Optimistic UI Engine)】
  // ==========================================
  const applyOptimisticPatch = useCallback((patchFn: (prev: any[]) => any[]) => {
    let previousState: any[] = [];
    setGlobalBookings(prev => {
      previousState = [...prev];
      return patchFn(prev);
    });
    
    // 返回回滚函数 (Rollback)
    return () => {
      console.warn("[ShopContext] ⚠️ 乐观更新失败，触发物理回滚...");
      setGlobalBookings(previousState);
    };
  }, []);

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
    try {
      const cachedConfigRaw = localStorage.getItem(`gx_shop_config_snapshot_${resolvedActiveShopId}`);
      if (cachedConfigRaw && isMounted) {
        const parsedConfig = JSON.parse(cachedConfigRaw);
        // 兼容新旧格式：如果有 timestamp，且在 24 小时内，才使用其 data
        if (parsedConfig.timestamp && parsedConfig.data) {
          if (Date.now() - parsedConfig.timestamp < 24 * 60 * 60 * 1000) {
            setShopConfig(parsedConfig.data);
            setIsShopConfigLoaded(true);
          } else {
             localStorage.removeItem(`gx_shop_config_snapshot_${resolvedActiveShopId}`);
          }
        } else {
          // 旧版无时间戳格式，直接使用但标记过期
          setShopConfig(parsedConfig);
          setIsShopConfigLoaded(true);
        }
      }

      const cachedBookingsRaw = localStorage.getItem(`gx_bookings_snapshot_${resolvedActiveShopId}`);
      if (cachedBookingsRaw && isMounted) {
        const parsedBookings = JSON.parse(cachedBookingsRaw);
        if (parsedBookings.timestamp && parsedBookings.data) {
          // 订单快照 TTL：严格的 12 小时淘汰
          if (Date.now() - parsedBookings.timestamp < 12 * 60 * 60 * 1000) {
            setGlobalBookings(parsedBookings.data);
          } else {
            localStorage.removeItem(`gx_bookings_snapshot_${resolvedActiveShopId}`);
          }
        } else {
          // 旧版格式，直接使用
          setGlobalBookings(parsedBookings);
        }
      }
    } catch (e) {
      console.error("[ShopContext] Failed to load snapshot", e);
    }

    // 1. Initial Fetch
    const fetchShopConfig = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const { data, error } = await supabase
          .from('shops')
          .select('config')
          .eq('id', resolvedActiveShopId)
          .abortSignal(controller.signal)
          .maybeSingle();

        clearTimeout(timeoutId);

        if (error) throw error;
        if (isMounted) {
          const finalConfig = data?.config || {};
          setShopConfig(finalConfig);
          setIsShopConfigLoaded(true);
          // 【快照覆写】：带上时间戳的物理封装
          if (typeof window !== "undefined") {
            const configSnapshot = {
              timestamp: Date.now(),
              data: finalConfig
            };
            localStorage.setItem(`gx_shop_config_snapshot_${resolvedActiveShopId}`, JSON.stringify(configSnapshot));
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error("[ShopContext] Failed to load shop config:", err);
        // 【防御性自毁】：连续网络错误导致配置无法拉取，清理过期配置快照
        if (typeof window !== "undefined") {
          localStorage.removeItem(`gx_shop_config_snapshot_${resolvedActiveShopId}`);
        }
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
    let bookingChannelBirthTime = Date.now(); // 【新生保护期盾牌】

    const handleBookingUpdate = () => {
      if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
      realtimeDebounceTimer = setTimeout(() => {
        if (isMounted) refreshBookings();
      }, 300); // 300ms 防抖，将几十次连续插入合并为 1 次 Fetch
    };

    let channelBookings = BookingService.subscribeToShopBookings(resolvedActiveShopId, (payload: BookingRealtimePayload) => {
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

    // 【终极保底探针】：每 30 秒检查一次核心 WebSocket 通道，防止被系统静默掐断
    const heartbeatTimer = setInterval(() => {
      if (isMounted && resolvedActiveShopId) {
        // 【防误杀判断】：如果连接才刚刚诞生不到 5 秒，绝对不可能是僵尸，跳过猎杀！
        if (Date.now() - bookingChannelBirthTime < 5000) return;

        const activeChannels = supabase.getChannels();
        const hasBookingChannel = activeChannels.some(c => c.topic === `realtime:public:bookings:${resolvedActiveShopId}`);
        if (!hasBookingChannel) {
          console.warn(`[ShopContext] 💔 探针发现 Booking Realtime 通道假死或丢失，执行物理重建...`);
          // 先尝试清理旧的
          if (channelBookings) {
            try { BookingService.unsubscribe(channelBookings); } catch(e) {}
          }
          // 强行重建
          bookingChannelBirthTime = Date.now(); // 刷新诞生时间
          channelBookings = BookingService.subscribeToShopBookings(resolvedActiveShopId, () => {
            handleBookingUpdate();
          }, () => {
            handleBookingUpdate();
          });
        }
      }
    }, 30000);

    // 【全局唤醒状态机接管】：当 APP 从后台切回、或网络恢复时，执行唯一真理指令塔
    const handleGlobalSyncSync = async () => {
      if (syncTick === 0) return; // 初始挂载不管
      console.log(`[ShopContext] Global sync triggered (Tick=${syncTick}), executing unified recovery pipeline for shop ${resolvedActiveShopId}...`);
      if (isMounted) {
        // 1. 离线队列同步
        console.log("[ShopContext] 🌍 触发离线队列上传");
        await BookingService.syncOfflineMutations();

        // 3. 重新拉取配置与订单
        fetchShopConfig();
        refreshBookings();
      }
    };
    handleGlobalSyncSync();

    const handleResurrect = () => {
      if (resurrectTick === 0) return;
      if (isMounted) {
        // 2. 【物理级 Nuke Protocol】: 彻底粉碎并重建 WebSocket，击穿基带假死
        console.warn(`[ShopContext] ☢️ Nuke Protocol: Destroying zombie connections (Tick=${resurrectTick})...`);
        if (channelBookings) {
          try { BookingService.unsubscribe(channelBookings); } catch(e) {}
        }

        bookingChannelBirthTime = Date.now(); // 刷新诞生时间
        channelBookings = BookingService.subscribeToShopBookings(resolvedActiveShopId, () => {
          handleBookingUpdate();
        }, () => {
          handleBookingUpdate();
        });
      }
    };
    handleResurrect();

    return () => {
      isMounted = false;
      if (configDebounceTimer) clearTimeout(configDebounceTimer);
      if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
      clearInterval(heartbeatTimer);
      supabase.removeChannel(channelConfig);
      if (channelBookings) {
        BookingService.unsubscribe(channelBookings);
      }
    };
  }, [resolvedActiveShopId, syncTick, resurrectTick, refreshBookings]);

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
      applyOptimisticPatch,
      trackAction,
      isDataStale
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
      applyOptimisticPatch,
      trackAction,
      isDataStale
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
