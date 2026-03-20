"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { useState } from "react";
import { Chrome } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * LoginForm - GX 核心登录组件
 * 采用极致赛博极简风格
 */
export const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lang, setLang] = useState<"zh" | "en" | "it">("zh");

  const t = {
    zh: {
      title: "GX 身份验证",
      subtitle: "银河体验接入系统",
      emailLabel: "安全标识 (邮箱)",
      passwordLabel: "访问密钥 (密码)",
      submit: "建立连接",
      authenticating: "身份验证中...",
      or: "或",
      google: "使用 Google 账号同步",
      reset: "重置密钥",
      register: "初始化新实体",
      security: "加密传输由边缘网络提供 // ID: GX-AUTH-v2.0"
    },
    en: {
      title: "GX IDENTITY",
      subtitle: "Galaxy Experience Access System",
      emailLabel: "Security Identifier (Email)",
      passwordLabel: "Access Key (Password)",
      submit: "Establish Connection",
      authenticating: "Authenticating...",
      or: "OR",
      google: "Sync with Google Entity",
      reset: "Request Key Reset",
      register: "Initialize New Entity",
      security: "Encrypted via Edge Network // ID: GX-AUTH-v2.0"
    },
    it: {
      title: "GX IDENTITÀ",
      subtitle: "Sistema di Accesso Galaxy Experience",
      emailLabel: "Identificatore di Sicurezza (Email)",
      passwordLabel: "Chiave di Accesso (Password)",
      submit: "Stabilisci Connessione",
      authenticating: "Autenticazione...",
      or: "O",
      google: "Sincronizza con Google",
      reset: "Reimposta Chiave",
      register: "Inizializza Nuova Entità",
      security: "Criptato via Edge Network // ID: GX-AUTH-v2.0"
    }
  };

  const current = t[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // 模拟登录逻辑
    setTimeout(() => {
      setIsLoading(false);
      console.log("Logging in with:", { email, password });
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full max-w-md mx-auto relative"
    >
      {/* Language Switcher */}
      <div className="absolute -top-12 right-0 flex items-center space-x-4">
        {(["zh", "en", "it"] as const).map((l) => (
          <button
            key={l}
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
            type="email" 
            placeholder="identity@galaxy.gx"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input 
            label={current.passwordLabel} 
            type="password" 
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full h-12 uppercase tracking-[0.2em] text-sm"
              disabled={isLoading}
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

        {/* OAuth */}
        <div className="space-y-3">
          <Button 
            variant="ghost" 
            className="w-full h-11 space-x-3 text-xs uppercase tracking-widest"
            onClick={() => console.log("Google Login clicked")}
          >
            <Chrome className="w-4 h-4 text-gx-cyan" />
            <span>{current.google}</span>
          </Button>
        </div>

        {/* Footer Links */}
        <div className="flex justify-between items-center text-[10px] font-mono text-white/20 uppercase tracking-tighter pt-4">
          <button className="hover:text-gx-cyan transition-colors">{current.reset}</button>
          <span className="opacity-50">|</span>
          <button className="hover:text-gx-cyan transition-colors">{current.register}</button>
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
