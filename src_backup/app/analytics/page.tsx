"use client";

import { AnalyticsDashboard } from "@/features/analytics/components/AnalyticsDashboard";
import { PlatformMetric, AIInsight } from "@/features/analytics/types";
import { Button } from "@/components/shared/Button";
import { LayoutGrid, Download, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";

export default function AnalyticsPage() {
  const mockMetrics: PlatformMetric[] = [
    { id: "1", platform: "douyin", metricName: "视频播放量 / Views", value: "1.2M", trend: 15.4, status: "growing" },
    { id: "2", platform: "ctrip", metricName: "预订转化率 / Conversion", value: "4.8%", trend: -2.1, status: "declining" },
    { id: "3", platform: "58tc", metricName: "线索留存 / Leads", value: "248", trend: 5.2, status: "growing" },
    { id: "4", platform: "xiaohongshu", metricName: "笔记互动 / Engagement", value: "12.4k", trend: 8.9, status: "growing" },
  ];

  const mockInsights: AIInsight[] = [
    {
      id: "i1",
      type: "opportunity",
      content: "基于抖音热门话题 #本地生活新探店# 的高频互动，建议增加 15-30s 的短视频投放，预计可提升 12% 的进店率。",
      source: ["douyin"],
      confidence: 94
    },
    {
      id: "i2",
      type: "warning",
      content: "携程平台的预订量在 20:00-22:00 出现异常波动，可能与竞品低价策略有关，建议启动动态调价引擎。",
      source: ["ctrip"],
      confidence: 88
    },
    {
      id: "i3",
      type: "info",
      content: "小红书用户对『赛博简约风格』的评价词云热度上升，品牌视觉资产同步率良好。",
      source: ["xiaohongshu"],
      confidence: 91
    }
  ];

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12 relative overflow-hidden">
      {/* 背景光效 */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-gx-purple/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-gx-cyan/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-[1400px] mx-auto space-y-12 relative z-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/5">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-gx-cyan">
              <Sparkles className="w-6 h-6" />
              <span className="text-[10px] font-mono uppercase tracking-[0.4em]">AI_ANALYTICS_V2 // 复盘系统</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tighter">智能商业复盘 / AI Analytics</h1>
            <p className="text-white/40 text-sm max-w-xl">
              深度集成抖音、携程、58同城与小红书多平台数据，通过 AI 自动化分析提供全域经营决策支持。
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="gap-2 text-white/40">
              <RefreshCw className="w-3 h-3" />
              刷新 / Refresh
            </Button>
            <Button variant="cyan" size="sm" className="gap-2">
              <Download className="w-3 h-3" />
              导出报告 / Export
            </Button>
          </div>
        </header>

        {/* 核心仪表盘 */}
        <AnalyticsDashboard metrics={mockMetrics} insights={mockInsights} />

        {/* 底部导航 */}
        <footer className="pt-12 flex justify-between items-center text-[9px] font-mono text-white/10 uppercase tracking-[0.4em]">
          <Link href="/dashboard" className="hover:text-gx-cyan transition-colors flex items-center gap-2" prefetch={false}>
            <LayoutGrid className="w-3 h-3" />
            返回仪表盘 / Dashboard
          </Link>
          <div className="flex gap-4">
            <span>Secured via Edge Network</span>
            <span>GX_CORE // 2026</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
