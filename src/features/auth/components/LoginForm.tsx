"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { useState, useEffect } from "react";
import { UserCircle } from "lucide-react";
import { AuthService } from "../api/auth";
import { useAuth, SandboxUser } from "../hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { isMockMode } from "@/lib/supabase";
import { useTranslations } from "next-intl";

// --- 沙盒 Mock 账号库 ---
const MOCK_ACCOUNTS: Record<string, SandboxUser> = {
  "boss_f@gx.com": { id: "boss_f", gxId: "GX_MCH_0092", email: "boss_f@gx.com", role: "merchant", name: "陈老板", shopId: "shop_f", shopName: "星河美甲沙龙", app_metadata: {}, user_metadata: {}, aud: "", created_at: "" },
  "boss_g@gx.com": { id: "boss_g", gxId: "GX_MCH_0093", email: "boss_g@gx.com", role: "merchant", name: "王老板", shopId: "shop_g", shopName: "赛博按摩馆", app_metadata: {}, user_metadata: {}, aud: "", created_at: "" },
  "user_a@gx.com": { id: "user_a", gxId: "GX_USR_1001", email: "user_a@gx.com", role: "user", name: "林晓明", app_metadata: {}, user_metadata: {}, aud: "", created_at: "" },
  "user_b@gx.com": { id: "user_b", gxId: "GX_USR_1002", email: "user_b@gx.com", role: "user", name: "张伟", app_metadata: {}, user_metadata: {}, aud: "", created_at: "" },
  "user_c@gx.com": { id: "user_c", gxId: "GX_USR_1003", email: "user_c@gx.com", role: "user", name: "李娜", app_metadata: {}, user_metadata: {}, aud: "", created_at: "" },
  "user_d@gx.com": { id: "user_d", gxId: "GX_USR_1004", email: "user_d@gx.com", role: "user", name: "王强", app_metadata: {}, user_metadata: {}, aud: "", created_at: "" },
  "user_e@gx.com": { id: "user_e", gxId: "GX_USR_1005", email: "user_e@gx.com", role: "user", name: "赵敏", app_metadata: {}, user_metadata: {}, aud: "", created_at: "" },
};

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "499755740@qq.com";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "";

/**
 * LoginForm - GX 核心登录组件
 * 采用极致赛博极简风格
 */
