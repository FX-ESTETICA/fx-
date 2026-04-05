"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      // 宏任务推迟法则：避开 Next.js 的 Transition 挂起死锁
      const timer = setTimeout(() => {
        router.replace("/dashboard");
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isLoading, user, router]);

  return (
    <main className="min-h-screen bg-transparent text-white relative overflow-hidden flex items-center justify-center">
      
      {isLoading ? (
        // 视觉降噪：真空期不渲染任何文字，避免被快照冻结，保持绝对清透
        <div className="relative z-10 w-full h-full" />
      ) : (
        <div className="relative z-10 w-full max-w-sm px-6">
          <GlassCard className="p-8 flex flex-col items-center justify-center gap-6 text-center border-white/5 bg-black/20 backdrop-blur-2xl">
            <div className="space-y-2">
              <div className="text-lg font-bold tracking-widest">登录 / 注册 成为尊贵会员</div>
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Join GX Membership</div>
            </div>
            <Link href="/login?next=%2Fdashboard" className="inline-flex w-full" prefetch={false}>
              <Button variant="ghost" glow={false} className="w-full gap-2 text-xs uppercase tracking-widest border border-white/10 hover:bg-white/5">
                去登录
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </GlassCard>
        </div>
      )}
    </main>
  );
}
