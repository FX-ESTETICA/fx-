"use client";

import { IndustryCalendar } from "@/features/calendar/components/IndustryCalendar";
import { IndustryType } from "@/features/calendar/types";
import { use } from "react";

export default function ImmersiveCalendarPage({ 
  params 
}: { 
  params: Promise<{ industry: string }> 
}) {
  const { industry } = use(params);
  
  // 验证行业类型
  const validIndustries: IndustryType[] = ["beauty", "dining", "hotel", "medical", "expert", "fitness", "other"];
  const currentIndustry = validIndustries.includes(industry as IndustryType) 
    ? (industry as IndustryType) 
    : "other";

  return (
    <main className="min-h-screen bg-transparent text-white p-0 relative overflow-hidden">
      {/* 背景光效 - 沉浸式减弱干扰 */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gx-cyan/2 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full h-screen flex flex-col relative z-10">
        {/* 核心日历组件 (Immersive Mode) */}
        <div className="flex-1 overflow-hidden">
          <IndustryCalendar initialIndustry={currentIndustry} mode="immersive" />
        </div>

        {/* 极简底部 - 仅管理员可见的返回入口(Mock) */}
        <footer className="absolute bottom-4 left-6 flex items-center text-[8px] font-mono text-white/5 uppercase tracking-[0.4em] hover:text-white/20 transition-all cursor-default">
          <div className="flex gap-4">
            <span>SECURE_SESSION: {industry.toUpperCase()}_LOCK</span>
            <span>GX_SYNC_ENGINE // 2026</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
