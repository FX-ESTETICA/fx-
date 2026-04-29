"use client";

import { motion } from "framer-motion";
import { LayoutGrid, Plus } from "lucide-react";
import { cn } from "@/utils/cn";
import { IndustryType, IndustryDNA } from "../../types";
import { useTranslations } from "next-intl";
import { useVisualSettings } from "@/hooks/useVisualSettings";

export interface EliteSpatialMatrixProps {
 industry: IndustryType;
 dna: IndustryDNA;
}

type TableStatus = "occupied" | "available" | "reserved";

type TableInfo = {
 id: string;
 name: string;
 type: string;
 status: TableStatus;
};

type LegendItem = {
 label: string;
 color: string;
};

/**
 * EliteSpatialMatrix (实时态势空间阵列)
 * X: 桌位, Y: 时间轴 + 全域桌位雷达
 */
export const EliteSpatialMatrix = ({ industry, dna }: EliteSpatialMatrixProps) => {
 const t = useTranslations('EliteSpatialMatrix');
 const { settings: visualSettings } = useVisualSettings();
 const timeSlots = Array.from({ length: 14 }, (_, i: number) => `${(i + 10).toString().padStart(2, '0')}:00`);
 const tables: TableInfo[] = [
 { id: 'T1', name: '靠窗 01', type: '2人桌', status: 'occupied' },
 { id: 'T2', name: '靠窗 02', type: '2人桌', status: 'available' },
 { id: 'T3', name: '中心 03', type: '4人桌', status: 'reserved' },
 { id: 'T4', name: '中心 04', type: '4人桌', status: 'available' },
 { id: 'T5', name: '卡座 05', type: '6人桌', status: 'occupied' },
 { id: 'T6', name: '包间 06', type: '10人桌', status: 'available' },
 ];
 const statusLegend: LegendItem[] = [
 { label: '空闲', color: 'bg-[#FDF5E6]' }, 
 { label: '占用', color: 'bg-red-500' },
 { label: '已预订', color: 'bg-orange-500' }
 ];

 return (
 <div className="flex flex-col h-full overflow-hidden bg-black/40">
 {/* 全域桌位雷达 (Spatial Radar) */}
 <div className="p-4 bg-black/60 flex items-center justify-between relative overflow-hidden">
 {/* 雷达扫描动效 */}
 <motion.div 
 
 
 className="absolute -left-12 -top-12 w-64 h-64 bg-gradient-to-r from-[#FDF5E6]/10 to-transparent rounded-full pointer-events-none"
 />

 <div className="flex items-center gap-6 relative z-10">
 <div className="flex flex-col">
 <span className="text-[11px] text-white uppercase tracking-widest">
 {dna.metadata?.columnHeader?.split(' / ')[0] || "Occupancy"}
 </span>
 <div className="flex items-center gap-2">
 <span className="text-xl text-[#FDF5E6]">3/6</span>
 <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
 <motion.div 
 
 
 className="h-full bg-[#FDF5E6]" 
 />
 </div>
 </div>
 </div>
 <div className="h-8 w-px bg-white/5" />
 <div className="flex gap-6">
 {statusLegend.map((s) => (
 <div key={s.label} className="flex items-center gap-2.5">
 <div className={cn("w-2 h-2 rounded-full", s.color)} />
 <span className="text-[11px] text-white uppercase tracking-widest">{s.label}</span>
 </div>
 ))}
 </div>
 </div>
 <div className="flex items-center gap-3 relative z-10">
 <button className="px-6 py-2.5 rounded-xl bg-white/5 text-white text-[11px] uppercase tracking-[0.2em] ">
 {t('txt_154261')}</button>
 <button className="px-6 py-2.5 rounded-xl bg-[#FDF5E6]/5 text-[#FDF5E6] text-[11px] uppercase tracking-[0.2em] ">
 {industry === 'dining' ? '智能寻位' : '智能排班'} / Smart Search
 </button>
 </div>
 </div>

 <div className="flex flex-1 overflow-hidden">
 {/* 时间轴 */}
 <div className="w-24 flex flex-col bg-black/20 shrink-0">
 <div className="h-16 flex items-center justify-center">
 <LayoutGrid className="w-3.5 h-3.5 text-white" />
 </div>
 <div className="flex-1 overflow-y-auto no-scrollbar">
 {timeSlots.map((time: string) => (
 <div key={time} className="h-20 flex items-center justify-center">
 <span className="text-[11px] text-white ">{time}</span>
 </div>
 ))}
 </div>
 </div>

 {/* 空间阵列 */}
 <div className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar">
 <div className="min-w-fit flex flex-col">
 {/* 桌位表头 */}
 <div className="flex bg-black/40 sticky top-0 z-10 ">
 {tables.map((table) => (
 <div key={table.id} className="flex-1 min-w-[140px] max-w-[240px] h-16 flex flex-col items-center justify-center shrink-0 group cursor-pointer ">
 <span className="text-[11px] text-white ">{table.name}</span>
 <span className="text-[11px] text-white uppercase tracking-widest">{table.type}</span>
 </div>
 ))}
 </div>

 {/* 阵列主体 */}
 <div className="relative">
 {timeSlots.map((_, timeIdx: number) => (
 <div key={timeIdx} className="flex h-20">
 {tables.map((table) => (
 <div key={table.id} className="flex-1 min-w-[140px] max-w-[240px] relative group shrink-0">
 {/* 模拟状态占位 */}
 {timeIdx === 2 && table.id === 'T1' && (
 <div className={cn("absolute inset-1 rounded-lg flex flex-col items-center justify-center gap-1 ", visualSettings.headerTitleColorTheme === 'coreblack' ? "bg-black/5" : "bg-white/5")}>
 <span className={cn("text-[11px]", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black" : "text-white")}>{t('txt_65f899')}</span>
 <span className={cn("text-[11px] ", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black/60" : "text-white/60")}>{t('txt_c1b815')}</span>
 </div>
 )}
 {timeIdx === 5 && table.id === 'T3' && (
 <div className={cn("absolute inset-1 rounded-lg flex flex-col items-center justify-center gap-1 ", visualSettings.headerTitleColorTheme === 'coreblack' ? "bg-black/5" : "bg-white/5")}>
 <span className={cn("text-[11px]", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black" : "text-white")}>{t('txt_44209e')}</span>
 <span className={cn("text-[11px] ", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black/60" : "text-white/60")}>{t('txt_c71976')}</span>
 </div>
 )}
 {/* 空位引导 */}
 <div className="absolute inset-0 flex items-center justify-center opacity-0 ">
 <Plus className="w-4 h-4 text-[#FDF5E6]" />
 </div>
 </div>
 ))}
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};
