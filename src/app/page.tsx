"use client";

import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-6 overflow-hidden">
      {/* 背景发光氛围 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gx-cyan/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gx-purple/10 blur-[120px] rounded-full" />

      <div className="z-10 max-w-5xl w-full flex flex-col gap-12">
        <header className="flex flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-gx-cyan animate-pulse" />
            <span className="text-gx-cyan font-mono tracking-widest text-xs uppercase">
              系统已上线 / System Online
            </span>
          </motion.div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-6xl md:text-8xl font-bold tracking-tighter"
            >
              GX <span className="text-gradient-cyan">核心</span>
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Link href="/login">
                <Button size="lg" className="uppercase tracking-[0.2em]">
                  建立连接 / Establish Connection
                </Button>
              </Link>
            </motion.div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard glowColor="cyan" className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">协议 90 / Protocol 90</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              意识阈值锁定在 90%。确保零坏账代码架构，拦截所有潜在风险。
            </p>
            <div className="mt-auto pt-4 border-t border-white/5">
              <span className="text-[10px] font-mono text-zinc-600">状态: 已激活 / ACTIVE</span>
            </div>
          </GlassCard>

          <GlassCard glowColor="purple" className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">星云 UI / Nebula UI</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              WebGL 加速的银河可视化引擎。提供 60FPS 的无缝交互体验。
            </p>
            <div className="mt-auto pt-4 border-t border-white/5">
              <span className="text-[10px] font-mono text-zinc-600">状态: 初始化中 / INITIALIZING</span>
            </div>
          </GlassCard>

          <GlassCard className="flex flex-col gap-4 border-white/5">
            <h2 className="text-xl font-semibold">图书馆模式 / Library Mode</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Feature-First 领域隔离逻辑。保持行业内最纯净的代码仓库。
            </p>
            <div className="mt-auto pt-4 border-t border-white/5">
              <span className="text-[10px] font-mono text-zinc-600">状态: 就绪 / READY</span>
            </div>
          </GlassCard>
        </div>

        <footer className="mt-12 flex justify-between items-center text-zinc-500 font-mono text-[10px]">
          <span>© 2026 GALAXY EXPERIENCE</span>
          <div className="flex gap-4">
            <span className="hover:text-gx-cyan cursor-pointer transition-colors uppercase">系统文档</span>
            <span className="hover:text-gx-purple cursor-pointer transition-colors uppercase">安全中心</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
