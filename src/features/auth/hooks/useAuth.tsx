"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { AuthService } from "../api/auth";

export type UserRole = "user" | "merchant" | "boss";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isGuest: boolean;
  isLoading: boolean;
  activeRole: UserRole;
  signOut: () => Promise<void>;
  setGuestMode: () => void;
  setActiveRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - 全局身份验证上下文提供者
 * 实现用户 Session 的物理挂载与状态同步
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
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

    // 检查会话存储的角色状态 (为原路返回做铺垫)
    const savedRole = sessionStorage.getItem("gx_active_role") as UserRole;
    if (savedRole && ["user", "merchant", "boss"].includes(savedRole)) {
      setActiveRoleState(savedRole);
    }

    // 1. 获取初始 Session
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

    // 2. 订阅状态变更 (Nexus 4.0 实时对齐)
    const subscription = AuthService.onAuthStateChange((_event, currentSession) => {
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

  const handleSignOut = async () => {
    await AuthService.signOut();
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
