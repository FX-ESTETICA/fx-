"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode, useRef } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { BookingService } from "@/features/booking/api/booking";
import { useVisualSettings, type VisualSettings } from '@/hooks/useVisualSettings';
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
  loadedBookingDates: string[];
  loadBookingsForDates: (dates: string[], options?: { force?: boolean }) => Promise<void>;
  ensureBookingWindow: (startDate: Date | string, aheadDays?: number) => Promise<void>;
  refreshBookings: () => Promise<void>;
  applyOptimisticPatch: (patchFn: (prev: any[]) => any[]) => () => void;
  trackAction: () => Promise<void>;
  // --- 僵尸网络态防伪探针 ---
  isDataStale: boolean;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

type BookingRowPayload = {
  id?: string;
  shop_id?: string;
  date?: string | null;
  start_time?: string | null;
  duration_min?: number | null;
  resource_id?: string | null;
  status?: string | null;
  data?: Record<string, unknown> | null;
};

type BookingChangePayload = {
  eventType?: string;
  table?: string;
  new?: BookingRowPayload;
  old?: BookingRowPayload;
};

const normalizeBookingRecord = (booking: BookingRowPayload) => ({
  id: booking.id || "",
  shopId: booking.shop_id,
  date: booking.date || "",
  startTime: booking.start_time || "00:00",
  duration: booking.duration_min ?? 0,
  resourceId: booking.resource_id ?? null,
  status: booking.status,
  ...(booking.data || {})
});

const BOOKING_DATE_SNAPSHOT_TTL = 12 * 60 * 60 * 1000;
const SHOP_CONFIG_SNAPSHOT_TTL = 24 * 60 * 60 * 1000;

const getBookingDateKey = (value: string | Date | null | undefined) => {
  if (!value) return "";
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return value.split("T")[0] || "";
};

const buildBookingDateWindow = (startDate: Date | string, aheadDays = 1) => {
  const startKey = getBookingDateKey(startDate);
  if (!startKey) return [];

  const start = new Date(`${startKey}T00:00:00`);
  if (Number.isNaN(start.getTime())) return [];

  return Array.from({ length: aheadDays + 1 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return getBookingDateKey(date);
  });
};

const getBookingDateSnapshotKey = (shopId: string, date: string) => `gx_bookings_snapshot_${shopId}_${date}`;
const getShopConfigSnapshotKey = (shopId: string) => `gx_shop_config_snapshot_${shopId}`;

const readShopConfigSnapshot = (shopId: string) => {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(getShopConfigSnapshotKey(shopId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed?.timestamp && parsed?.data) {
      if (Date.now() - parsed.timestamp < SHOP_CONFIG_SNAPSHOT_TTL) {
        return parsed.data;
      }
      localStorage.removeItem(getShopConfigSnapshotKey(shopId));
      return null;
    }

    return parsed;
  } catch (e) {
    console.error("[ShopContext] Failed to read shop config snapshot", e);
    localStorage.removeItem(getShopConfigSnapshotKey(shopId));
    return null;
  }
};

const persistShopConfigSnapshot = (shopId: string | null, config: any) => {
  if (!shopId || typeof window === "undefined") return;
  localStorage.setItem(getShopConfigSnapshotKey(shopId), JSON.stringify({
    timestamp: Date.now(),
    data: config
  }));
};

const getVisualPrincipalId = (user: any, activeRole: string) => {
  if (!user) return "anonymous";
  if (activeRole === "merchant" || activeRole === "boss") {
    return user.merchant_gx_id || user.base_gx_id || user.gxId || user.id || "anonymous";
  }
  return user.base_gx_id || user.gxId || user.id || "anonymous";
};

const normalizeLoadedBooking = (booking: any) => ({
  ...booking,
  shopId: booking.shopId ?? booking.shop_id,
  date: getBookingDateKey(booking.date),
  startTime: booking.startTime ?? booking.start_time ?? "00:00",
  duration: booking.duration ?? booking.duration_min ?? 0,
  resourceId: booking.resourceId ?? booking.resource_id ?? null
});

const readBookingDateSnapshot = (shopId: string, date: string) => {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(getBookingDateSnapshotKey(shopId, date));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !Array.isArray(parsed.data)) {
      localStorage.removeItem(getBookingDateSnapshotKey(shopId, date));
      return null;
    }

    if (Date.now() - parsed.timestamp > BOOKING_DATE_SNAPSHOT_TTL) {
      localStorage.removeItem(getBookingDateSnapshotKey(shopId, date));
      return null;
    }

    return parsed.data.map(normalizeLoadedBooking);
  } catch (error) {
    console.error("[ShopContext] Failed to read booking date snapshot:", error);
    localStorage.removeItem(getBookingDateSnapshotKey(shopId, date));
    return null;
  }
};

