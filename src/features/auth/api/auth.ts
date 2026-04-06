import { supabase, isMockMode } from '@/lib/supabase';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Session } from "@supabase/supabase-js";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "499755740@qq.com";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "";

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
      if (email === ADMIN_EMAIL && ADMIN_PASSWORD && password === ADMIN_PASSWORD) {
        return {
          user: {
            id: "gx-admin",
            email: ADMIN_EMAIL,
            user_metadata: { role: "boss" }
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
   * Google OAuth 登录 (双轨制：Native App 与 Web 浏览器自动适配)
   */
  async signInWithGoogle(next?: string) {
    if (isMockMode) {
      console.log("[GX-SANDBOX] Mocking signInWithGoogle...");
      return { data: { url: "#" } };
    }

    // --- 轨道一：原生 App 登录 (避免外部浏览器回调死锁) ---
    if (Capacitor.isNativePlatform()) {
      try {
        console.log("[Native Auth] Initiating native Google Sign-In...");
        // 唤起原生底层谷歌账户选择面板
        const googleUser = await GoogleAuth.signIn();
        
        // 拿到原生令牌后，直接与 Supabase 后端交换 Session，完全不离开 App
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: googleUser.authentication.idToken,
        });
        
        if (error) throw error;
        
        // 原生模式下不需要回调重定向，直接手动触发跳转
        window.location.href = next || "/home";
        return data;
      } catch (error) {
        console.error("[Native Auth] Google Sign-In failed:", error);
        throw error;
      }
    }

    // --- 轨道二：普通 Web 浏览器登录 (保留原本重定向逻辑) ---
    const nextParam = next || (() => {
      try {
        const url = new URL(window.location.href);
        return url.searchParams.get('next') || undefined;
      } catch {
        return undefined;
      }
    })();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ""}`,
      }
    });
    if (error) throw error;
    return data;
  },

  /**
   * 邮件验证码 / Magic Link 登录
   */
  async signInWithMagicLink(email: string, next?: string) {
    if (isMockMode) {
      console.log("[GX-SANDBOX] Mocking signInWithMagicLink...");
      return { data: { user: { email } } };
    }
    const nextParam = next || (() => {
      try {
        const url = new URL(window.location.href);
        return url.searchParams.get('next') || undefined;
      } catch {
        return undefined;
      }
    })();
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ""}`,
      },
    });
    if (error) throw error;
    return data;
  },

  /**
   * 验证邮箱一次性验证码
   */
  async verifyEmailOtp(email: string, token: string) {
    if (isMockMode) {
      console.log("[GX-SANDBOX] Mocking verifyEmailOtp...");
      return { user: { id: "mock-user-id", email } };
    }
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
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
