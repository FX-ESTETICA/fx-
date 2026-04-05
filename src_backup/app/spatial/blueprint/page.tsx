"use client";

import { useState, Suspense } from "react";
import { IndustryCalendar } from "@/features/calendar/components/IndustryCalendar";
import { IndustryType } from "@/features/calendar/types";
import { Scissors, Stethoscope, Utensils, Hotel, Briefcase, Dumbbell, Calendar as CalendarIcon, ArrowLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";

const INDUSTRIES: { id: IndustryType; label: string; icon: LucideIcon; color: string }[] = [
  { id: "beauty", label: "美业", icon: Scissors, color: "text-gx-purple" },
  { id: "medical", label: "医疗", icon: Stethoscope, color: "text-white" },
  { id: "dining", label: "餐饮", icon: Utensils, color: "text-orange-500" },
  { id: "hotel", label: "住宿", icon: Hotel, color: "text-gx-cyan" },
  { id: "expert", label: "专家", icon: Briefcase, color: "text-blue-400" },
  { id: "fitness", label: "健身", icon: Dumbbell, color: "text-green-400" },
  { id: "other", label: "常规", icon: CalendarIcon, color: "text-white/60" },
];

export default function BlueprintPage() {
  const [activeIndustry, setActiveIndustry] = useState<IndustryType>("beauty");

  return (
    <main className="h-screen w-full bg-black relative overflow-hidden">
      {/* 顶部悬浮 HUD 切换环 */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4"
      >
        <Link href="/spatial" prefetch={false}>
          <button className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>

        <div className="flex items-center p-1 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          {INDUSTRIES.map((ind) => {
            const isActive = activeIndustry === ind.id;
            const Icon = ind.icon;
            return (
              <button
                key={ind.id}
                onClick={() => setActiveIndustry(ind.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
                  isActive ? "bg-white text-black" : "text-white/40 hover:text-white/80 hover:bg-white/5"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-black" : ind.color)} />
                <span className="text-xs font-bold tracking-widest">{ind.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="active-blueprint-pill"
                    className="absolute inset-0 border border-white/50 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] pointer-events-none"
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* 核心日历矩阵 (使用 key 强制重新挂载以重置状态) */}
      <div className="h-full w-full">
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center text-white/50">Loading Calendar...</div>}>
          <IndustryCalendar key={activeIndustry} initialIndustry={activeIndustry} mode="admin" />
        </Suspense>
      </div>
    </main>
  );
}
