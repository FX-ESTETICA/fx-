"use client";

import { useEffect, useState, useCallback, createContext, useContext, ReactNode, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, isMockMode } from "@/lib/supabase";

export type UserRole = "user" | "merchant" | "boss";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "499755740@qq.com";

// --- 沙盒扩展：Mock 用户数据结构 ---
export interface SandboxUser extends Omit<User, 'created_at'> {
  gxId: string;
  name: string;
  role: UserRole;
  shopId?: string;
  shopName?: string;
  avatar?: string;
  created_at: string;
  // 新增：支持多门店绑定
  bindings?: { shopId: string; role: string; industry: string; shopName?: string }[];
  // 核心升级：增加性别与生日，用于强阻断拦截
  gender?: string | null;
  birthday?: string | null;
  // 核心升级：申请状态引擎，用于全站卡片隐藏与意图保持
  applicationStatus?: 'idle' | 'pending' | 'approved' | 'rejected';
  // 双ID架构：同时存储两个物理锚点
  base_gx_id?: string | null;
  merchant_gx_id?: string | null;
  merchant_name?: string | null;
  merchant_avatar_url?: string | null;
  merchant_phone?: string | null;
  boss_name?: string | null;
  boss_avatar_url?: string | null;
  boss_phone?: string | null;
  // 核心升级：个人订阅资产字段
  subscription_tier?: string | null;
  current_period_end?: string | null;
  trial_started_at?: string | null;
}

type ShopBindingRow = {
  shop_id: string;
  role: string;
  shops?: { id?: string; name?: string; industry?: string } | { id?: string; name?: string; industry?: string }[] | null;
};

const mapShopBindings = (bindings?: ShopBindingRow[] | null): SandboxUser["bindings"] => {
  if (!bindings) return [];
  return bindings.map((b) => {
    const shop = Array.isArray(b.shops) ? b.shops[0] : b.shops;
    return {
      shopId: b.shop_id,
      role: b.role,
      shopName: shop?.name,
      industry: shop?.industry || "other"
    };
  });
};

