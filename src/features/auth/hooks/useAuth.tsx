"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { AuthService } from "../api/auth";

export type UserRole = "user" | "merchant" | "boss";

// --- 沙盒扩展：Mock 用户数据结构 ---
export interface SandboxUser extends User {
  gxId: string;
  name: string;
  role: UserRole;
  shopId?: string;
  shopName?: string;
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

    // 检查沙盒模式账号
    const sandboxSession = localStorage.getItem("gx_sandbox_session");
    if (sandboxSession) {
      try {
        const mockUser = JSON.parse(sandboxSession);
        setUser(mockUser);
        setActiveRoleState(mockUser.role);
        setIsLoading(false);
        return; // 沙盒模式下拦截真实 Supabase 初始化
      } catch (e) {
        console.error("Sandbox session error", e);
      }
    }

    // 1. 获取初始 Session (Supabase 真实环境)
    const initAuth = async () => {
      try {
        const initialSession = await AuthService.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          setIsGuest(false);
          localStorage.removeItem("gx_guest_mode");
        }
      } catch (error) {
        console.error("[AuthProvider] Init Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // 2. 订阅状态变更
    const subscription = AuthService.onAuthStateChange((_event, currentSession) => {
      if (localStorage.getItem("gx_sandbox_session")) return; // 沙盒模式忽略变更
      console.log("[AuthProvider] Auth State Changed:", _event);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        setIsGuest(false);
        localStorage.removeItem("gx_guest_mode");
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const setGuestMode = () => {
    setIsGuest(true);
    localStorage.setItem("gx_guest_mode", "true");
  };

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    sessionStorage.setItem("gx_active_role", role);
  };

  const sandboxLogin = (mockUser: SandboxUser) => {
    setUser(mockUser);
    setActiveRoleState(mockUser.role);
    localStorage.setItem("gx_sandbox_session", JSON.stringify(mockUser));
  };

  const handleSignOut = async () => {
    const isSandbox = !!localStorage.getItem("gx_sandbox_session");
    if (isSandbox) {
      localStorage.removeItem("gx_sandbox_session");
      setUser(null);
    } else {
      await AuthService.signOut();
    }
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
