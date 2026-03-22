"use client";

import { IndustryCalendar } from "@/features/calendar/components/IndustryCalendar";

import { NebulaBackground } from "@/components/shared/NebulaBackground";

export default function CalendarPage() {
  return (
    <main className="h-screen w-screen bg-transparent text-white overflow-hidden relative flex flex-col">
      <NebulaBackground rotation={0} />
      
      {/* 核心日历组件 App Shell 容器 */}
      <div className="flex-1 w-full relative z-10 overflow-hidden">
        <IndustryCalendar initialIndustry="beauty" mode="admin" />
      </div>
    </main>
  );
}
