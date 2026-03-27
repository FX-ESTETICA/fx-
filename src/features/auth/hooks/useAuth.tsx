"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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
}

interface AuthContextType {
  user: SandboxUser | User | null;
  session: Session | null;
  isGuest: boolean;
  isLoading: boolean;
  activeRole: UserRole;
  signOut: () => Promise<void>;
  setGuestMode: () => void;
  setActiveRole: (role: UserRole) => void;
  sandboxLogin: (mockUser: SandboxUser) => void;
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

  useEffect(() => {
    // 检查本地存储的游客状态
    const guestStatus = localStorage.getItem("gx_guest_mode") === "true";
    if (guestStatus) {
      setIsGuest(true);
    }

    // 检查会话存储的角色状态
    const savedRole = sessionStorage.getItem("gx_active_role") as UserRole;
    if (savedRole && ["user", "merchant", "boss"].includes(savedRole)) {
      setActiveRoleState(savedRole);
    }

    // 1. 获取初始 Session (Supabase 真实环境)
    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn("[AuthProvider] Session Error (e.g. Invalid Refresh Token), clearing session...", sessionError);
          await supabase.auth.signOut(); // 自动清除损坏的 token
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }

        setSession(initialSession);
        
        if (initialSession?.user) {
          setIsGuest(false);
          localStorage.removeItem("gx_guest_mode");
          
          // 从 public.profiles 表中读取扩展信息 (gx_id, role, avatar, phone)
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', initialSession.user.id)
            .single();

          if (profile) {
            // 权限与信息兜底法则 (Admin Immunity & Metadata Fallback)
            const isBoss = initialSession.user.email === ADMIN_EMAIL;
            const actualRole = isBoss ? "boss" : profile.role;
            const actualName = profile.name || initialSession.user.user_metadata?.full_name;
            const actualAvatar = profile.avatar_url || initialSession.user.user_metadata?.avatar_url;
            const actualId = isBoss ? "GX88888888" : profile.gx_id;

            const extendedUser = {
              ...initialSession.user,
              gxId: actualId,
              role: actualRole,
              avatar: actualAvatar,
              phone: profile.phone,
              name: actualName
            } as SandboxUser;
            
            setUser(extendedUser);
            setActiveRoleState(actualRole as UserRole);
          } else {
            // Fallback 
            setUser(initialSession.user);
            if (initialSession.user.email === ADMIN_EMAIL) {
              setActiveRoleState("boss");
            }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("[AuthProvider] Init Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // 2. 订阅状态变更
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      console.log("[AuthProvider] Auth State Changed:", _event);
      setSession(currentSession);
      
      if (currentSession?.user) {
        setIsGuest(false);
        localStorage.removeItem("gx_guest_mode");
        
        // 同样从 profiles 表中拉取数据
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

          if (profile) {
            // 权限与信息兜底法则 (Admin Immunity & Metadata Fallback)
            const isBoss = currentSession.user.email === ADMIN_EMAIL;
            const actualRole = isBoss ? "boss" : profile.role;
            const actualName = profile.name || currentSession.user.user_metadata?.full_name;
            const actualAvatar = profile.avatar_url || currentSession.user.user_metadata?.avatar_url;
            const actualId = isBoss ? "GX88888888" : profile.gx_id;

            const extendedUser = {
              ...currentSession.user,
              gxId: actualId,
              role: actualRole,
              avatar: actualAvatar,
              phone: profile.phone,
              name: actualName
            } as SandboxUser;
            
            setUser(extendedUser);
            setActiveRoleState(actualRole as UserRole);
          } else {
            setUser(currentSession.user);
            if (currentSession.user.email === ADMIN_EMAIL) {
              setActiveRoleState("boss");
            }
          }
        } catch (e) {
          console.error("Fetch profile on auth change error", e);
          setUser(currentSession.user);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 3. 独立监听当前用户的 profiles 表实时变更 (多端同步)
  useEffect(() => {
    if (!user || !user.id) return;

    console.log(`[AuthProvider] Subscribing to profiles realtime for user: ${user.id}`);
    
    const profileChannel = supabase
      .channel(`public:profiles:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('[AuthProvider] Profile Realtime Update Received:', payload);
          const updatedProfile = payload.new;
          
          setUser(prev => {
            if (!prev) return prev;
            
            // 实时同步时同样保持特权兜底
            const isBoss = prev.email === ADMIN_EMAIL;
            const actualRole = isBoss ? "boss" : (updatedProfile.role || ('role' in prev ? prev.role : 'user'));
            const actualId = isBoss ? "GX88888888" : (updatedProfile.gx_id || ('gxId' in prev ? prev.gxId : ''));

            return {
              ...prev,
              gxId: actualId,
              role: actualRole,
              avatar: updatedProfile.avatar_url || ('avatar' in prev ? prev.avatar : ''),
              phone: updatedProfile.phone || ('phone' in prev ? prev.phone : ''),
              name: updatedProfile.name || ('name' in prev ? prev.name : '')
            } as SandboxUser;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id]); // 仅当 user.id 变化时重新订阅

  const setGuestMode = () => {
    setIsGuest(true);
    localStorage.setItem("gx_guest_mode", "true");
  };

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    sessionStorage.setItem("gx_active_role", role);
  };

  const sandboxLogin = (_mockUser: SandboxUser) => {
    // 已经废弃：不再使用沙盒登录，避免干扰真实状态
    console.warn("sandboxLogin is deprecated. Using real Supabase auth now.");
  };

  const handleSignOut = async () => {
    // 彻底清除所有历史遗留的沙盒缓存
    localStorage.removeItem("gx_sandbox_session");
    
    await supabase.auth.signOut();
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem("gx_guest_mode");
    sessionStorage.removeItem("gx_active_role");
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
    sandboxLogin
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
