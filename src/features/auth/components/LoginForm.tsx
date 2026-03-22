"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { useState } from "react";
import { Chrome, UserCircle } from "lucide-react";
import { cn } from "@/utils/cn";
import { AuthService } from "../api/auth";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from "next/navigation";

/**
 * LoginForm - GX 核心登录组件
 * 采用极致赛博极简风格
 */
export const LoginForm = () => {
  const { setGuestMode } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lang, setLang] = useState<"zh" | "en" | "it">("zh");

  const t: Record<string, any> = {
    zh: {
      title: "GX 身份验证",
      subtitle: "银河体验接入系统",
      emailLabel: "安全标识 (邮箱)",
      passwordLabel: "访问密钥 (密码)",
      submit: "建立连接",
      authenticating: "身份验证中...",
      or: "或",
      google: "使用 Google 账号同步",
      guest: "以游客身份进入 / GUEST ACCESS",
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
    
    try {
      await AuthService.signInWithEmail(email, password);
      router.push("/home");
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || current.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await AuthService.signInWithGoogle();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError(err.message || current.error);
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

      <GlassCard glowColor="cyan" className="p-8 space-y-8 backdrop-blur-2xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <motion.h2 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold tracking-tighter text-gradient-cyan"
          >
            {current.title}
          </motion.h2>
          <p className="text-white/40 text-xs font-mono tracking-widest uppercase">
            {current.subtitle}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input 
            label={current.emailLabel} 
            type="text" 
            placeholder="GX or identity@galaxy.gx"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
          <Input 
            label={current.passwordLabel} 
            type="password" 
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          
          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full h-12 uppercase tracking-[0.2em] text-sm"
              isLoading={isLoading}
            >
              {isLoading ? current.authenticating : current.submit}
            </Button>
          </div>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <span className="relative bg-[#050505] px-4 text-[10px] text-white/20 font-mono uppercase tracking-widest">
            {current.or}
          </span>
        </div>

        {/* OAuth & Guest */}
        <div className="space-y-3">
          <Button 
            variant="ghost" 
            type="button"
            className="w-full h-11 space-x-3 text-xs uppercase tracking-widest"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <Chrome className="w-4 h-4 text-gx-cyan" />
            <span>{current.google}</span>
          </Button>

          <Button 
            variant="ghost" 
            type="button"
            className="w-full h-11 space-x-3 text-xs uppercase tracking-widest border-white/5 hover:border-white/20"
            onClick={handleGuestLogin}
            disabled={isLoading}
          >
            <UserCircle className="w-4 h-4 text-white/40" />
            <span>{current.guest}</span>
          </Button>
        </div>

        {/* Footer Links */}
        <div className="flex justify-between items-center text-[10px] font-mono text-white/20 uppercase tracking-tighter pt-4">
          <button type="button" className="hover:text-gx-cyan transition-colors">{current.reset}</button>
          <span className="opacity-50">|</span>
          <button type="button" className="hover:text-gx-cyan transition-colors">{current.register}</button>
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
