"use client";

import { IndustryCalendar } from "@/features/calendar/components/IndustryCalendar";
import { Suspense } from "react";

export default function CalendarPage() {
  return (
    <main className="h-screen w-screen bg-transparent text-white overflow-hidden relative flex flex-col">
      
      {/* 核心日历组件 App Shell 容器 */}
      <div className="flex-1 w-full relative z-10 overflow-hidden">
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center text-white/50">Loading Calendar...</div>}>
          <IndustryCalendar initialIndustry="beauty" mode="admin" />
        </Suspense>
      </div>
    </main>
  );
}
