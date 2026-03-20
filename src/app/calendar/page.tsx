"use client";

import { IndustryCalendar } from "@/features/calendar/components/IndustryCalendar";
import { Button } from "@/components/shared/Button";
import { LayoutGrid, Download, Plus, Search, Filter } from "lucide-react";
import Link from "next/link";

export default function CalendarPage() {
  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12 relative overflow-hidden">
      {/* 背景光效 */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gx-cyan/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gx-purple/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-[1400px] mx-auto space-y-12 relative z-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/5">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-gx-cyan">
              <Plus className="w-5 h-5" />
              <span className="text-[10px] font-mono uppercase tracking-[0.4em]">GX_SYSTEM_V2 // 预约管理</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tighter">智能日历 / Smart Calendar</h1>
            <p className="text-white/40 text-sm max-w-xl">
              行业自适应预约调度系统。支持多业态切换，实时同步全渠道预约数据。
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-gx-cyan transition-colors" />
              <input 
                type="text" 
                placeholder="搜索预约 / Search..." 
                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs font-mono focus:outline-none focus:border-gx-cyan/50 transition-all w-48 focus:w-64"
              />
            </div>
            <Button variant="ghost" size="sm" className="gap-2 text-white/40 border-white/10">
              <Filter className="w-3 h-3" />
              筛选 / Filter
            </Button>
            <Button variant="cyan" size="sm" className="gap-2">
              <Download className="w-3 h-3" />
              导出日历 / Export
            </Button>
          </div>
        </header>

        {/* 核心日历组件 */}
        <IndustryCalendar initialIndustry="beauty" />

        {/* 底部导航 */}
        <footer className="pt-12 flex justify-between items-center text-[9px] font-mono text-white/10 uppercase tracking-[0.4em]">
          <Link href="/dashboard" className="hover:text-gx-cyan transition-colors flex items-center gap-2">
            <LayoutGrid className="w-3 h-3" />
            返回仪表盘 / Dashboard
          </Link>
          <div className="flex gap-4">
            <span>Powered by GX_CALENDAR_ENGINE</span>
            <span>SECURE_ENCRYPTED_DATA // 2026</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
