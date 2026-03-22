"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { cn } from "@/utils/cn";
import { isActiveBgColor, isActiveBorderColor } from "./utils";

export interface EliteBookingBlockProps {
  title: string;
  time: string;
  client: string;
  color: string;
  accent: string;
  height: string;
}

/**
 * EliteBookingBlock (液态玻璃预约块)
 * 采用物理引擎反馈，极光呼吸灯，降维打击级质感
 */
export const EliteBookingBlock = ({ title, time, client, color, accent, height }: EliteBookingBlockProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    whileHover={{ 
      y: -4, 
      scale: 1.02,
      boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
    }}
    transition={{ 
      type: "spring", 
      stiffness: 260, 
      damping: 20 
    }}
    className={cn(
      "absolute inset-x-1.5 top-0 z-10 rounded-2xl p-4 border shadow-2xl backdrop-blur-3xl flex flex-col justify-between cursor-pointer group overflow-hidden",
      isActiveBgColor(accent),
      isActiveBorderColor(accent),
      height
    )}
  >
    {/* 内部极光背景 (Aurora Glow) */}
    <div className={cn(
      "absolute -top-1/2 -left-1/2 w-full h-full opacity-10 blur-[40px] rounded-full animate-pulse",
      accent === 'purple' ? 'bg-gx-purple' : accent === 'cyan' ? 'bg-gx-cyan' : 'bg-orange-500'
    )} />

    <div className="space-y-1.5 relative z-10">
      <div className="flex items-center justify-between">
        <span className={cn("text-[11px] font-black uppercase tracking-tighter", color)}>{title}</span>
        <div className={cn(
          "w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor]", 
          color.replace('text-', 'bg-')
        )} />
      </div>
      <div className="flex items-center gap-1.5 text-[9px] font-mono text-white font-bold">
        <Clock className="w-3 h-3" />
        {time}
      </div>
    </div>
    
    <div className="flex items-center gap-2.5 mt-auto relative z-10">
      <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[11px] shadow-inner group-hover:border-white/20 transition-colors">
        {client.includes('医生') || client.includes('专家') ? '👨‍⚕️' : '👤'}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-white">{client}</span>
        <span className="text-[10px] font-mono text-white font-bold uppercase tracking-widest">已确认</span>
      </div>
    </div>

    {/* 底部装饰线 */}
    <div className={cn(
      "absolute bottom-0 left-0 right-0 h-1 opacity-50",
      accent === 'purple' ? 'bg-gx-purple' : accent === 'cyan' ? 'bg-gx-cyan' : 'bg-orange-500'
    )} />
  </motion.div>
);
