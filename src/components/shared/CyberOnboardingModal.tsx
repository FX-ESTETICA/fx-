"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/shared/GlassCard";
import { Input } from "@/components/shared/Input";
import { Button } from "@/components/shared/Button";
import { UserCircle, Calendar, Fingerprint, Activity, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useTranslations } from "next-intl";

export const CyberOnboardingModal = () => {
  const { user, refreshUserData } = useAuth();
  const t = useTranslations("CyberOnboardingModal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    gender: "unknown",
    birthday: "",
  });

  // 【强制防穿透与时空冻结锁】
  // 当蒙版出现时，锁定底层 Body 滚动，防止用户在底层瞎滑
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.id || !formData.name) return;

    setIsSubmitting(true);
    try {
      // 1. 尝试持久化更新到底层物理表 (尊重底层的 RLS 和触发器机制)
      // 【终极零红字方案】：调用数据库内部的 RPC 原子操作，消除所有并发与 400 报错噪音
      const { error: rpcError } = await supabase.rpc('sync_user_profile', {
        p_id: user.id,
        p_email: user.email,
        p_name: formData.name,
        p_gender: formData.gender,
        p_birthday: formData.birthday || null
      });

      if (rpcError) throw rpcError;

      // 2. 终极兜底：强制将资料同步到 Auth Metadata (彻底绕过 profiles 空壳缺陷)
      await supabase.auth.updateUser({
        data: {
          name: formData.name,
          gender: formData.gender,
          birthday: formData.birthday || null,
        }
      });

      setIsSuccess(true);
      
      // 3. 延迟 800ms 展示流光绿成功动画，然后触发全局刷新
      setTimeout(async () => {
        await refreshUserData();
        // refreshUserData 执行后，AppShell 层的 !user.name 条件将失效，组件自然卸载
      }, 800);

    } catch (error) {
      console.error("[Onboarding] Failed to update profile:", error);
      setIsSubmitting(false);
    }
  };

  return (
    // 绝对置顶层，完全剥离所有黑底与高斯模糊，实现真正的 100% 透明悬浮
    <div className="fixed inset-0 z-[9999] bg-transparent flex items-center justify-center p-4 pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8 border border-white/10 shadow-2xl relative overflow-hidden">
          {/* 赛博朋克扫描线背景特效 */}
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,240,255,0.05)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50" />
          
          <div className="relative z-10">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gx-cyan/10 border border-gx-cyan/30 flex items-center justify-center mb-4 text-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                {isSuccess ? <CheckCircle2 className="w-8 h-8" /> : <Fingerprint className="w-8 h-8" />}
              </div>
              <h2 className="text-2xl font-bold tracking-tighter text-white mb-2">
                {t('txt_c277e1')}
              </h2>
              <p className="text-[10px] font-mono text-white/40 tracking-[0.2em] uppercase">
                {t('txt_5dd7b2')}
              </p>
            </div>

            {/* Form */}
            <AnimatePresence mode="wait">
              {!isSuccess ? (
                <motion.form 
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleSubmit} 
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-white/60 tracking-widest flex items-center gap-2">
                        <UserCircle className="w-3 h-3" />
                        {t('txt_60d045')}
                      </label>
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t('txt_ab4b97')}
                        className="h-12 bg-black/50 text-white placeholder:text-white/20 border-white/10 focus:border-gx-cyan/50"
                      />
                    </div>

                    {/* Gender (Custom Cyber Radio) */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-white/60 tracking-widest flex items-center gap-2">
                        <Activity className="w-3 h-3" />
                        {t('txt_787b56')}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'male', label: t('txt_36a490') },
                          { id: 'female', label: t('txt_87c835') },
                          { id: 'unknown', label: t('txt_d8782f') }
                        ].map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, gender: g.id })}
                            className={`h-10 rounded-lg text-xs font-bold tracking-widest transition-all border ${
                              formData.gender === g.id 
                                ? "bg-white/10 border-white text-white" 
                                : "bg-black/50 border-white/5 text-white/40 hover:bg-white/5"
                            }`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Birthday */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-white/60 tracking-widest flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {t('txt_abbe4b')}
                      </label>
                      <Input
                        type="date"
                        value={formData.birthday}
                        onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                        className="h-12 bg-black/50 text-white placeholder:text-white/20 border-white/10 focus:border-gx-cyan/50 [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !formData.name || !formData.birthday || formData.gender === 'unknown'}
                    variant="cyan"
                    className="w-full h-12 font-bold tracking-widest uppercase mt-4"
                  >
                    {isSubmitting ? t('txt_6c4783') : t('txt_4366cd')}
                  </Button>
                </motion.form>
              ) : (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 flex flex-col items-center text-center space-y-4"
                >
                  <p className="text-gx-cyan font-bold tracking-widest text-lg">
                    {t('txt_6da9ee')}
                  </p>
                  <p className="text-xs font-mono text-white/40 tracking-[0.2em] animate-pulse uppercase">
                    {t('txt_22fc92')}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
