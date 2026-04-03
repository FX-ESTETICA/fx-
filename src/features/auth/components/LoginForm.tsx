"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { useState, useEffect } from "react";
import { UserCircle } from "lucide-react";
import { cn } from "@/utils/cn";
import { AuthService } from "../api/auth";
import { useAuth, SandboxUser } from "../hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { isMockMode } from "@/lib/supabase";

// --- 沙盒 Mock 账号库 ---
const MOCK_ACCOUNTS: Record<string, SandboxUser> = {
  "boss_f@gx.com": { id: "boss_f", gxId: "GX_MCH_0092", email: "boss_f@gx.com", role: "merchant", name: "陈老板 / Mr. Chen", shopId: "shop_f", shopName: "星河美甲沙龙", app_metadata: {}, user_metadata: {}, aud: "", created_at: "" },
  "boss_g@gx.com": { id: "boss_g", gxId: "GX_MCH_0093", email: "boss_g@gx.com", role: "merchant", name: "王老板 / Mr. Wang", shopId: "shop_g", shopName: "赛博按摩馆", app_metadata: {}, user_metadata: {}, aud: "", created_at: "" },
  "user_a@gx.com": { id: "user_a", gxId: "GX_USR_1001", email: "user_a@gx.com", role: "user", name: "林晓明 / Xiao Ming", app_metadata: {}, user_metadata: {}, aud: "", created_at: "" },
  "user_b@gx.com": { id: "user_b", gxId: "GX_USR_1002", email: "user_b@gx.com", role: "user", name: "张伟 / Zhang Wei", app_metadata: {}, user_metadata: {}, aud: "", created_at: "" },
  "user_c@gx.com": { id: "user_c", gxId: "GX_USR_1003", email: "user_c@gx.com", role: "user", name: "李娜 / Li Na", app_metadata: {}, user_metadata: {}, aud: "", created_at: "" },
  "user_d@gx.com": { id: "user_d", gxId: "GX_USR_1004", email: "user_d@gx.com", role: "user", name: "王强 / Wang Qiang", app_metadata: {}, user_metadata: {}, aud: "", created_at: "" },
  "user_e@gx.com": { id: "user_e", gxId: "GX_USR_1005", email: "user_e@gx.com", role: "user", name: "赵敏 / Zhao Min", app_metadata: {}, user_metadata: {}, aud: "", created_at: "" },
};

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "499755740@qq.com";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "";

/**
 * LoginForm - GX 核心登录组件
 * 采用极致赛博极简风格
 */