const persistBookingDateSnapshots = (shopId: string | null, bookings: any[], dates: string[]) => {
  if (!shopId || typeof window === "undefined") return;

  const uniqueDates = Array.from(new Set(dates.filter(Boolean)));
  uniqueDates.forEach((date) => {
    const data = bookings
      .filter((booking) => getBookingDateKey(booking.date) === date)
      .map(normalizeLoadedBooking);

    localStorage.setItem(getBookingDateSnapshotKey(shopId, date), JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  });
};

export const ShopProvider = ({ children }: { children: ReactNode }) => {
  const { user, activeRole } = useAuth() as any; // activeRole is exposed by useAuth
  const { updateSettings, setSettingsScope } = useVisualSettings();
  const { setSpecificBackground } = useBackground();
  
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
  const [loadedBookingDatesMap, setLoadedBookingDatesMap] = useState<Record<string, true>>({});
  const [dirtyBookingDates, setDirtyBookingDates] = useState<Record<string, true>>({});
  const loadedBookingDatesRef = useRef<Record<string, true>>({});
  const dirtyBookingDatesRef = useRef<Record<string, true>>({});
  const pendingDateLoadsRef = useRef<Record<string, Promise<void>>>({});
  const activeBookingShopRef = useRef<string | null>(resolvedActiveShopId);
  activeBookingShopRef.current = resolvedActiveShopId;

  useEffect(() => {
    loadedBookingDatesRef.current = loadedBookingDatesMap;
  }, [loadedBookingDatesMap]);

  useEffect(() => {
    dirtyBookingDatesRef.current = dirtyBookingDates;
  }, [dirtyBookingDates]);

  const loadedBookingDates = useMemo(() => Object.keys(loadedBookingDatesMap).sort(), [loadedBookingDatesMap]);

  const loadBookingsForDates = useCallback(async (dates: string[], options?: { force?: boolean }) => {
    if (!resolvedActiveShopId || resolvedActiveShopId === 'default') return;
    const requestShopId = resolvedActiveShopId;

    const normalizedDates = Array.from(new Set(
      dates.map((date) => getBookingDateKey(date)).filter(Boolean)
    )).sort();

    if (normalizedDates.length === 0) return;

    const datesToFetch = normalizedDates.filter((date) => (
      options?.force || !loadedBookingDatesRef.current[date] || dirtyBookingDatesRef.current[date]
    ));

    if (datesToFetch.length === 0) return;

    if (!options?.force) {
      const cachedRowsByDate = datesToFetch
        .map((date) => ({ date, rows: readBookingDateSnapshot(requestShopId, date) }))
        .filter((entry): entry is { date: string; rows: any[] } => Array.isArray(entry.rows));

      if (cachedRowsByDate.length > 0) {
        const cachedDates = cachedRowsByDate.map((entry) => entry.date);
        const cachedDateSet = new Set(cachedDates);
        const cachedRows = cachedRowsByDate.flatMap((entry) => entry.rows);

        setGlobalBookings((prev) => [
          ...cachedRows,
          ...prev.filter((booking) => !cachedDateSet.has(getBookingDateKey(booking.date)))
        ]);

        setLoadedBookingDatesMap((prev) => {
          const next = { ...prev };
          cachedDates.forEach((date) => {
            next[date] = true;
          });
          return next;
        });
      }
    }

    const loadKey = `${requestShopId}:${datesToFetch.join(",")}:${options?.force ? "force" : "normal"}`;
    const existingLoad = pendingDateLoadsRef.current[loadKey];
    if (existingLoad) {
      await existingLoad;
      return;
    }

    const loadPromise = (async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const { data } = await BookingService.getBookingsByDates(requestShopId, datesToFetch, controller.signal);
        clearTimeout(timeoutId);
        if (activeBookingShopRef.current !== requestShopId) return;
        setIsDataStale(false);

        const dateSet = new Set(datesToFetch);
        const safeBookings = (data || [])
          .map(normalizeLoadedBooking)
          .filter((booking) => dateSet.has(getBookingDateKey(booking.date)));

        setGlobalBookings((prev) => {
          const next = [
            ...safeBookings,
            ...prev.filter((booking) => !dateSet.has(getBookingDateKey(booking.date)))
          ];
          persistBookingDateSnapshots(requestShopId, next, datesToFetch);
          return next;
        });

        setLoadedBookingDatesMap((prev) => {
          const next = { ...prev };
          datesToFetch.forEach((date) => {
            next[date] = true;
          });
          return next;
        });

        setDirtyBookingDates((prev) => {
          const next = { ...prev };
          datesToFetch.forEach((date) => {
            delete next[date];
          });
          return next;
        });
      } catch (e: any) {
        clearTimeout(timeoutId);
        if (activeBookingShopRef.current !== requestShopId) return;
        const errMsg = e?.message || String(e);
        if (errMsg.includes('Failed to fetch') || errMsg.includes('AbortError')) {
          console.warn("[ShopContext] booking date-window fetch failed; keeping local snapshots:", errMsg);
        } else {
          console.error("[ShopContext] Failed to load booking date window:", e);
        }
        setIsDataStale(true);
      }
    })();

    pendingDateLoadsRef.current[loadKey] = loadPromise;

    try {
      await loadPromise;
    } finally {
      delete pendingDateLoadsRef.current[loadKey];
    }
  }, [resolvedActiveShopId]);

  const visualPrincipalId = useMemo(() => getVisualPrincipalId(user, activeRole), [user, activeRole]);
  const visualSettingsScopeKey = useMemo(() => {
    if (!resolvedActiveShopId) return null;
    return `${visualPrincipalId}:${resolvedActiveShopId}`;
  }, [resolvedActiveShopId, visualPrincipalId]);

  const visualSettingsSeed = useMemo<Partial<VisualSettings> | null>(() => {
    if (!resolvedActiveShopId || typeof window === "undefined") return null;
    return readShopConfigSnapshot(resolvedActiveShopId)?.visualSettings || null;
  }, [resolvedActiveShopId]);

  useEffect(() => {
    setSettingsScope(visualSettingsScopeKey, visualSettingsSeed);
  }, [setSettingsScope, visualSettingsScopeKey, visualSettingsSeed]);

  const ensureBookingWindow = useCallback(async (startDate: Date | string, aheadDays = 1) => {
    await loadBookingsForDates(buildBookingDateWindow(startDate, aheadDays));
  }, [loadBookingsForDates]);

  const refreshBookings = useCallback(async () => {
    const loadedDates = Object.keys(loadedBookingDatesRef.current);
    const targetDates = loadedDates.length > 0 ? loadedDates : buildBookingDateWindow(new Date(), 1);
    await loadBookingsForDates(targetDates, { force: true });
  }, [loadBookingsForDates]);

  const warmOrRefreshBookings = useCallback(async () => {
    const loadedDates = Object.keys(loadedBookingDatesRef.current);
    if (loadedDates.length > 0) {
      await refreshBookings();
      return;
    }
    await ensureBookingWindow(new Date(), 1);
  }, [ensureBookingWindow, refreshBookings]);

  // ==========================================
  // 【世界顶端：乐观更新引擎 (Optimistic UI Engine)】
  // ==========================================
  const applyOptimisticPatch = useCallback((patchFn: (prev: any[]) => any[]) => {
    let previousState: any[] = [];
    setGlobalBookings(prev => {
      previousState = [...prev];
      const next = patchFn(prev);
      persistBookingDateSnapshots(resolvedActiveShopId, next, Object.keys(loadedBookingDatesRef.current));
      return next;
    });
    
    // 返回回滚函数 (Rollback)
    return () => {
      console.warn("[ShopContext] ⚠️ 乐观更新失败，触发物理回滚...");
      persistBookingDateSnapshots(resolvedActiveShopId, previousState, Object.keys(loadedBookingDatesRef.current));
      setGlobalBookings(previousState);
    };
  }, [resolvedActiveShopId]);

  const applyRealtimeBookingPayload = useCallback((payload: BookingChangePayload) => {
    if (!resolvedActiveShopId || resolvedActiveShopId === 'default') return;

    const nextRow = payload?.new;
    const oldRow = payload?.old;
    const targetRow = nextRow || oldRow;
    if (!targetRow?.id) return;

    const targetShopId = nextRow?.shop_id || oldRow?.shop_id;
    if (targetShopId && targetShopId !== resolvedActiveShopId) return;

    const affectedDates = Array.from(new Set([
      getBookingDateKey(nextRow?.date),
      getBookingDateKey(oldRow?.date)
    ].filter(Boolean)));

    const isRemovalEvent = payload?.eventType === 'DELETE' || nextRow?.status === 'VOID';
    if (isRemovalEvent && affectedDates.length === 0) {
      setGlobalBookings(prev => {
        const updated = prev.filter((booking) => booking.id !== targetRow.id);
        if (updated !== prev) {
          persistBookingDateSnapshots(resolvedActiveShopId, updated, Object.keys(loadedBookingDatesRef.current));
        }
        return updated;
      });
      return;
    }

    const loadedAffectedDates = affectedDates.filter((date) => loadedBookingDatesRef.current[date]);
    const unloadedAffectedDates = affectedDates.filter((date) => !loadedBookingDatesRef.current[date]);

    if (unloadedAffectedDates.length > 0) {
      setDirtyBookingDates((prev) => {
        const next = { ...prev };
        unloadedAffectedDates.forEach((date) => {
          next[date] = true;
        });
        return next;
      });
    }

    if (loadedAffectedDates.length === 0) return;

    setGlobalBookings(prev => {
      let updated = prev.filter((booking) => booking.id !== targetRow.id);

      if (payload?.eventType !== 'DELETE' && nextRow?.status !== 'VOID' && nextRow) {
        const normalized = normalizeLoadedBooking(normalizeBookingRecord(nextRow));
        const normalizedDate = getBookingDateKey(normalized.date);
        if (loadedBookingDatesRef.current[normalizedDate]) {
          updated = [normalized, ...updated];
        }
      }

      persistBookingDateSnapshots(resolvedActiveShopId, updated, loadedAffectedDates);

      return updated;
    });
  }, [resolvedActiveShopId]);

  useEffect(() => {
    if (!resolvedActiveShopId || resolvedActiveShopId === 'default') {
      setShopConfig(null);
      setIsShopConfigLoaded(true);
      setGlobalBookings([]);
      setLoadedBookingDatesMap({});
      setDirtyBookingDates({});
      loadedBookingDatesRef.current = {};
      dirtyBookingDatesRef.current = {};
      pendingDateLoadsRef.current = {};
      return;
    }

    let isMounted = true;
    setIsShopConfigLoaded(false);
    setGlobalBookings([]);
    setLoadedBookingDatesMap({});
    setDirtyBookingDates({});
    loadedBookingDatesRef.current = {};
    dirtyBookingDatesRef.current = {};
    pendingDateLoadsRef.current = {};

    // 【水合安全 0秒快照加载】: 在发起网络请求前，瞬间同步读取并更新状态。
    try {
      const cachedConfig = readShopConfigSnapshot(resolvedActiveShopId);
      if (cachedConfig && isMounted) {
        setShopConfig(cachedConfig);
        setIsShopConfigLoaded(true);
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
          persistShopConfigSnapshot(resolvedActiveShopId, finalConfig);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error("[ShopContext] Failed to load shop config:", err);
        // 【防御性自毁】：连续网络错误导致配置无法拉取，清理过期配置快照
        if (typeof window !== "undefined") {
          localStorage.removeItem(getShopConfigSnapshotKey(resolvedActiveShopId));
        }
        if (isMounted) setIsShopConfigLoaded(true);
      }
    };

    const fetchTimer = setTimeout(() => {
      fetchShopConfig();
      // 同时也立刻拉取一次订单
      void ensureBookingWindow(new Date(), 1);
    }, 1000);

    // ==========================================
    // 【世界顶端：全局总线分发接管】
    // 彻底废除分散的 Realtime Channel、Debounce 锁、和 30秒暴力探针
    // ==========================================
    const handleShopUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const payload = customEvent.detail;
      if (payload.table === 'shops' && payload.new?.id === resolvedActiveShopId) {
        const newConfig = payload.new?.config;
        if (newConfig && isMounted) {
          setShopConfig(newConfig);
          persistShopConfigSnapshot(resolvedActiveShopId, newConfig);
        }
      }
    };

    const handleBookingUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const payload = customEvent.detail;
      if (payload.table === 'bookings' && isMounted) {
        applyRealtimeBookingPayload(payload);
      }
    };

    window.addEventListener('gx_global_shops_update', handleShopUpdate);
    window.addEventListener('gx_global_bookings_update', handleBookingUpdate);

    // 【唯一全局 Realtime 隧道】：重新接管跨端秒级同步
    let globalChannel: ReturnType<typeof supabase.channel> | null = null;
    let channelGeneration = 0;

    const createGlobalChannel = (reason: string) => {
      channelGeneration += 1;
      const channel = supabase
        .channel(`global_db_changes_${resolvedActiveShopId}_${channelGeneration}_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings', filter: `shop_id=eq.${resolvedActiveShopId}` },
          (payload) => {
            if (isMounted && globalChannel === channel) {
              console.log("📡 [ShopContext] 收到远端 Bookings 更新，触发全局同步:", payload);
              applyRealtimeBookingPayload(payload);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'shops', filter: `id=eq.${resolvedActiveShopId}` },
          (payload) => {
            if (isMounted && globalChannel === channel) {
              console.log("📡 [ShopContext] 收到远端 Shops 更新，触发全局同步:", payload);
              fetchShopConfig();
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED' && isMounted && globalChannel === channel) {
            console.log(`📡 [ShopContext] ${reason} realtime subscribed for shop_id=${resolvedActiveShopId}`);
            if (isMounted) void ensureBookingWindow(new Date(), 1);
          }
        });
      globalChannel = channel;
    };

    createGlobalChannel('initial');

    // 【全局唤醒状态机接管】：当 APP 从后台切回、或网络恢复时，执行唯一真理指令塔
    const handleGlobalSyncSync = async () => {
      if (isMounted) {
        await BookingService.syncOfflineMutations();
        fetchShopConfig();
        await warmOrRefreshBookings();
      }
    };
    handleGlobalSyncSync();

    // 【监听全局同步发令枪】
    const unsubscribeSync = useSyncStore.subscribe((state, prevState) => {
      if (state.syncTick > prevState.syncTick) {
        console.log("📡 [ShopContext] 收到全局发令枪，触发深度唤醒与数据补扫！");
        handleGlobalSyncSync();
      }
      // 【监听探针发现的死锁事件，执行连接物理销毁与重建】
      if (state.resurrectTick > prevState.resurrectTick) {
        console.log("⚠️ [ShopContext] 收到死锁重建指令，物理重置 WebSocket 连接池...");
        const staleChannel = globalChannel;
        globalChannel = null;
        if (staleChannel) {
          void supabase.removeChannel(staleChannel);
        }
        // 执行重连和补扫
        handleGlobalSyncSync();
        createGlobalChannel('resurrect');
      }
    });

    const handleResurrect = () => {
      if (isMounted) {
        void warmOrRefreshBookings();
      }
    };
    handleResurrect();

    return () => {
      isMounted = false;
      unsubscribeSync();
      clearTimeout(fetchTimer);
      window.removeEventListener('gx_global_shops_update', handleShopUpdate);
      window.removeEventListener('gx_global_bookings_update', handleBookingUpdate);
      if (globalChannel) {
        void supabase.removeChannel(globalChannel);
      }
    };
  }, [resolvedActiveShopId, ensureBookingWindow, warmOrRefreshBookings, applyRealtimeBookingPayload]);

  // 原子级局部更新 API (乐观更新 + 数据库回写)
  const updateShopConfig = useCallback(async (key: string, payload: any) => {
    if (!resolvedActiveShopId || resolvedActiveShopId === 'default') return;

    // 乐观更新
    const patch = { [key]: payload };
    setShopConfig((prev: any) => {
      const newState = { ...(prev || {}), ...patch };
      // 【乐观更新快照同步】
      persistShopConfigSnapshot(resolvedActiveShopId, newState);
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
      persistShopConfigSnapshot(resolvedActiveShopId, newState);
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

        // 2. 建立全局事件监听，监听 Boss Profile 的变动
        if (empireId && isMounted) {
          const handleEmpireUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            const payload = customEvent.detail;
            
            if (payload.table === 'profiles' && payload.new?.id === empireId) {
              if (activeRole === 'boss') return; // Boss 免疫实时覆盖
              console.log("[ShopContext] 📡 全局总线分发: Empire subscription update received:", payload.new);
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
          };

          window.addEventListener('gx_global_auth_update', handleEmpireUpdate);
          
          // 暴露给闭包用于清理
          channel = handleEmpireUpdate;
        }

      } catch (e) {
        console.error("[ShopContext] Failed to fetch subscription data", e);
      }
    };

    fetchSubscriptionData();

    return () => {
      isMounted = false;
      if (channel) {
        window.removeEventListener('gx_global_auth_update', channel);
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
      loadedBookingDates,
      loadBookingsForDates,
      ensureBookingWindow,
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
      loadedBookingDates,
      loadBookingsForDates,
      ensureBookingWindow,
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