export const LoginForm = () => {
  const { injectMockUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") || undefined;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [cooldown, setCooldown] = useState(0);
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [isGoogleAvailable, setIsGoogleAvailable] = useState(true);
  const t = useTranslations("Auth");

  useEffect(() => {
    // 动态环境探测 (Dynamic Environment Radar)
    try {
      const isChinaTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Shanghai';
      const isChineseLanguage = navigator.language.includes('zh');
      // 如果是纯国内物理环境（时区+语言双重命中），无痕隐藏 Google 登录
      if (isChinaTimezone && isChineseLanguage) {
        setIsGoogleAvailable(false);
      }
    } catch (e) {
      console.warn("Environment radar scan failed", e);
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  useEffect(() => {
    const autoVerify = async () => {
      if (mode !== "otp" || !awaitingOtp) return;
      if (otp.length !== 6) return;
      setIsLoading(true);
      setError(null);
      setMessage(null);
      try {
        await AuthService.verifyEmailOtp(email, otp);
        router.replace(nextParam || "/home");
      } catch {
        setOtpError(t("otpError"));
        setOtp("");
        setAwaitingOtp(true);
      } finally {
        setIsLoading(false);
      }
    };
    autoVerify();
  }, [otp, awaitingOtp, mode, email, router, nextParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      if (isMockMode && email === ADMIN_EMAIL && ADMIN_PASSWORD && password === ADMIN_PASSWORD) {
        injectMockUser({ id: "gx-admin", gxId: "GX_ADM_ROOT", email: ADMIN_EMAIL, role: "boss", name: "GX Admin", app_metadata: {}, user_metadata: {}, aud: "", created_at: "" });
        router.replace(nextParam || "/home");
        return;
      }
      if (isMockMode && password === "123456" && MOCK_ACCOUNTS[email]) {
        injectMockUser(MOCK_ACCOUNTS[email]);
        router.replace(nextParam || "/home");
        return;
      }
      
      // 真实 Supabase 逻辑
      await AuthService.signInWithEmail(email, password);
      router.replace(nextParam || "/home");
    } catch {
      setPasswordError(t("passwordError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await AuthService.signInWithGoogle(nextParam);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("error");
      setError(message);
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      await AuthService.signInWithMagicLink(email, nextParam);
      setMessage(t("magicLinkSuccess"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("error");
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };


  const handleGuestLogin = () => {
    setGuestMode();
    router.replace("/home");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full max-w-md mx-auto relative"
    >
      {/* 错误提示 */}
      {error && (
        <div className="absolute -top-20 left-0 right-0 animate-in fade-in slide-in-from-top-4">
          <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-xl p-4 rounded-xl text-red-500 text-[10px] font-mono uppercase tracking-widest text-center">
            {error}
          </div>
        </div>
      )}
      {!error && message && (
        <div className="absolute -top-20 left-0 right-0 animate-in fade-in slide-in-from-top-4">
          <div className="bg-gx-cyan/10 border border-gx-cyan/20 backdrop-blur-xl p-4 rounded-xl text-gx-cyan text-[10px] font-mono uppercase tracking-widest text-center">
            {message}
          </div>
        </div>
      )}

      {/* Language Switcher 已经被移除，由 layout 或外部控制 */}

      <div className="w-full space-y-8">
        {isGoogleAvailable && (
          <div className="pt-2">
            <Button 
              variant="ghost"
              glow={false}
              type="button" 
              className="w-full h-12 text-white border border-white/20 hover:bg-white/5 focus:ring-2 focus:ring-gx-cyan/50 uppercase tracking-[0.2em] text-sm bg-transparent"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              {t("google")}
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            label={t("emailLabel")} 
            type="email" 
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            variant="ghost"
          />
          <Input 
            label={mode === "password" ? t("passwordLabel") : t("otpLabel")} 
            type={mode === "password" ? "password" : "text"} 
            placeholder={mode === "password" ? t("passwordPlaceholder") : t("otpPlaceholder")}
            value={mode === "password" ? password : otp}
            onChange={(e) => (mode === "password" ? setPassword(e.target.value) : setOtp(e.target.value))}
            required={mode === "password"}
            disabled={isLoading || (mode === "otp" && !awaitingOtp)}
            error={mode === "password" ? passwordError ?? undefined : otpError ?? undefined}
            variant="ghost"
          />
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "otp" ? "password" : "otp")}
              className="text-[10px] font-mono uppercase tracking-widest text-white/30 hover:text-gx-cyan transition-colors"
            >
              {mode === "otp" ? t("switchToPassword") : t("switchToOtp")}
            </button>
          </div>
          <div className="pt-4">
            {mode === "otp" ? (
              <Button 
                variant="ghost"
                glow={false}
                type="button"
                onClick={async () => { await handleMagicLink(); setCooldown(60); setAwaitingOtp(true); setOtp(""); }}
                className="w-full h-12 text-white border border-white/20 hover:bg-white/5 focus:ring-2 focus:ring-gx-cyan/50 uppercase tracking-[0.2em] text-xs bg-transparent"
                disabled={isLoading || !email || cooldown > 0}
              >
                {cooldown > 0 ? t("resendOtp", { seconds: cooldown }) : t("getOtp")}
              </Button>
            ) : (
              <Button 
                variant="ghost"
                glow={false}
                type="submit" 
                className="w-full h-12 text-white border border-white/20 hover:bg-white/5 focus:ring-2 focus:ring-gx-cyan/50 uppercase tracking-[0.2em] text-xs bg-transparent"
                isLoading={isLoading}
              >
                {t("loginWithPassword")}
              </Button>
            )}
          </div>
        </form>

        <div className="relative flex items-center justify-center py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <span className="relative px-4 text-[10px] text-white/40 font-mono uppercase tracking-widest backdrop-blur-md rounded-full">
            {t("or")}
          </span>
        </div>

        <div className="space-y-3">
          <Button 
            variant="ghost" 
            glow={false}
            type="button"
            className="w-full h-12 space-x-3 text-xs uppercase tracking-widest text-white border border-white/20 hover:bg-white/5 focus:ring-2 focus:ring-gx-cyan/50 bg-transparent"
            onClick={handleGuestLogin}
            disabled={isLoading}
          >
            <UserCircle className="w-4 h-4 text-white/40" />
            <span>{t("guest")}</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