export const LoginForm = () => {
  const { setGuestMode, sandboxLogin } = useAuth();
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
  const [lang, setLang] = useState<"zh" | "en" | "it">("zh");
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [cooldown, setCooldown] = useState(0);
  const [awaitingOtp, setAwaitingOtp] = useState(false);
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
        router.push(nextParam || "/home");
      } catch {
        setOtpError("验证码错误，请重新输入");
        setOtp("");
        setAwaitingOtp(true);
      } finally {
        setIsLoading(false);
      }
    };
    autoVerify();
  }, [otp, awaitingOtp, mode, email, router, nextParam]);

  const t: Record<"zh" | "en" | "it", {
    title: string;
    subtitle: string;
    emailLabel: string;
    passwordLabel: string;
    submit: string;
    authenticating: string;
    or: string;
    google: string;
    guest: string;
    reset: string;
    register: string;
    security: string;
    error: string;
  }> = {
    zh: {
      title: "GX 身份验证",
      subtitle: "银河体验接入系统",
      emailLabel: "安全标识 (邮箱)",
      passwordLabel: "访问密钥 (密码)",
      submit: "建立连接",
      authenticating: "身份验证中...",
      or: "或",
      google: "使用 Google 账号同步",
      guest: "以游客身份进入",
      reset: "重置密钥",
      register: "初始化新实体",
      security: "加密传输由边缘网络提供 // ID: GX-AUTH-v2.0",
      error: "验证失败：请检查密钥或网络"
    },
    en: {
      title: "GX Authentication",
      subtitle: "Galaxy Experience Access System",
      emailLabel: "Security Identity (Email)",
      passwordLabel: "Access Key (Password)",
      submit: "Establish Connection",
      authenticating: "Authenticating...",
      or: "OR",
      google: "Sync with Google Account",
      guest: "Guest Access",
      reset: "Reset Key",
      register: "Initialize New Entity",
      security: "Encrypted transfer by Edge Network // ID: GX-AUTH-v2.0",
      error: "Auth Failed: Check key or network"
    },
    it: {
      title: "Autenticazione GX",
      subtitle: "Sistema di Accesso Galaxy",
      emailLabel: "Identità di Sicurezza (Email)",
      passwordLabel: "Chiave di Accesso (Password)",
      submit: "Stabilisci Connessione",
      authenticating: "Autenticazione...",
      or: "OPPURE",
      google: "Sincronizza con Google",
      guest: "Accesso Ospite",
      reset: "Resetta Chiave",
      register: "Inizializza Nuova Entità",
      security: "Trasferimento crittografato da Edge Network // ID: GX-AUTH-v2.0",
      error: "Accesso Negato: Controlla chiave o rete"
    }
  };

  const current = t[lang] || t.zh;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      if (isMockMode && email === ADMIN_EMAIL && ADMIN_PASSWORD && password === ADMIN_PASSWORD) {
        sandboxLogin({ id: "gx-admin", gxId: "GX_ADM_ROOT", email: ADMIN_EMAIL, role: "boss", name: "GX Admin", app_metadata: {}, user_metadata: {}, aud: "", created_at: "" });
        router.push(nextParam || "/home");
        return;
      }
      if (isMockMode && password === "123456" && MOCK_ACCOUNTS[email]) {
        sandboxLogin(MOCK_ACCOUNTS[email]);
        router.push(nextParam || "/home");
        return;
      }
      
      // 真实 Supabase 逻辑
      await AuthService.signInWithEmail(email, password);
      router.push(nextParam || "/home");
    } catch {
      setPasswordError("密码错误，请重新输入");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await AuthService.signInWithGoogle(nextParam);
    } catch (err) {
      const message = err instanceof Error ? err.message : current.error;
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
      setMessage("已发送邮箱验证码/链接，请查收邮件并完成登录");
    } catch (err) {
      const message = err instanceof Error ? err.message : current.error;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };


  const handleGuestLogin = () => {
    setGuestMode();
    router.push("/home");
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

      {/* Language Switcher */}
      <div className="absolute -top-12 right-0 flex items-center space-x-4">
        {(["zh", "en", "it"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={cn(
              "text-[10px] font-mono uppercase tracking-widest transition-colors",
              lang === l ? "text-gx-cyan" : "text-white/20 hover:text-white/60"
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <GlassCard glowColor="none" hoverGlow={false} className="p-8 space-y-8 backdrop-blur-xl bg-white/10 border-white/15">
        <div className="text-center">
          <div className="inline-flex items-baseline gap-2 justify-center">
            <span className="text-3xl font-bold tracking-tighter">
              GX<span className="align-super text-xl text-gx-cyan">⁺</span>
            </span>
            <span className="text-2xl font-bold tracking-tighter">私人管家</span>
          </div>
        </div>

        <div className="pt-2">
          <Button 
            variant="ghost"
            glow={false}
            type="button" 
            className="w-full h-12 text-white border-white/15 hover:bg-white/10 focus:ring-2 focus:ring-gx-cyan/50 uppercase tracking-[0.2em] text-sm"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            使用 Google 登录
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input 
            label={"邮箱"} 
            type="email" 
            placeholder="identity@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
          <Input 
            label={mode === "password" ? current.passwordLabel : "验证码"} 
            type={mode === "password" ? "password" : "text"} 
            placeholder={mode === "password" ? "••••••••" : "输入 6 位验证码"}
            value={mode === "password" ? password : otp}
            onChange={(e) => (mode === "password" ? setPassword(e.target.value) : setOtp(e.target.value))}
            required={mode === "password"}
            disabled={isLoading || (mode === "otp" && !awaitingOtp)}
            error={mode === "password" ? passwordError ?? undefined : otpError ?? undefined}
          />
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "otp" ? "password" : "otp")}
              className="text-[10px] font-mono uppercase tracking-widest text-white/30 hover:text-gx-cyan transition-colors"
            >
              {mode === "otp" ? "切换为密码登录" : "切换为获取邮箱验证码"}
            </button>
          </div>
          <div className="pt-2">
            {mode === "otp" ? (
              <Button 
                variant="ghost"
                glow={false}
                type="button"
                onClick={async () => { await handleMagicLink(); setCooldown(60); setAwaitingOtp(true); setOtp(""); }}
                className="w-full h-12 text-white border-white/15 hover:bg-white/10 focus:ring-2 focus:ring-gx-cyan/50 uppercase tracking-[0.2em] text-xs"
                disabled={isLoading || !email || cooldown > 0}
              >
                {cooldown > 0 ? `重新获取（${cooldown}s）` : "获取邮箱验证码"}
              </Button>
            ) : (
              <Button 
                variant="ghost"
                glow={false}
                type="submit" 
                className="w-full h-12 text-white border-white/15 hover:bg-white/10 focus:ring-2 focus:ring-gx-cyan/50 uppercase tracking-[0.2em] text-xs"
                isLoading={isLoading}
              >
                使用密码登录
              </Button>
            )}
          </div>
        </form>

        <div className="relative flex items-center justify-center py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <span className="relative px-4 text-[10px] text-white/20 font-mono uppercase tracking-widest">
            {current.or}
          </span>
        </div>

        <div className="space-y-3">
          <Button 
            variant="ghost" 
            glow={false}
            type="button"
            className="w-full h-12 space-x-3 text-xs uppercase tracking-widest text-white border-white/15 hover:bg-white/10 focus:ring-2 focus:ring-gx-cyan/50"
            onClick={handleGuestLogin}
            disabled={isLoading}
          >
            <UserCircle className="w-4 h-4 text-white/40" />
            <span>{current.guest}</span>
          </Button>
        </div>
      </GlassCard>

      {/* Security Info */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 text-center text-[9px] font-mono text-white/20 uppercase tracking-[0.3em]"
      >
        {current.security}
      </motion.p>
    </motion.div>
  );
};
