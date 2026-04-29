"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/shared/GlassCard";
import { TrendingUp, TrendingDown, Minus, MessageSquareText, Sparkles } from "lucide-react";
import { PlatformMetric, AIInsight, Platform } from "../types";
import { cn } from "@/utils/cn";
import { useTranslations } from "next-intl";

interface AnalyticsDashboardProps {
 metrics: PlatformMetric[];
 insights: AIInsight[];
}

const PlatformIcon = ({ platform }: { platform: Platform }) => {
 const styles = {
 douyin: "bg-black text-white border-white/20",
 ctrip: "bg-blue-600 text-white border-blue-400/30",
 "58tc": "bg-orange-500 text-white border-orange-400/30",
 xiaohongshu: "bg-red-600 text-white border-red-400/30",
 };
 
 const labels = {
 douyin: "DY",
 ctrip: "CT",
 "58tc": "58",
 xiaohongshu: "XH",
 };

 return (
 <div className={cn("w-6 h-6 rounded flex items-center justify-center text-[11px] border", styles[platform])}>
 {labels[platform]}
 </div>
 );
};

export const AnalyticsDashboard = ({ metrics, insights }: AnalyticsDashboardProps) => {
 const t = useTranslations('AnalyticsDashboard');

 return (
 <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
 {/* 平台指标流 */}
 <div className="xl:col-span-2 space-y-6">
 <div className="flex items-center justify-between">
 <h3 className="text-xl tracking-tighter flex items-center gap-2">
 <Sparkles className="w-5 h-5 " />
 {t('txt_414a0a')}</h3>
 <span className="text-[11px] text-white uppercase tracking-widest">
 Live Sync: 200ms
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {metrics.map((metric) => (
 <motion.div
 key={metric.id}
 
 
 
 >
 <GlassCard className="p-5 group hover:border-white/20 ">
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-3">
 <PlatformIcon platform={metric.platform} />
 <div className="space-y-0.5">
 <p className="text-[11px] text-white uppercase ">{metric.metricName}</p>
 <p className="text-xl tracking-tight">{metric.value}</p>
 </div>
 </div>
 <div className={cn(
 "flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border",
 metric.status === "growing" ? " " :
 metric.status === "declining" ? "text-gx-red border-gx-red/20 bg-gx-red/5" :
 "text-white border-white/10 bg-white/5"
 )}>
 {metric.status === "growing" ? <TrendingUp className="w-3 h-3" /> :
 metric.status === "declining" ? <TrendingDown className="w-3 h-3" /> :
 <Minus className="w-3 h-3" />}
 {metric.trend > 0 ? `+${metric.trend}%` : `${metric.trend}%`}
 </div>
 </div>
 </GlassCard>
 </motion.div>
 ))}
 </div>
 </div>

 {/* AI 复盘洞察 */}
 <div className="space-y-6">
 <h3 className="text-xl tracking-tighter flex items-center gap-2">
 <MessageSquareText className="w-5 h-5 " />
 {t('txt_c43c54')}</h3>

 <div className="space-y-4">
 {insights.map((insight) => (
 <motion.div
 key={insight.id}
 
 
 
 >
 <GlassCard 
 glowColor={insight.type === "opportunity" ? "cyan" : insight.type === "warning" ? "danger" : "purple"}
 className={cn(
 "p-5 border-l-4",
 insight.type === "opportunity" ? "" : 
 insight.type === "warning" ? "border-gx-red" : 
 ""
 )}
 >
 <div className="space-y-3">
 <div className="flex items-center gap-2">
 {insight.source.map(s => <PlatformIcon key={s} platform={s} />)}
 <span className="text-[11px] text-white">Confidence: {insight.confidence}%</span>
 </div>
 <p className="text-sm leading-relaxed text-white">
 {insight.content}
 </p>
 </div>
 </GlassCard>
 </motion.div>
 ))}
 </div>
 </div>
 </div>
 );
};
