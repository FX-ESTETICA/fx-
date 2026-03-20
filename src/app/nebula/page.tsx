"use client";

import { NebulaBackground } from "@/features/nebula/components/NebulaBackground";
import { NebulaCore } from "@/features/nebula/components/NebulaCore";
import { GlassCard } from "@/components/shared/GlassCard";
import { LayoutGrid, PieChart, Activity, Layers } from "lucide-react";

export default function NebulaPage() {
  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* 动态星云背景 */}
      <NebulaBackground />

      <div className="relative z-10 p-6 md:p-12 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 h-screen overflow-hidden">
        {/* 左侧：核心星云交互区 */}
        <div className="flex flex-col h-full">
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gx-purple/20 border border-gx-purple/30 flex items-center justify-center">
                <Layers className="w-6 h-6 text-gx-purple" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tighter">星云空间 / Nebula UI</h1>
                <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.4em]">
                  GX_SYSTEM_V3 // SPATIAL_MANAGEMENT
                </p>
              </div>
            </div>
          </header>

          <NebulaCore />
        </div>

        {/* 右侧：实时数据分析面板 */}
        <div className="hidden lg:flex flex-col gap-6 h-full overflow-y-auto pb-12">
          {/* 实时动态 */}
          <GlassCard glowColor="purple" className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-gx-purple">
              <Activity className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">实时态势 / Real-time</span>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/40 uppercase">数据节点 #{i}</span>
                    <span className="text-xs font-medium">节点同步完成 // 202ms</span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-gx-cyan shadow-[0_0_5px_rgba(0,242,255,0.5)]" />
                </div>
              ))}
            </div>
          </GlassCard>

          {/* 经营分布 */}
          <GlassCard glowColor="cyan" className="p-6 space-y-4 flex-1">
            <div className="flex items-center gap-2 text-gx-cyan">
              <PieChart className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">全域分布 / Distribution</span>
            </div>
            <div className="h-48 w-full bg-white/5 rounded-2xl flex items-center justify-center border border-dashed border-white/10">
              <span className="text-[10px] text-white/20 uppercase">可视化引擎渲染中...</span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-1">
                <div className="text-[10px] text-white/40 uppercase">总营收额</div>
                <div className="text-lg font-bold">¥2,410,200</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-white/40 uppercase">增长率</div>
                <div className="text-lg font-bold text-gx-cyan">+12.4%</div>
              </div>
            </div>
          </GlassCard>

          {/* 快捷控制 */}
          <div className="grid grid-cols-2 gap-4">
            <GlassCard className="p-4 flex flex-col items-center gap-2 hover:bg-white/5 transition-all cursor-pointer">
              <LayoutGrid className="w-4 h-4 text-white/40" />
              <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">全局概览</span>
            </GlassCard>
            <GlassCard className="p-4 flex flex-col items-center gap-2 hover:bg-white/5 transition-all cursor-pointer border-gx-purple/20">
              <Layers className="w-4 h-4 text-gx-purple" />
              <span className="text-[9px] font-mono uppercase tracking-widest text-gx-purple">下钻层级</span>
            </GlassCard>
          </div>
        </div>
      </div>
    </main>
  );
}
