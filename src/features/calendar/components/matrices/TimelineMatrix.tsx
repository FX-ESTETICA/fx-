"use client";

import { motion } from "framer-motion";

/**
 * 酒店时间线 (Timeline)
 */
export const TimelineMatrix = () => (
 <div className="flex h-full overflow-hidden">
 <div className="w-48 flex flex-col bg-black/40">
 <div className="h-16 flex items-center justify-center">
 <span className="text-[11px] text-white tracking-widest uppercase">房号列表</span>
 </div>
 <div className="flex-1 overflow-y-auto no-scrollbar">
 {['301 DELUXE', '302 SUITE', '303 TWIN', '304 QUEEN', '305 KING', '306 DELUXE'].map((room: string) => (
 <div key={room} className="h-20 flex flex-col items-center justify-center gap-1 cursor-pointer group">
 <span className="text-[11px] text-white ">{room.split(' ')[0]}</span>
 <span className="text-[11px] text-white uppercase">{room.split(' ')[1]}</span>
 </div>
 ))}
 </div>
 </div>
 <div className="flex-1 overflow-x-auto relative no-scrollbar">
 <div className="h-16 flex min-w-[1400px] bg-black/20">
 {Array.from({ length: 14 }).map((_, i: number) => (
 <div key={i} className="flex-1 flex items-center justify-center flex-col gap-0.5 text-white">
 <span className="text-[11px]">3月</span>
 <span className="text-xs ">{(i + 21).toString().padStart(2, '0')}</span>
 </div>
 ))}
 </div>
 <div className="min-w-[1400px] relative h-full">
 {/* 模拟预约条 */}
 <motion.div
 
 
 className="absolute h-12 top-4 left-[10%] w-[30%] bg-[#FDF5E6] rounded-xl flex items-center px-4 text-black text-[11px] uppercase cursor-pointer"
 >
 K. West / 3 晚
 </motion.div>
 <motion.div
 
 
 
 className="absolute h-12 top-[84px] left-[25%] w-[45%] rounded-xl flex items-center px-4 text-white text-[11px] uppercase cursor-pointer"
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
