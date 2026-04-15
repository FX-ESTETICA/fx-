"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function MePage() {
    const t = useTranslations('me');
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      // 物理级强制重定向：彻底粉碎 Next.js App Router 的 Suspense 挂起死锁
      window.location.replace("/dashboard");
    }
  }, [isLoading, user]);

  return (
    <main className="min-h-[100dvh] bg-transparent text-white relative overflow-hidden flex items-center justify-center">
      
      {isLoading ? (
        // 视觉降噪：真空期不渲染任何文字，避免被快照冻结，保持绝对清透
        <div className="relative z-10 w-full h-full" />
      ) : (
        <div className="relative z-10 w-full max-w-sm px-6">
          <GlassCard className="p-8 flex flex-col items-center justify-center gap-6 text-center border-white/5 bg-black/20 backdrop-blur-2xl">
            <div className="space-y-2">
              <div className="text-lg font-bold tracking-widest">{t('txt_146ea7')}</div>
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Join GX Membership</div>
            </div>
            <Link href="/login?next=%2Fdashboard" className="inline-flex w-full" prefetch={false}>
              <Button variant="ghost" glow={false} className="w-full gap-2 text-xs uppercase tracking-widest border border-white/10 hover:bg-white/5">
                {t('txt_b4b851')}<ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </GlassCard>
        </div>
      )}
    </main>
  );
}
