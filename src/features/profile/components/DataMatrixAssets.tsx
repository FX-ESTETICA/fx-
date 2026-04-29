"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X } from "lucide-react";

import { useTranslations } from "next-intl";
import { useHardwareBack } from "@/hooks/useHardwareBack";

import { useVisualSettings } from "@/hooks/useVisualSettings";
import { cn } from "@/utils/cn";

export const DataMatrixAssets = () => {
 const t = useTranslations('DataMatrixAssets');
 const { settings } = useVisualSettings();
 const isLight = settings.frontendBgIndex !== 0;
 
 // 模拟动态数据
 const MOCK_ECHOES = [
 { id: 1, content: t('echo_1'), time: "2H AGO", impact: 128 },
 { id: 2, content: t('echo_2'), time: "YESTERDAY", impact: 456 },
 { id: 3, content: t('echo_3'), time: "3D AGO", impact: 89 },
 ];

 const [isModalOpen, setIsModalOpen] = useState(false);
 const [echoes, setEchoes] = useState(MOCK_ECHOES);
 const [currentIndex, setCurrentIndex] = useState(0);

 const registerBack = useHardwareBack(state => state.register);
 const unregisterBack = useHardwareBack(state => state.unregister);

 useEffect(() => {
 if (isModalOpen) {
 registerBack('data-matrix-modal', () => {
 setIsModalOpen(false);
 return true;
 }, 40);
 } else {
 unregisterBack('data-matrix-modal');
 }
 return () => unregisterBack('data-matrix-modal');
 }, [isModalOpen, registerBack, unregisterBack]);

 // 状态 1: 自动轮播的呼吸态终端日志 (Holographic Ticker)
 useEffect(() => {
 if (isModalOpen || echoes.length === 0) return;
 const timer = setInterval(() => {
 setCurrentIndex((prev) => (prev + 1) % echoes.length);
 }, 4000); // 每 4 秒呼吸切换一条
 return () => clearInterval(timer);
 }, [isModalOpen, echoes.length]);

 const handleDelete = (id: number) => {
 setEchoes(echoes.filter((e) => e.id !== id));
 };

 if (echoes.length === 0) return null;

 return (
 <>
 {/* 状态 1: 呼吸态终端日志 (Holographic Ticker) - 纯文字，无背景 */}
 <div 
 className="relative flex flex-col items-center justify-center w-full h-5 cursor-pointer group overflow-hidden"
 onClick={() => setIsModalOpen(true)}
 >
 <AnimatePresence mode="wait">
 <motion.div
 key={currentIndex}
 
 
 
 
 className="flex items-center justify-center px-4 w-full"
 >
 <span className={cn("text-[11px] tracking-wider font-light line-clamp-1 max-w-[80%]", isLight ? "text-black" : "text-white")}>
 {echoes[currentIndex].content}
 </span>
 </motion.div>
 </AnimatePresence>
 
 {/* Hover 提示光线 */}
 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[1px] group-hover:w-32 " />
 </div>

 {/* 状态 2: 零容器全息展开 (Zero-Container Fullscreen Overlay) - 物理逃逸，无实体框 */}
 {/* 顶级修复：持久化全屏毛玻璃护盾 (Persistent Glass Shield) */}
 <motion.div
 initial={false}
 animate={isModalOpen ? { opacity: 1 } : { opacity: 0 }}
 
 className={cn("fixed inset-0 z-[99] pointer-events-none", isLight ? "bg-white/70" : "bg-black/70")}
 
 />
 
 <AnimatePresence>
 {isModalOpen && (
 <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center">
 {/* 点击遮罩拦截事件 */}
 <div 
 className="absolute inset-0 bg-transparent cursor-pointer"
 onClick={() => setIsModalOpen(false)}
 />
 
 {/* 纯文字内容层 (物理逃逸) */}
 <motion.div 
 
 
 
 
 className="relative w-full max-w-2xl flex flex-col h-[80vh] px-6 pointer-events-auto"
 >
 {/* 标题头 */}
 <div className="flex flex-col items-center justify-center pb-12 shrink-0">
 <h2 className={cn("text-xl tracking-[0.2em] uppercase", isLight ? "text-black" : "text-white")}>
 ECHOES
 </h2>
 <p className={cn("text-[11px] tracking-[0.3em] mt-2 uppercase", isLight ? "text-black" : "text-white")}>
 {echoes.length} Records Synchronized
 </p>
 </div>

 {/* 无边框列表阵列 */}
 <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
 <AnimatePresence>
 {echoes.map((echo) => (
 <motion.div 
 key={echo.id}
 layout
 
 
 
 
 className="group relative flex flex-col md:flex-row md:items-center gap-2 md:gap-6 py-2"
 >
 {/* 影响值 (移除多余英文时间，只保留 IMP 属性) */}
 <div className="flex items-center gap-3 md:w-24 shrink-0">
 <span className={cn("text-[11px] tracking-widest uppercase", isLight ? "text-black" : "text-white")}>
 IMP:{echo.impact}
 </span>
 </div>
 
 {/* 内容 */}
 <p className={cn("text-sm font-light tracking-wide flex-1", isLight ? "text-black" : "text-white")}>
 {echo.content}
 </p>
 
 {/* 悬浮删除 */}
 <button 
 onClick={() => handleDelete(echo.id)}
 className={cn(
 "absolute right-0 top-1/2 -translate-y-1/2 md:opacity-0 md:group-hover:opacity-100",
 isLight ? "text-black" : "text-white"
 )}
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </motion.div>
 ))}
 </AnimatePresence>
 
 {echoes.length === 0 && (
 <motion.div 
 
 className={cn("text-center text-sm tracking-widest uppercase pt-10", isLight ? "text-black" : "text-white")}
 >
 No Records Found
 </motion.div>
 )}
 </div>

 {/* 底部居中关闭 */}
 <div className="flex justify-center pt-8 shrink-0">
 <button 
 onClick={() => setIsModalOpen(false)}
 className={cn(
 "flex items-center justify-center w-12 h-12 rounded-full ",
 isLight ? "text-black hover:text-black hover:bg-black/5" : "text-white hover:text-white hover:bg-white/5"
 )}
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 </>
 );
};
