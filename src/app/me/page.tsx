"use client";

import { NebulaBackground } from "@/components/shared/NebulaBackground";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MePage() {
  const { user, isLoading, isGuest } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user) router.replace("/dashboard");
  }, [isLoading, user, router]);
  return (
    <main className="min-h-screen bg-black text-white relative overflow-x-hidden pb-32">
      <NebulaBackground rotation={0} />
      <div className="max-w-3xl mx-auto px-6 pt-12 relative z-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter">我的</h1>
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em]">Personal Center</p>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-white/40 text-sm font-mono tracking-widest">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <GlassCard className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-bold">登录 / 注册 成为尊贵会员</div>
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Join GX Membership</div>
              </div>
              <Link href="/login?next=%2Fdashboard" className="inline-flex">
                <Button variant="ghost" glow={false} size="sm" className="gap-2 text-xs uppercase tracking-widest">
                  去登录
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </GlassCard>
            {isGuest && (
              <GlassCard className="p-5">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                  当前为游客模式，部分功能受限
                </div>
              </GlassCard>
            )}
          </div>
        )}

        <footer className="pt-12 text-[9px] font-mono text-white/10 uppercase tracking-[0.4em]">
          <span>GX_PORTAL_ME // 2026</span>
        </footer>
      </div>
    </main>
  );
}
