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
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user) router.replace("/dashboard");
  }, [isLoading, user, router]);
  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden flex items-center justify-center">
      <NebulaBackground rotation={0} />
      
      {isLoading ? (
        <div className="relative z-10 text-white/40 text-sm font-mono tracking-widest">Loading…</div>
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
