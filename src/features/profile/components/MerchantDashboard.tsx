"use client";

import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { LayoutGrid, TrendingUp, Users, Store } from "lucide-react";
import Link from "next/link";

export const MerchantDashboard = () => {
  return (
    <div className="space-y-12">
      {/* 核心入口区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 星云管理入口 (商户/老板核心) */}
        <GlassCard glowColor="purple" className="p-8 group cursor-pointer relative overflow-hidden transition-all duration-500 hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gx-purple/10 blur-[60px] rounded-full group-hover:bg-gx-purple/20 transition-all duration-500" />
          <div className="relative z-10 flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gx-purple/10 border border-gx-purple/20 flex items-center justify-center text-gx-purple group-hover:bg-gx-purple/20 transition-all duration-300">
              <LayoutGrid className="w-8 h-8" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-2xl font-bold tracking-tighter">星云空间 / Nebula UI</h3>
              <p className="text-white/40 text-sm leading-relaxed">
                可视化管理您的商业帝国。总览、分流与团队协作的全链路驾驶舱。
              </p>
              <div className="pt-4">
                <Link href="/nebula">
                  <Button variant="purple" size="sm" className="uppercase tracking-widest text-[10px]">
                    管理空间 / Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* 商业数据仪表盘 */}
        <GlassCard glowColor="cyan" className="p-8 group cursor-pointer relative overflow-hidden transition-all duration-500 hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gx-cyan/10 blur-[60px] rounded-full group-hover:bg-gx-cyan/20 transition-all duration-500" />
          <div className="relative z-10 flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gx-cyan/10 border border-gx-cyan/20 flex items-center justify-center text-gx-cyan group-hover:bg-gx-cyan/20 transition-all duration-300">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-2xl font-bold tracking-tighter">AI 商业复盘 / AI Analytics</h3>
              <p className="text-white/40 text-sm leading-relaxed">
                实时同步抖音、携程与 58 数据流。通过 AI 自动化分析提供经营建议。
              </p>
              <div className="pt-4">
                <Link href="/analytics">
                  <Button variant="cyan" size="sm" className="uppercase tracking-widest text-[10px]">
                    数据复盘 / Review
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 辅助操作区 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-6 flex flex-col items-center gap-4 text-center hover:bg-white/5 transition-all cursor-pointer">
          <Users className="w-6 h-6 text-white/40" />
          <span className="text-[10px] font-mono uppercase tracking-widest">团队授权 / Team</span>
        </GlassCard>
        <GlassCard className="p-6 flex flex-col items-center gap-4 text-center hover:bg-white/5 transition-all cursor-pointer">
          <Store className="w-6 h-6 text-white/40" />
          <span className="text-[10px] font-mono uppercase tracking-widest">店铺设置 / Store Settings</span>
        </GlassCard>
      </div>
    </div>
  );
};
