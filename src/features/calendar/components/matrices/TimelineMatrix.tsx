"use client";

import { motion } from "framer-motion";

/**
 * 酒店时间线 (Timeline)
 */
export const TimelineMatrix = () => (
  <div className="flex h-full overflow-hidden">
    <div className="w-48 flex flex-col bg-black/40">
      <div className="h-16 flex items-center justify-center">
        <span className="text-[10px] font-black text-white tracking-widest uppercase">房号列表</span>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {['301 DELUXE', '302 SUITE', '303 TWIN', '304 QUEEN', '305 KING', '306 DELUXE'].map((room: string) => (
          <div key={room} className="h-20 flex flex-col items-center justify-center gap-1 hover:bg-white/[0.02] transition-colors cursor-pointer group">
            <span className="text-[10px] font-black text-white group-hover:text-gx-cyan transition-colors">{room.split(' ')[0]}</span>
            <span className="text-[8px] font-mono text-white font-bold uppercase">{room.split(' ')[1]}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="flex-1 overflow-x-auto relative no-scrollbar">
      <div className="h-16 flex min-w-[1400px] bg-black/20">
        {Array.from({ length: 14 }).map((_, i: number) => (
          <div key={i} className="flex-1 flex items-center justify-center flex-col gap-0.5 text-white">
            <span className="text-[8px] font-mono">3月</span>
            <span className="text-xs font-black">{(i + 21).toString().padStart(2, '0')}</span>
          </div>
        ))}
      </div>
      <div className="min-w-[1400px] relative h-full">
        {/* 模拟预约条 */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute h-12 top-4 left-[10%] w-[30%] bg-gx-cyan rounded-xl flex items-center px-4 text-black font-black text-[10px] uppercase shadow-[0_0_30px_rgba(0,240,255,0.3)] cursor-pointer"
        >
          K. West / 3 晚
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="absolute h-12 top-[84px] left-[25%] w-[45%] bg-gx-purple rounded-xl flex items-center px-4 text-white font-black text-[10px] uppercase shadow-[0_0_30px_rgba(168,85,247,0.3)] cursor-pointer"
        >
          E. Musk / 5 晚
        </motion.div>
        {Array.from({ length: 6 }).map((_, i: number) => (
          <div key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  </div>
);