interface AuthContextType {
  user: SandboxUser | User | null;
  session: Session | null;
  isLoading: boolean;
  isRoleLoaded: boolean; // 新增：身份水合锁状态
  activeRole: UserRole;
  signOut: () => Promise<void>;
  setActiveRole: (role: UserRole) => void;
  injectMockUser: (user: SandboxUser) => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - 全局身份验证上下文提供者
 * 实现用户 Session 的物理挂载与状态同步
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SandboxUser | User | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("gx_cached_user");
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [session, setSession] = useState<Session | null>(null);
  const [activeRole, setActiveRoleState] = useState<UserRole>("user");
  // 世界顶端 Local-First 架构：彻底废除初始 Loading 锁！
  // 只要硬盘里有缓存的用户数据，瞬间渲染 UI，绝不让骨架屏撕裂 DOM
  const [isLoading, setIsLoading] = useState(false);
  const [hasConfirmedSession, setHasConfirmedSession] = useState(false);
  const [isRoleLoaded, setIsRoleLoaded] = useState(false); // 初始化为 false，代表身份正在解析中
  const [localViewRole, setLocalViewRole] = useState<UserRole | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("gx_view_role");
    if (stored === "user" || stored === "merchant" || stored === "boss") return stored as UserRole;
    return null;
  });

  const getDeviceId = useCallback(() => {
    if (typeof window === "undefined") return null;
    let deviceId = localStorage.getItem("gx_device_id");
    if (!deviceId) {
      deviceId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `gx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("gx_device_id", deviceId);
    }
    return deviceId;
  }, []);

  const syncDeviceSession = useCallback(async (nextSession?: Session | null) => {
    if (isMockMode) return;
    const currentSession = nextSession ?? session;
    if (!hasConfirmedSession) return;
    if (!user) return;
    if (!currentSession?.user || !currentSession.access_token || !currentSession.expires_at) return;
    if (currentSession.expires_at * 1000 < Date.now()) return;
    const deviceId = getDeviceId();
    if (!deviceId) return;
    
    try {
      // 仅记录设备在线状态（Upsert），不再执行任何的 window_id 检查或互踢逻辑 (Option A)
      await supabase
        .from('device_sessions')
        .upsert({ 
          device_id: deviceId, 
          user_id: currentSession.user.id, 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'device_id,user_id' });
        
      // 静默处理网络拦截或表不存在的报错，遵循 0 报错法则
      // if (error) console.warn("Device session sync skipped.");
    } catch (err) {
      // 物理屏蔽 Failed to fetch 等网络层面抛出的崩溃红字
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getDeviceId, hasConfirmedSession]);

  const buildExtendedUser = async (activeSession: Session, profile: any, appStatus: any, oldBindings: any, ownedShops: any, isBoss: boolean) => {
    let shopBindings = mapShopBindings(oldBindings as ShopBindingRow[] | null);

    // 如果存在 profile.gx_id 或 profile.merchant_gx_id，才去拉取最新的 bindings
    const principalIds = [profile?.gx_id, profile?.merchant_gx_id].filter(Boolean);
    if (principalIds.length > 0) {
      const { data: newBindings, error: newBindingsError } = await supabase
        .from('bindings')
        .select('shop_id, role, shops(id, name, industry)')
        .in('principal_id', principalIds);
      
      if (!newBindingsError && newBindings && newBindings.length > 0) {
        // 【核心修复：多租户身份叠加法则 + 强去重】
        const mappedNewBindings = mapShopBindings(newBindings as ShopBindingRow[]);
        
        const uniqueBindingsMap = new Map<string, NonNullable<SandboxUser["bindings"]>[0]>();
        
        // 先放入旧表的数据 (通常是 OWNER)
        (shopBindings || []).forEach(b => uniqueBindingsMap.set(b.shopId, b));
        
        // 再放入新表的数据，但要判断权限高低
        (mappedNewBindings || []).forEach(newB => {
          const existing = uniqueBindingsMap.get(newB.shopId);
          if (!existing) {
            uniqueBindingsMap.set(newB.shopId, newB);
          } else if (existing.role !== 'OWNER' && newB.role === 'OWNER') {
            uniqueBindingsMap.set(newB.shopId, newB);
          }
        });

        shopBindings = Array.from(uniqueBindingsMap.values());
      }
    }

    // 如果是 Boss，强制接管并覆盖所有名下门店
    if (isBoss && ownedShops) {
      shopBindings = ownedShops.map((shop: any) => ({
        shopId: shop.id,
        role: 'OWNER',
        shopName: shop.name,
        industry: shop.industry || 'other'
      }));
    }

    const isMerchant = shopBindings && shopBindings.some(b => b.role === 'OWNER');
    const actualRole = isBoss ? "boss" : (isMerchant ? "merchant" : profile.role);
    const actualName = profile.name || activeSession.user.user_metadata?.name || activeSession.user.user_metadata?.full_name;
    const actualAvatar = profile.avatar_url || activeSession.user.user_metadata?.avatar_url;
    // 核心修复：根据当前实际角色提取对应的物理锚点 ID
    const actualId = isBoss ? "GX88888888" : 
                     (localViewRole === "merchant" || (actualRole === "merchant" && !localViewRole)) 
                       ? (profile.merchant_gx_id || profile.gx_id) 
                       : profile.gx_id;
    const allowedRoles = actualRole === "boss" ? ["user", "merchant", "boss"] : actualRole === "merchant" ? ["user", "merchant"] : ["user"];
    const effectiveRole = localViewRole && allowedRoles.includes(localViewRole) ? localViewRole : actualRole;

    return {
      extendedUser: {
        ...activeSession.user,
        gxId: actualId,
        base_gx_id: profile.gx_id, // 永远记录原始生活ID
        merchant_gx_id: profile.merchant_gx_id, // 永远记录原始智控ID
        role: actualRole,
        avatar: actualAvatar,
        merchant_name: profile.merchant_name,
        merchant_avatar_url: profile.merchant_avatar_url,
        merchant_phone: profile.merchant_phone,
        boss_name: profile.boss_name,
        boss_avatar_url: profile.boss_avatar_url,
        boss_phone: profile.boss_phone,
        phone: profile.phone,
        name: actualName,
        gender: profile.gender || activeSession.user.user_metadata?.gender || "unknown",
        birthday: profile.birthday || activeSession.user.user_metadata?.birthday || null,
        bindings: shopBindings,
        applicationStatus: appStatus,
        subscription_tier: profile.subscription_tier || null,
        current_period_end: profile.current_period_end || null,
        trial_started_at: profile.trial_started_at || null
      } as SandboxUser,
      effectiveRole
    };
  };

  const hydrateSession = useCallback(async (nextSession: Session | null) => {
    if (isMockMode) {
      setSession(nextSession);
      setUser(null);
      return;
    }
    setSession(nextSession);
    if (nextSession?.user) {
      localStorage.removeItem("gx_guest_mode");
      try {
        const isBoss = nextSession.user.email === ADMIN_EMAIL;
        const userId = nextSession.user.id;

        // 【世界顶端：网络并发引擎】打破瀑布流，一次性并发请求核心身份数据
        const [profileResult, appStatusResult, oldBindingsResult, bossShopsResult] = await Promise.allSettled([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          supabase.from('merchant_applications').select('status').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('shop_bindings').select('shop_id, role, shops(id, name, industry)').eq('user_id', userId).eq('role', 'OWNER'),
          isBoss ? supabase.from('shops').select('id, name, industry').limit(100) : Promise.resolve({ data: null, error: null })
        ]);

        // 核心修复：检查 profileResult 是否因断网失败
        const isProfileFetchFailed = profileResult.status === 'fulfilled' && profileResult.value.error;
        const profile = profileResult.status === 'fulfilled' && !profileResult.value.error ? profileResult.value.data : null;
        
        const appData = appStatusResult.status === 'fulfilled' && !appStatusResult.value.error ? appStatusResult.value.data : null;
        const appStatus: 'idle' | 'pending' | 'approved' | 'rejected' = appData ? (appData.status as 'pending' | 'approved' | 'rejected') : 'idle';
        const oldBindings = oldBindingsResult.status === 'fulfilled' && !oldBindingsResult.value.error ? oldBindingsResult.value.data : null;
        const ownedShops = bossShopsResult.status === 'fulfilled' && !bossShopsResult.value.error ? bossShopsResult.value.data : null;

        if (profile) {
          const { extendedUser, effectiveRole } = await buildExtendedUser(nextSession, profile, appStatus, oldBindings, ownedShops, isBoss);
        
          setUser(extendedUser);
          // 【Local-First 缓存锚点】：物理固化身份到本地，供下次秒开使用
          localStorage.setItem("gx_cached_user", JSON.stringify(extendedUser));
          
          setActiveRoleState(effectiveRole as UserRole);
          setIsRoleLoaded(true); // 物理锁解开：身份已经 100% 确认
          await syncDeviceSession(nextSession);
        } else if (isProfileFetchFailed) {
          // 【断网防御屏障】：如果是因为网络断开（fetch 失败但并不是真的没有这个人）
          // 绝对不能强行刷 PENDING，必须直接中断并保留原有的缓存数据！
          console.warn("[AuthProvider] Hydrate: Network disconnected or fetch failed, preserving existing cache.");
          return; // 立即撤退，保留上方的 initAuth 从 localStorage 加载出来的高保真 User 状态
        } else {
          // 【终极防爆兜底】：只有当网络畅通，但底层 profile 真的为空（触发器失效）时，才执行降级档案
          const fallbackRole = isBoss ? "boss" : "user";
          const fallbackUser = {
          ...nextSession.user,
          gxId: "PENDING",
          role: fallbackRole,
          avatar: nextSession.user.user_metadata?.avatar_url,
          merchant_name: null,
          merchant_avatar_url: null,
          boss_name: null,
          boss_avatar_url: null,
          name: nextSession.user.user_metadata?.name || nextSession.user.user_metadata?.full_name,
          gender: nextSession.user.user_metadata?.gender || "unknown",
          birthday: nextSession.user.user_metadata?.birthday || null,
          bindings: [],
          applicationStatus: 'idle'
        } as SandboxUser;
        
        setUser(fallbackUser);
        localStorage.setItem("gx_cached_user", JSON.stringify(fallbackUser));
        
        if (isBoss) setActiveRoleState("boss");
        setIsRoleLoaded(true); // 物理锁解开：身份已经 100% 确认
        }
      } catch (error) {
        console.error("[AuthProvider] Hydrate Error:", error);
        // 【终极防爆兜底】：如果发生极端的网络中断或意外抛错，必须塞入带有 gxId 的 SandboxUser，防止下游页面白屏崩溃
        const isBoss = nextSession.user.email === ADMIN_EMAIL;
        const fallbackRole = isBoss ? "boss" : "user";
        const fallbackUser = {
          ...nextSession.user,
          gxId: "PENDING",
          role: fallbackRole,
          avatar: nextSession.user.user_metadata?.avatar_url,
          merchant_name: null,
          merchant_avatar_url: null,
          boss_name: null,
          boss_avatar_url: null,
          name: nextSession.user.user_metadata?.name || nextSession.user.user_metadata?.full_name,
          gender: nextSession.user.user_metadata?.gender || "unknown",
          birthday: nextSession.user.user_metadata?.birthday || null,
          bindings: [],
          applicationStatus: 'idle'
        } as SandboxUser;
        
        // 核心修复：绝对禁止在这里覆写 localStorage！仅在内存中兜底，保护用户原有的高保真离线缓存。
        setUser(fallbackUser);
        setIsRoleLoaded(true); // 物理锁解开：身份降级确认
      }
    } else {
      setUser(null);
      setIsRoleLoaded(true); // 如果没登录，也解开锁，不要卡死白屏
      localStorage.removeItem("gx_cached_user");
    }
  }, [localViewRole, syncDeviceSession]);

  const initLock = useRef(false);

  // 4. 全局在线状态心跳与监听 (Global Presence)
  // 将在线状态监听提权至全局，只要用户登录，无论在哪个页面都保持在线状态
  useEffect(() => {
    if (isMockMode) return;
    if (!user || !user.id) return;
    
    // 创建全局 Presence 频道并绑定当前用户的身份标识
    const presenceChannel = supabase.channel('global_presence', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        window.dispatchEvent(new CustomEvent('gx_presence_sync', { detail: state }));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        window.dispatchEvent(new CustomEvent('gx_presence_join', { detail: { key, newPresences } }));
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        window.dispatchEvent(new CustomEvent('gx_presence_leave', { detail: { key, leftPresences } }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            online_at: new Date().toISOString(),
            user_id: user.id,
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [user?.id]);

  useEffect(() => {
    // 兼容历史版本残留，直接清除
    localStorage.removeItem("gx_guest_mode");
  }, []);

  // 1. 获取初始 Session (Supabase 真实环境)
  const initAuth = useCallback(async () => {
    try {
      if (isMockMode) {
        setIsLoading(false);
        return;
      }

      // 【Local-First 秒开引擎】：优先尝试从本地缓存恢复身份并直接放行
      const cachedUserStr = localStorage.getItem("gx_cached_user");
      let hasCachedUser = false;
      if (cachedUserStr) {
        try {
          const cachedUser = JSON.parse(cachedUserStr);
          if (cachedUser && cachedUser.id && cachedUser.gxId) {
            setUser(cachedUser);
            hasCachedUser = true;
            setIsLoading(false); // 瞬间砸碎加载结界，实现秒开！
          }
        } catch (e) {
          console.error("Failed to parse cached user", e);
        }
      }

      const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        const isNetworkError = sessionError.message?.toLowerCase().includes('fetch') || 
                               sessionError.message?.toLowerCase().includes('network') || 
                               (sessionError as any).status === 0 || 
                               (sessionError as any).status >= 500 || 
                               sessionError.name === 'AuthRetryableFetchError';
                               
        if (!isNetworkError) {
          setSession(null);
          setUser(null);
          localStorage.removeItem("gx_cached_user");
          
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch (err) {
          }
        }
        return;
      }

      if (initialSession?.user) {
        setHasConfirmedSession(true);
      } else {
        setHasConfirmedSession(false);
        if (hasCachedUser) {
          // 如果底层没登录，但上面放行了幽灵，现在必须拉回来
          setUser(null);
          localStorage.removeItem("gx_cached_user");
        }
      }
      
      // 无论如何，在后台静默同步真实数据 (SWR 机制)
      await hydrateSession(initialSession);
    } catch (error) {
    }
  }, [hydrateSession]);

  useEffect(() => {
    if (initLock.current) return;
    initLock.current = true; 

    // 屠杀级重构：延后 1 秒执行复杂的 Session 校验，把前 1 秒完全让给 UI 渲染
    const initTimer = setTimeout(() => {
      initAuth();
    }, 1000);

    if (isMockMode) return;
    
    // 订阅状态变更也延后挂载
    let subscription: any;
    const subTimer = setTimeout(() => {
      const { data } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
        if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'USER_UPDATED') {
          setHasConfirmedSession(true);
          if (typeof window !== 'undefined') {
            setTimeout(() => {
              import('@/store/useSyncStore').then(({ useSyncStore }) => {
                useSyncStore.getState().triggerSync(`auth_${_event}`);
                useSyncStore.getState().triggerResurrect(`auth_${_event}`);
              });
            }, 50);
          }
        }
        
        if (_event === 'SIGNED_OUT') {
          setHasConfirmedSession(false);
        }

        await hydrateSession(currentSession);
      });
      subscription = data.subscription;
    }, 1000);

    return () => {
      clearTimeout(initTimer);
      clearTimeout(subTimer);
      if (subscription) subscription.unsubscribe();
    };
  }, [initAuth, hydrateSession]);

  const refreshUserData = useCallback(async (overrideSession?: Session | null) => {
    if (isMockMode) return;
    const activeSession = overrideSession ?? session;
    if (!activeSession?.user) {
      setUser(null);
      return;
    }
    
    try {
      const isBoss = activeSession.user.email === ADMIN_EMAIL;
      const userId = activeSession.user.id;

      // 【世界顶端：网络并发引擎】打破瀑布流，一次性并发请求核心身份数据
      const [profileResult, appStatusResult, oldBindingsResult, bossShopsResult] = await Promise.allSettled([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('merchant_applications').select('status').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('shop_bindings').select('shop_id, role, shops(id, name, industry)').eq('user_id', userId).eq('role', 'OWNER'),
        isBoss ? supabase.from('shops').select('id, name, industry').limit(100) : Promise.resolve({ data: null, error: null })
      ]);

      // 核心修复：检查 profileResult 是否因断网失败
      const isProfileFetchFailed = profileResult.status === 'fulfilled' && profileResult.value.error;
      const profile = profileResult.status === 'fulfilled' && !profileResult.value.error ? profileResult.value.data : null;
      
      const appData = appStatusResult.status === 'fulfilled' && !appStatusResult.value.error ? appStatusResult.value.data : null;
      const appStatus: 'idle' | 'pending' | 'approved' | 'rejected' = appData ? (appData.status as 'pending' | 'approved' | 'rejected') : 'idle';
      const oldBindings = oldBindingsResult.status === 'fulfilled' && !oldBindingsResult.value.error ? oldBindingsResult.value.data : null;
      const ownedShops = bossShopsResult.status === 'fulfilled' && !bossShopsResult.value.error ? bossShopsResult.value.data : null;

      if (profile) {
        const { extendedUser, effectiveRole } = await buildExtendedUser(activeSession, profile, appStatus, oldBindings, ownedShops, isBoss);
        
        setUser(extendedUser);
        localStorage.setItem("gx_cached_user", JSON.stringify(extendedUser));
        setActiveRoleState(effectiveRole as UserRole);
      } else if (isProfileFetchFailed) {
        // 【断网防御屏障】
        console.warn("[AuthProvider] Refresh User Data: Network disconnected or fetch failed, preserving existing cache.");
        return;
      } else {
        // 【终极防爆兜底：refreshUserData 同样支持 Metadata 降级提取】
        const fallbackRole = isBoss ? "boss" : "user";
        const fallbackUser = {
          ...activeSession.user,
          gxId: "PENDING",
          role: fallbackRole,
          avatar: activeSession.user.user_metadata?.avatar_url,
          merchant_name: null,
          merchant_avatar_url: null,
          boss_name: null,
          boss_avatar_url: null,
          name: activeSession.user.user_metadata?.name || activeSession.user.user_metadata?.full_name,
          gender: activeSession.user.user_metadata?.gender || "unknown",
          birthday: activeSession.user.user_metadata?.birthday || null,
          bindings: [],
          applicationStatus: 'idle'
        } as SandboxUser;
        setUser(fallbackUser);
        localStorage.setItem("gx_cached_user", JSON.stringify(fallbackUser));
      }
    } catch (error) {
      console.error("[AuthProvider] Refresh User Data Error:", error);
    }
  }, [session, localViewRole]);

  // ==========================================
  // 【世界顶端：全局实时订阅中心】(已重构：接入 GlobalRealtimeEngine)
  // 彻底废除分散的 Channel，仅监听总线发出的 CustomEvent
  // ==========================================
  useEffect(() => {
    if (isMockMode) return;
    if (!user || !user.id) return;
    
    // 监听全局 Auth 数据变动事件
    const handleAuthUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const payload = customEvent.detail;
      
      const profileGxId = 'gxId' in user ? user.gxId : null;
      
      // 物理分拣：如果是自己的档案、绑定或申请变更，立即触发刷新
      if (payload.table === 'profiles' && payload.new?.id === user.id) {
        refreshUserData();
      } else if (payload.table === 'bindings' && payload.new?.principal_id === profileGxId) {
        refreshUserData();
      } else if (payload.table === 'merchant_applications' && payload.new?.user_id === user.id) {
        refreshUserData();
      }
    };

    window.addEventListener('gx_global_auth_update', handleAuthUpdate);

    return () => {
      window.removeEventListener('gx_global_auth_update', handleAuthUpdate);
    };
  }, [user?.id, 'gxId' in (user || {}) ? (user as any).gxId : null, refreshUserData]);

  useEffect(() => {
    if (isMockMode) return;
    if (typeof window === "undefined") return;
    
    const handleGlobalSync = async () => {
      const { data: { session: nextSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        const isNetworkError = sessionError.message?.toLowerCase().includes('fetch') || 
                               sessionError.message?.toLowerCase().includes('network') || 
                               (sessionError as any).status === 0 || 
                               (sessionError as any).status >= 500 || 
                               sessionError.name === 'AuthRetryableFetchError';
                               
        if (!isNetworkError) {
          window.location.reload();
          return;
        } else {
          return; 
        }
      }
      
      await hydrateSession(nextSession);
      await refreshUserData(nextSession);
      if (nextSession?.user) {
        await syncDeviceSession(nextSession);
      }
    };
    
    let isDisposed = false;
    let unsubscribeSync: (() => void) | undefined;

    import('@/store/useSyncStore').then(({ useSyncStore }) => {
      const unsubscribe = useSyncStore.subscribe((state, prevState) => {
        if (state.syncTick > prevState.syncTick) {
          handleGlobalSync();
        }
      });
      if (isDisposed) {
        unsubscribe();
      } else {
        unsubscribeSync = unsubscribe;
      }
    });

    return () => {
      isDisposed = true;
      unsubscribeSync?.();
    };
  }, [hydrateSession, refreshUserData, syncDeviceSession]);

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    setLocalViewRole(role);
    if (typeof window !== "undefined") {
      localStorage.setItem("gx_view_role", role);
      
      // 核心修复：执行内存级的 ID 瞬间跳动，绝不查库
      if (user && (user as SandboxUser).base_gx_id) {
        const sUser = user as SandboxUser;
        const newId = role === 'boss' ? 'GX88888888' :
                      role === 'merchant' ? (sUser.merchant_gx_id || sUser.base_gx_id) :
                      sUser.base_gx_id;
                      
        if (newId && newId !== sUser.gxId) {
          const updatedUser = { ...sUser, gxId: newId };
          setUser(updatedUser);
          localStorage.setItem("gx_cached_user", JSON.stringify(updatedUser));
        }
      }
    }
  };

  const injectMockUser = (user: SandboxUser) => {
    setUser(user);
    localStorage.setItem("gx_cached_user", JSON.stringify(user));
  };

  const handleSignOut = async () => {
    // 彻底清除所有历史遗留的沙盒缓存
    localStorage.removeItem("gx_sandbox_session");
    localStorage.removeItem("gx_active_shop_id"); // 强制销毁店铺缓存
    localStorage.removeItem("gx_cached_user"); // 清理幽灵缓存
    localStorage.removeItem("gx_guest_mode"); // 清理历史遗留
    localStorage.removeItem("gx_view_role"); // 立即物理抹除视图角色
    
    // 内存状态清空
    setUser(null);
    
    if (isMockMode) {
      window.location.href = '/login'; // 无状态重载
      return;
    }

    try {
      const deviceId = getDeviceId();
      if (deviceId) {
        await supabase
          .from('device_sessions')
          .delete()
          .eq('device_id', deviceId);
      }
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      // 物理吃掉 401 错误，绝不影响后续跳转
      console.warn("[AuthProvider] Backend signout rejected (token already dead), ignoring...", err);
    } finally {
      window.location.href = '/login'; // 无状态重载
    }
  };

  const value = {
    user,
    session,
    isLoading,
    isRoleLoaded,
    activeRole,
    signOut: handleSignOut,
    setActiveRole,
    injectMockUser,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth - 身份验证 Hook
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
