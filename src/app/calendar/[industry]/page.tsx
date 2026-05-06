"use client";

import { IndustryCalendar } from "@/features/calendar/components/IndustryCalendar";
import { IndustryType } from "@/features/calendar/types";
import { use, Suspense, useState, useEffect } from "react";

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

  const [mode, setMode] = useState<"admin" | "immersive">(() => {
    if (typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem('gx_sandbox_session') || localStorage.getItem('gx_cached_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.role === 'boss' || user.role === 'merchant') {
            return "admin";
          }
        }
      } catch (e) {}
    }
    return "immersive";
  });

  return (
    <main className="min-h-[100dvh] bg-transparent text-white p-0 relative overflow-hidden">
      {/* 背景光效 - 沉浸式减弱干扰 */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full pointer-events-none" />
      
      <div className="w-full h-[100dvh] flex flex-col relative z-10">
        {/* 核心日历组件 (Immersive / Admin Mode 动态判定) */}
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={<div className="h-[100dvh] w-full flex items-center justify-center text-white/30 text-sm tracking-widest animate-pulse">LOADING CALENDAR...</div>}>
            <IndustryCalendar initialIndustry={currentIndustry} mode={mode} />
          </Suspense>
        </div>

 {/* 极简底部 - 仅管理员可见的返回入口(Mock) */}
 <footer className="absolute bottom-4 left-6 flex items-center text-[11px] text-white uppercase tracking-[0.4em] hover:text-white cursor-default">
 <div className="flex gap-4">
 <span>SECURE_SESSION: {industry.toUpperCase()}_LOCK</span>
 <span>GX_SYNC_ENGINE // 2026</span>
 </div>
 </footer>
 </div>
 </main>
 );
}
