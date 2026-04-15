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
  isGuest: boolean;
  isLoading: boolean;
  activeRole: UserRole;
  signOut: () => Promise<void>;
  setGuestMode: () => void;
  setActiveRole: (role: UserRole) => void;
  sandboxLogin: (user?: SandboxUser) => void;
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
  const [isGuest, setIsGuest] = useState(false);
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
      setIsLoading(false);
      return;
    }
    setSession(nextSession);
    if (nextSession?.user) {
      setIsGuest(false);
      localStorage.removeItem("gx_guest_mode");
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', nextSession.user.id)
          .maybeSingle(); // 极致纯净降级：消除找不到数据时抛出的 400 Bad Request 报错

        const { data: bindings } = await supabase
          .from('shop_bindings')
          .select('shop_id, role, shops(id, name, industry)')
          .eq('user_id', nextSession.user.id);
        let shopBindings = mapShopBindings(bindings as ShopBindingRow[] | null);

        const isBoss = nextSession.user.email === ADMIN_EMAIL;
        
        // 【核心升级】：拉取全息申请状态 (消除闪烁与脏读)
        let appStatus: 'idle' | 'pending' | 'approved' | 'rejected' = 'idle';
        try {
          const { data: appData } = await supabase
            .from('merchant_applications')
            .select('status')
            .eq('user_id', nextSession.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (appData) {
            appStatus = appData.status as 'pending' | 'approved' | 'rejected';
          }
        } catch (e) {
          console.error("[AuthProvider] Failed to fetch application status", e);
        }

        // 【核心升级】：如果是 Boss，强制接管并拉取所有名下门店
        if (isBoss) {
          try {
            const { data: ownedShops } = await supabase
              .from('shops')
              .select('id, name, industry')
              // 此处假设未来在数据库层 shops 表会新增 owner_principal_id 等归属字段，
              // 暂时为了保证 0 冲突不报错，Boss 先拉取全部 shops 或特定的 shops。
              // TODO: 在 Supabase 中为 shops 表添加 owner_principal_id 后，加上 .eq('owner_principal_id', nextSession.user.id)
              // 目前暂时拉取所有作为模拟上帝视角
              .limit(100);
              
            if (ownedShops) {
              shopBindings = ownedShops.map(shop => ({
                shopId: shop.id,
                role: 'OWNER',
                shopName: shop.name,
                industry: shop.industry || 'other'
              }));
            }
          } catch (e) {
            console.error("[AuthProvider] Failed to fetch boss shops", e);
          }
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
          if (isBoss) setActiveRoleState("boss");
        }
      } catch (error) {
        console.error("[AuthProvider] Hydrate Error:", error);
        setUser(nextSession.user);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, [localViewRole, syncDeviceSession]);

  const initLock = useRef(false);

  useEffect(() => {
    // 检查本地存储的游客状态
    const guestStatus = localStorage.getItem("gx_guest_mode") === "true";
    if (guestStatus) {
      setIsGuest(true);
    }
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
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn("[AuthProvider] Session Error (e.g. Invalid Refresh Token), clearing session...", sessionError);
          await supabase.auth.signOut(); // 自动清除损坏的 token
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }

        if (initialSession?.user) {
          setHasConfirmedSession(true);
        } else {
          setHasConfirmedSession(false);
        }
        await hydrateSession(initialSession);
      } catch (error) {
        console.error("[AuthProvider] Init Error:", error);
      } finally {
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
      if (_event === 'INITIAL_SESSION') return;
      if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') {
        setHasConfirmedSession(true);
      }
      if (_event === 'SIGNED_OUT') {
        setHasConfirmedSession(false);
      }

      await hydrateSession(currentSession);
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeSession.user.id)
        .maybeSingle(); // 极致纯净降级：消除找不到数据时抛出的 400 Bad Request 报错

      const { data: bindings } = await supabase
        .from('shop_bindings')
        .select('shop_id, role, shops(id, name, industry)')
        .eq('user_id', activeSession.user.id);
      let shopBindings = mapShopBindings(bindings as ShopBindingRow[] | null);

      const isBoss = activeSession.user.email === ADMIN_EMAIL;

      // 【核心升级】：同步刷新全局申请状态
      let appStatus: 'idle' | 'pending' | 'approved' | 'rejected' = 'idle';
      try {
        const { data: appData } = await supabase
          .from('merchant_applications')
          .select('status')
          .eq('user_id', activeSession.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (appData) {
          appStatus = appData.status as 'pending' | 'approved' | 'rejected';
        }
      } catch (e) {
        console.error("[AuthProvider] Failed to refresh application status", e);
      }

      // 【核心升级】：如果是 Boss，强制接管并拉取所有名下门店 (Refresh 逻辑保持同步)
      if (isBoss) {
        try {
          const { data: ownedShops } = await supabase
            .from('shops')
            .select('id, name, industry')
            .limit(100);
            
          if (ownedShops) {
            shopBindings = ownedShops.map(shop => ({
              shopId: shop.id,
              role: 'OWNER',
              shopName: shop.name,
              industry: shop.industry || 'other'
            }));
          }
        } catch (e) {
          console.error("[AuthProvider] Failed to refresh boss shops", e);
        }
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
      }
    } catch (error) {
      console.error("[AuthProvider] Refresh User Data Error:", error);
    }
  }, [session, localViewRole]);

  // 3. 独立监听当前用户的 profiles 表和 shop_bindings 表实时变更 (多端同步)
  useEffect(() => {
    if (isMockMode) return;
    if (!user || !user.id) return;

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
      .channel(`public:shop_bindings:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shop_bindings', filter: `user_id=eq.${user.id}` },
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

    // 监听全局 shops 表的变动 (处理门店名称修改、删除等情况)
    // 注意：如果是普通用户可能没权限监听所有shops，但这里只用来触发刷新，所以不带 filter
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

    return () => {
      supabase.removeChannel(profileSubscription);
      supabase.removeChannel(bindingsSubscription);
      supabase.removeChannel(applicationsSubscription);
      supabase.removeChannel(shopsSubscription);
    };
  }, [user, refreshUserData]); // 仅当 user 变化时重新订阅

  useEffect(() => {
    if (isMockMode) return;
    if (typeof window === "undefined") return;
    const handleVisibility = async () => {
      if (document.visibilityState !== "visible") return;
      const { data: { session: nextSession } } = await supabase.auth.getSession();
      await hydrateSession(nextSession);
      await refreshUserData(nextSession);
      if (nextSession?.user) {
        await syncDeviceSession(nextSession);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [hydrateSession, refreshUserData, syncDeviceSession]);

  const setGuestMode = () => {
    setIsGuest(true);
    localStorage.setItem("gx_guest_mode", "true");
  };

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    setLocalViewRole(role);
    if (typeof window !== "undefined") {
      localStorage.setItem("gx_view_role", role);
    }
  };

  const sandboxLogin = (user?: SandboxUser) => {
    if (user) {
      setUser(user);
    }
    // 已经废弃：不再使用沙盒登录，避免干扰真实状态
    console.warn("sandboxLogin is deprecated. Using real Supabase auth now.");
  };

  const handleSignOut = async () => {
    // 彻底清除所有历史遗留的沙盒缓存
    localStorage.removeItem("gx_sandbox_session");
    localStorage.removeItem("gx_active_shop_id"); // 强制销毁店铺缓存
    
    if (isMockMode) {
      setUser(null);
      setIsGuest(false);
      localStorage.removeItem("gx_guest_mode");
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
    setIsGuest(false);
    localStorage.removeItem("gx_guest_mode");
    localStorage.removeItem("gx_view_role");
    window.location.href = '/login'; // 无状态重载
  };

  const value = {
    user,
    session,
    isGuest,
    isLoading,
    activeRole,
    signOut: handleSignOut,
    setGuestMode,
    setActiveRole,
    sandboxLogin,
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
