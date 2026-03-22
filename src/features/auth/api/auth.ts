import { supabase, isMockMode } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";

/**
 * AuthService - GX 身份验证服务层
 * 封装 Supabase Auth 逻辑，支持邮箱/密码及 Google OAuth
 * [UI-First Sandbox Protocol]
 */
export const AuthService = {
  /**
   * 邮箱/密码登录
   */
  async signInWithEmail(email: string, password: string) {
    if (isMockMode) {
      console.log("[GX-SANDBOX] Mocking signInWithEmail...");
      
      // 特权账户捕获: GX / GX
      if (email === "GX" && password === "GX") {
        return { 
          user: { 
            id: "boss-id", 
            email: "boss@galaxy.gx",
            user_metadata: { role: "boss", name: "GUANGXU ZHANG" }
          }, 
          session: null 
        };
      }

      return { user: { id: "mock-user-id", email }, session: null };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  /**
   * 注册新用户
   */
  async signUpWithEmail(email: string, password: string) {
    if (isMockMode) {
      console.log("[GX-SANDBOX] Mocking signUpWithEmail...");
      return { user: { id: "mock-user-id", email }, session: null };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Google OAuth 登录
   */
  async signInWithGoogle() {
    if (isMockMode) {
      console.log("[GX-SANDBOX] Mocking signInWithGoogle...");
      return { data: { url: "#" } };
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    });
    if (error) throw error;
    return data;
  },

  /**
   * 退出登录
   */
  async signOut() {
    if (isMockMode) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * 获取当前会话
   */
  async getSession() {
    if (isMockMode) return null;
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  /**
   * 监听 Auth 状态变更
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    if (isMockMode) {
      return { unsubscribe: () => {} };
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
  }
};
