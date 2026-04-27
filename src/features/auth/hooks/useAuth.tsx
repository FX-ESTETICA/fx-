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
  const [user, setUser] = useState<SandboxUser | User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [activeRole, setActiveRoleState] = useState<UserRole>("user");
  const [isLoading, setIsLoading] = useState(true);
  const [hasConfirmedSession, setHasConfirmedSession] = useState(false);
  const [localViewRole, setLocalViewRole] = useState<UserRole | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("gx_view_role");
    if (stored === "user" || stored === "merchant" || stored === "boss") return stored;
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
    
    // 仅记录设备在线状态（Upsert），不再执行任何的 window_id 检查或互踢逻辑 (Option A)
    const { error } = await supabase
      .from('device_sessions')
      .upsert({ 
        device_id: deviceId, 
        user_id: currentSession.user.id, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'device_id,user_id' });

    if (error) {
      console.error("[AuthProvider] Device session upsert error:", error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getDeviceId, hasConfirmedSession]);

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

        const profile = profileResult.status === 'fulfilled' ? profileResult.value.data : null;
        const appData = appStatusResult.status === 'fulfilled' ? appStatusResult.value.data : null;
        let appStatus: 'idle' | 'pending' | 'approved' | 'rejected' = appData ? (appData.status as 'pending' | 'approved' | 'rejected') : 'idle';
        const oldBindings = oldBindingsResult.status === 'fulfilled' ? oldBindingsResult.value.data : null;
        const ownedShops = bossShopsResult.status === 'fulfilled' ? bossShopsResult.value.data : null;

        let shopBindings = mapShopBindings(oldBindings as ShopBindingRow[] | null);

        // 如果存在 profile.gx_id，才去拉取最新的 bindings
        if (profile?.gx_id) {
          const { data: newBindings } = await supabase
            .from('bindings')
            .select('shop_id, role, shops(id, name, industry)')
            .eq('principal_id', profile.gx_id);
          
          if (newBindings && newBindings.length > 0) {
            shopBindings = mapShopBindings(newBindings as ShopBindingRow[]);
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

        if (profile) {
          const isMerchant = shopBindings && shopBindings.some(b => b.role === 'OWNER');
          const actualRole = isBoss ? "boss" : (isMerchant ? "merchant" : profile.role);
          const actualName = profile.name || nextSession.user.user_metadata?.name || nextSession.user.user_metadata?.full_name;
          const actualAvatar = profile.avatar_url || nextSession.user.user_metadata?.avatar_url;
          const actualId = isBoss ? "GX88888888" : profile.gx_id;
          const allowedRoles = actualRole === "boss" ? ["user", "merchant", "boss"] : actualRole === "merchant" ? ["user", "merchant"] : ["user"];
          const effectiveRole = localViewRole && allowedRoles.includes(localViewRole) ? localViewRole : actualRole;

          const extendedUser = {
          ...nextSession.user,
          gxId: actualId,
          role: actualRole,
          avatar: actualAvatar,
          phone: profile.phone,
          name: actualName,
          gender: profile.gender || nextSession.user.user_metadata?.gender || "unknown",
          birthday: profile.birthday || nextSession.user.user_metadata?.birthday || null,
          bindings: shopBindings,
          applicationStatus: appStatus
        } as SandboxUser; 
        
        setUser(extendedUser);
        // 【Local-First 缓存锚点】：物理固化身份到本地，供下次秒开使用
        localStorage.setItem("gx_cached_user", JSON.stringify(extendedUser));
        
        setActiveRoleState(effectiveRole as UserRole);
        await syncDeviceSession(nextSession);
        } else {
          // 【终极防爆兜底】：如果底层 profile 触发器失效导致记录为空，从 Metadata 提取降级档案
          const fallbackRole = isBoss ? "boss" : "user";
          const fallbackUser = {
          ...nextSession.user,
          gxId: "PENDING",
          role: fallbackRole,
          avatar: nextSession.user.user_metadata?.avatar_url,
          name: nextSession.user.user_metadata?.name || nextSession.user.user_metadata?.full_name,
          gender: nextSession.user.user_metadata?.gender || "unknown",
          birthday: nextSession.user.user_metadata?.birthday || null,
          bindings: [],
          applicationStatus: 'idle'
        } as SandboxUser;
        
        setUser(fallbackUser);
        localStorage.setItem("gx_cached_user", JSON.stringify(fallbackUser));
        
        if (isBoss) setActiveRoleState("boss");
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
          name: nextSession.user.user_metadata?.name || nextSession.user.user_metadata?.full_name,
          gender: nextSession.user.user_metadata?.gender || "unknown",
          birthday: nextSession.user.user_metadata?.birthday || null,
          bindings: [],
          applicationStatus: 'idle'
        } as SandboxUser;
        
        // 核心修复：绝对禁止在这里覆写 localStorage！仅在内存中兜底，保护用户原有的高保真离线缓存。
        setUser(fallbackUser);
      }
    } else {
      setUser(null);
      localStorage.removeItem("gx_cached_user");
    }
  }, [localViewRole, syncDeviceSession]);

  const initLock = useRef(false);

  useEffect(() => {
    // 兼容历史版本残留，直接清除
    localStorage.removeItem("gx_guest_mode");
  }, []);

  useEffect(() => {
    if (initLock.current) return;
    initLock.current = true; // 【完美修复法则】: 同步阶段立即上锁，彻底粉碎 React 18 Strict Mode 下的并发挂载请求风暴

    // 1. 获取初始 Session (Supabase 真实环境)
    const initAuth = async () => {
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
          console.warn("[AuthProvider] Session Error (e.g. Invalid Refresh Token), clearing session...", sessionError);
          await supabase.auth.signOut(); // 自动清除损坏的 token
          setSession(null);
          setUser(null);
          localStorage.removeItem("gx_cached_user"); // 清除脏缓存
          setIsLoading(false);
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
        console.error("[AuthProvider] Init Error:", error);
      } finally {
        // 兜底解锁
        setIsLoading(false);
      }
    };

    initAuth();

    if (isMockMode) return;
    // 2. 订阅状态变更
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      console.log("[AuthProvider] Auth State Changed:", _event);
      
      // 【防重排风暴】: 拦截 INITIAL_SESSION，因为它与上方的 initAuth 完全重叠，
      // 会导致两次并发的 profiles 和 shop_bindings 网络请求，从而引发 React 剧烈重排卡顿。
      if (_event === 'INITIAL_SESSION') {
        // 【完美修复法则】：绝对禁止在这里提前释放锁，彻底粉碎并发挂载导致被踢回 login 的幽灵 Bug。
        // 锁的释放必须且只能由上方的 initAuth 的 finally 块来执行！
        return;
      }
      
      // 世界顶端：剥夺 TOKEN_REFRESHED 和 USER_UPDATED 的全局 Loading 锁权限，仅在初始登入时允许骨架屏
      if (_event === 'SIGNED_IN') {
        setIsLoading(true);
        setHasConfirmedSession(true);
      } else if (_event === 'TOKEN_REFRESHED' || _event === 'USER_UPDATED') {
        setHasConfirmedSession(true);
      }
      
      if (_event === 'SIGNED_OUT') {
        setHasConfirmedSession(false);
      }

      await hydrateSession(currentSession);
      
      // 【关键修复】：不仅在 SIGNED_IN 释放，任何改变状态的事件完成后，都必须确保锁是开的，防止死锁
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [hydrateSession]);

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

      const profile = profileResult.status === 'fulfilled' ? profileResult.value.data : null;
      const appData = appStatusResult.status === 'fulfilled' ? appStatusResult.value.data : null;
      let appStatus: 'idle' | 'pending' | 'approved' | 'rejected' = appData ? (appData.status as 'pending' | 'approved' | 'rejected') : 'idle';
      const oldBindings = oldBindingsResult.status === 'fulfilled' ? oldBindingsResult.value.data : null;
      const ownedShops = bossShopsResult.status === 'fulfilled' ? bossShopsResult.value.data : null;

      let shopBindings = mapShopBindings(oldBindings as ShopBindingRow[] | null);

      // 如果存在 profile.gx_id，才去拉取最新的 bindings
      if (profile?.gx_id) {
        const { data: newBindings } = await supabase
          .from('bindings')
          .select('shop_id, role, shops(id, name, industry)')
          .eq('principal_id', profile.gx_id);
        
        if (newBindings && newBindings.length > 0) {
          shopBindings = mapShopBindings(newBindings as ShopBindingRow[]);
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

      if (profile) {
        const isMerchant = shopBindings && shopBindings.some(b => b.role === 'OWNER');
        const actualRole = isBoss ? "boss" : (isMerchant ? "merchant" : profile.role);
        const actualName = profile.name || activeSession.user.user_metadata?.name || activeSession.user.user_metadata?.full_name;
        const actualAvatar = profile.avatar_url || activeSession.user.user_metadata?.avatar_url;
        const actualId = isBoss ? "GX88888888" : profile.gx_id;
        const allowedRoles = actualRole === "boss" ? ["user", "merchant", "boss"] : actualRole === "merchant" ? ["user", "merchant"] : ["user"];
        const effectiveRole = localViewRole && allowedRoles.includes(localViewRole) ? localViewRole : actualRole;

        const extendedUser = {
          ...activeSession.user,
          gxId: actualId,
          role: actualRole,
          avatar: actualAvatar,
          phone: profile.phone,
          name: actualName,
          gender: profile.gender || activeSession.user.user_metadata?.gender || "unknown",
          birthday: profile.birthday || activeSession.user.user_metadata?.birthday || null,
          bindings: shopBindings,
          applicationStatus: appStatus
        } as SandboxUser;
        
        setUser(extendedUser);
        localStorage.setItem("gx_cached_user", JSON.stringify(extendedUser));
        setActiveRoleState(effectiveRole as UserRole);
      } else {
        // 【终极防爆兜底：refreshUserData 同样支持 Metadata 降级提取】
        const fallbackRole = isBoss ? "boss" : "user";
        const fallbackUser = {
          ...activeSession.user,
          gxId: "PENDING",
          role: fallbackRole,
          avatar: activeSession.user.user_metadata?.avatar_url,
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

  // 3. 独立监听当前用户的 profiles 表和 shop_bindings 表实时变更 (多端同步)
  useEffect(() => {
    if (isMockMode) return;
    if (!user || !user.id) return;
    
    // 我们需要用户的 gxId 来订阅 bindings 表的变动
    const profileGxId = 'gxId' in user ? user.gxId : null;

    const profileSubscription = supabase
      .channel(`public:profiles:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        async (payload) => {
          console.log("[AuthProvider] Profile realtime update received:", payload);
          await refreshUserData();
        }
      )
      .subscribe();

    const bindingsSubscription = supabase
      .channel(`public:bindings:${profileGxId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bindings', filter: `principal_id=eq.${profileGxId}` },
        async (payload) => {
          console.log("[AuthProvider] Bindings realtime update received:", payload);
          await refreshUserData();
        }
      )
      .subscribe();
      
    // 监听商户申请状态变更 (实现秒级入驻闭环)
    const applicationsSubscription = supabase
      .channel(`public:merchant_applications:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'merchant_applications', filter: `user_id=eq.${user.id}` },
        async (payload) => {
          console.log("[AuthProvider] Application realtime update received:", payload);
          await refreshUserData();
        }
      )
      .subscribe();

    // 修复：取消全局无 filter 的 shops 监听，因为配置更新会导致死循环
    // 只有在真的需要时（比如新建了店）才手动触发刷新
    /*
    const shopsSubscription = supabase
      .channel('public:shops:global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shops' },
        async (payload) => {
          console.log("[AuthProvider] Shops global realtime update received:", payload);
          // 当任何 shop 发生变化时（特别是被删除或重命名时），重新拉取数据
          await refreshUserData();
        }
      )
      .subscribe();
    */

    return () => {
      supabase.removeChannel(profileSubscription);
      supabase.removeChannel(bindingsSubscription);
      supabase.removeChannel(applicationsSubscription);
      // supabase.removeChannel(shopsSubscription);
    };
  }, [user, refreshUserData]); // 仅当 user 变化时重新订阅

  useEffect(() => {
    if (isMockMode) return;
    if (typeof window === "undefined") return;
    const handleVisibility = async () => {
      if (document.visibilityState !== "visible") return;
      
      // 世界顶端 0 妥协法则：静默唤醒 (Silent Hydration)
      // 绝不触发 setIsLoading(true) 摧毁当前 DOM，而是像幽灵一样在后台静默获取最新数据，
      // 获取后通过 React 响应式精准替换脏数据，让前台画面纹丝不动。
      const { data: { session: nextSession } } = await supabase.auth.getSession();
      await hydrateSession(nextSession);
      await refreshUserData(nextSession);
      if (nextSession?.user) {
        await syncDeviceSession(nextSession);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const intervalId = window.setInterval(async () => {
      // 后台静默刷新，不阻塞 UI
      const { data: { session: nextSession } } = await supabase.auth.getSession();
      await hydrateSession(nextSession);
      if (nextSession?.user) {
        await syncDeviceSession(nextSession);
      }
    }, 30000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(intervalId);
    };
  }, [hydrateSession, refreshUserData, syncDeviceSession]);

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    setLocalViewRole(role);
    if (typeof window !== "undefined") {
      localStorage.setItem("gx_view_role", role);
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
    
    if (isMockMode) {
      setUser(null);
      localStorage.removeItem("gx_view_role");
      window.location.href = '/login'; // 无状态重载
      return;
    }
    const deviceId = getDeviceId();
    if (deviceId) {
      await supabase
        .from('device_sessions')
        .delete()
        .eq('device_id', deviceId);
    }
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem("gx_view_role");
    window.location.href = '/login'; // 无状态重载
  };

  const value = {
    user,
    session,
    isLoading,
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
