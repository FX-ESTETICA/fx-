"use client";

import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

/**
 * CapacityFlow (动态流量时空流)
 * Y: 时间轴, Content: 流量密度与出入场记录 (健身行业)
 */
export const CapacityFlow = () => {
  const timeSlots = Array.from({ length: 16 }, (_, i: number) => `${(i + 7).toString().padStart(2, '0')}:00`);
  
  const entries = [
    { id: '1', name: '王健', type: '入场', time: '08:15', avatar: '🏃‍♂️', status: 'active' },
    { id: '2', name: '李力', type: '入场', time: '08:45', avatar: '💪', status: 'active' },
    { id: '3', name: '赵强', type: '离场', time: '09:30', avatar: '🧘‍♂️', status: 'completed' },
    { id: '4', name: '孙美', type: '入场', time: '10:00', avatar: '💃', status: 'active' },
    { id: '5', name: '刘洋', type: '离场', time: '11:15', avatar: '👟', status: 'completed' },
  ];

  return (
    <div className="h-full relative overflow-hidden bg-black/40 flex flex-col">
      {/* 实时流量看板 */}
      <div className="p-6 bg-black/60 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-12">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono text-white font-bold uppercase tracking-[0.2em]">当前客流</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-green-400">24</span>
              <span className="text-[10px] font-mono text-white font-bold pb-1">/ 50 人</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-mono text-white font-bold uppercase tracking-[0.2em]">客流强度</span>
            <div className="flex gap-1 items-end h-8">
              {[40, 60, 80, 50, 30, 90, 70, 40].map((h: number, i: number) => (
                <motion.div 
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  className={cn(
                    "w-1.5 rounded-full",
                    h > 80 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : h > 50 ? "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" : "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="px-6 py-2 rounded-xl bg-white/5 text-white text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
            闸机控制
          </button>
          <button className="px-6 py-2 rounded-xl bg-green-500 text-black text-[11px] font-black uppercase tracking-widest hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)]">
            手动登记
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* 时间轴 */}
        <div className="w-24 flex flex-col bg-black/20 shrink-0">
          {timeSlots.map((time: string) => (
            <div key={time} className="h-24 flex items-center justify-center">
              <span className="text-[10px] font-mono text-white font-bold">{time}</span>
            </div>
          ))}
        </div>

        {/* 出入场记录 */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
          {entries.map((entry: any) => (
            <motion.div 
              key={entry.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lg">
                  {entry.avatar}
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-white">{entry.name}</span>
                  <span className="text-[9px] font-mono text-white font-bold uppercase tracking-widest">{entry.time}</span>
                </div>
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                entry.type === '入场' ? "text-green-400 bg-green-400/5" : "text-white bg-white/10"
              )}>
                {entry.type}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
