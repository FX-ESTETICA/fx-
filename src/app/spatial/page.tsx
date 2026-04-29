"use client";

import { motion, useMotionValue, useTransform, useSpring, animate, useMotionValueEvent, type MotionValue, type PanInfo } from "framer-motion";
import { Database, Network, ShieldAlert, Lock, Box, Terminal, ChevronLeft, PenTool } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/utils/cn";
import { useTranslations } from "next-intl";

const NAVIGATION_LINKS = [
 { id: "01", label: "核心矩阵", icon: <Database className="w-5 h-5" />, href: "/calendar", glow: "", status: "在线" },
 { id: "02", label: "星云引擎", icon: <Network className="w-5 h-5" />, href: "/nebula", glow: "", status: "同步中" },
 { id: "03", label: "入驻审批台", icon: <ShieldAlert className="w-5 h-5" />, href: "/boss/approvals", glow: "text-red-500", status: "需要操作" },
 { id: "04", label: "联邦权限署", icon: <Lock className="w-5 h-5" />, href: "/auth", glow: "text-yellow-500", status: "已锁定" },
 { id: "05", label: "物理节点", icon: <Box className="w-5 h-5" />, href: "/discovery", glow: "text-white", status: "待机" },
 { id: "06", label: "深渊协议", icon: <Terminal className="w-5 h-5" />, href: "/analytics", glow: "text-white", status: "机密" },
 { id: "07", label: "日历设计舱", icon: <PenTool className="w-5 h-5" />, href: "/spatial/blueprint", glow: "", status: "设计模式" },
];

type NavigationLink = typeof NAVIGATION_LINKS[number];

type CardItemProps = {
 link: NavigationLink;
 index: number;
 total: number;
 springRotation: MotionValue<number>;
 isActive: boolean;
 isMobile: boolean;
};

export default function Home() {
 const t = useTranslations('spatial');

 const [activeId, setActiveId] = useState("01");
 const [isMobile, setIsMobile] = useState(false);
 const carouselRotation = useMotionValue(0);

 // 响应式检测
 useEffect(() => {
 const checkMobile = () => setIsMobile(window.innerWidth < 768);
 checkMobile();
 window.addEventListener('resize', checkMobile);
 return () => window.removeEventListener('resize', checkMobile);
 }, []);
 
 // 经典丝滑弹簧配置
 const springRotation = useSpring(carouselRotation, { 
 stiffness: 150, 
 damping: 25, 
 mass: 1
 });
 
 useMotionValueEvent(springRotation, "change", (latest) => {
 
 // 实时计算当前激活的 ID
 const totalItems = NAVIGATION_LINKS.length;
 const rawIndex = Math.round(latest / 45);
 const normalizedIndex = ((rawIndex % totalItems) + totalItems) % totalItems;
 const activeIndex = (totalItems - normalizedIndex) % totalItems;
 if (NAVIGATION_LINKS[activeIndex].id !== activeId) {
 setActiveId(NAVIGATION_LINKS[activeIndex].id);
 }
 });

 const startRotationRef = useRef(0);
 
 const handleDragStart = () => {
 startRotationRef.current = carouselRotation.get();
 };

 const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
 const sensitivity = isMobile ? 0.4 : 0.2; // 移动端提高灵敏度
 carouselRotation.set(startRotationRef.current + info.offset.x * sensitivity);
 };

 const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
 const velocity = info.velocity.x;
 
 let targetRotation = carouselRotation.get();

 // 惯性吸附逻辑
 if (Math.abs(velocity) > 500) {
 const direction = velocity > 0 ? 1 : -1;
 targetRotation = Math.round((targetRotation + direction * 20) / 45) * 45;
 } else {
 targetRotation = Math.round(targetRotation / 45) * 45;
 }

 animate(carouselRotation, targetRotation, {
 type: "spring",
 stiffness: 200,
 damping: 30
 });
 };

 return (
 <main className="flex min-h-[100dvh] flex-col items-center text-white p-6 md:p-12 overflow-hidden relative" style={{ pointerEvents: 'auto' }}>
 <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}></div>
 <div className="z-10 max-w-7xl w-full flex flex-col gap-6 md:gap-8 h-full flex-1 pointer-events-none">
 <header className="flex flex-col gap-4 shrink-0 pointer-events-auto">
 <motion.div
 
 
 className="flex items-center gap-2"
 >
 <div className="w-2 h-2 rounded-full " />
 <span className=" tracking-widest text-[11px] md:text-xs uppercase">
 {t('txt_dbd94b')}</span>
 </motion.div>

 <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
 <motion.h1
 
 
 className="text-4xl md:text-6xl tracking-tighter"
 >
 GX <span className="">{t('txt_e18e82')}</span>
 </motion.h1>
 </div>
 </header>

 {/* Core 3D stage - 强制 60vh 物理高度锚定 */}
 <div className={`relative flex-1 ${isMobile ? 'h-[60vh] min-h-[400px]' : 'min-h-[500px]'} flex items-center justify-center ${isMobile ? 'perspective-[1200px]' : 'perspective-[2000px]'} [perspective-origin:center_40%] pointer-events-none`}>
 {/* 旋转容器与交互层 */}
 <motion.div
 className="cursor-grab active:cursor-grabbing pointer-events-auto relative flex items-center justify-center w-full max-w-[320px] md:max-w-none h-full [transform-style:preserve-3d]"
 drag="x"
 dragConstraints={{ left: -1000, right: 1000 }}
 dragElastic={0.1}
 onDragStart={handleDragStart}
 onDrag={handleDrag}
 onDragEnd={handleDragEnd}
 >
 {NAVIGATION_LINKS.map((index_link, index) => (
 <CardItem 
 key={index_link.id}
 link={index_link}
 index={index}
 total={NAVIGATION_LINKS.length}
 springRotation={springRotation}
 isActive={activeId === index_link.id}
 isMobile={isMobile}
 />
 ))}
 </motion.div>

 {/* 底部提示 */}
 <div className="absolute bottom-4 flex flex-col items-center gap-4">
 <div className="flex items-center gap-6 text-[11px] text-white tracking-[0.5em]">
 <span>← SWIPE</span>
 <div className="w-12 h-[1px] bg-white/10" />
 <span>NAVIGATE →</span>
 </div>
 <div className=" text-xs tracking-widest">
 SYSTEM_INDEX: {activeId} / 08
 </div>
 </div>
 </div>
 </div>

 <footer className="w-full max-w-7xl z-10 py-6 flex justify-between items-center text-[11px] tracking-widest border-t border-white/5 pointer-events-auto">
 <div className="flex gap-8">
 <span>© 2026 GALAXY EXPERIENCE</span>
 <span className="hidden lg:inline ">GX_V1_LEGACY_RESTORED</span>
 </div>
 <div className="flex gap-6">
 <span className=" cursor-pointer uppercase">SYSTEM_LOG</span>
 <span className=" cursor-pointer uppercase">SECURITY_VAULT</span>
 </div>
 </footer>
 </main>
 );
}

// 为了确保平滑替换，我们需要重构 CardItem 适配新的 NAVIGATION_LINKS 数据结构
const CardItem = ({ link, index, total, springRotation, isActive, isMobile }: CardItemProps) => {
 const t = useTranslations('spatial');

 const [isMounted] = useState(() => typeof window !== "undefined");

 const angle = (index / total) * 360;
 
 // 为了彻底解决 Hydration 和 Hooks 调用顺序问题：
 // 所有的 Framer Motion hook (useTransform) 必须在组件的最外层调用，不能放在条件语句中。
 // 我们只在最终渲染的 style 对象中，根据 isMounted 切换使用静态值还是动态 hook 值。
 
 // 计算每个卡片的相对旋转角度
 const cardRotation = useTransform(springRotation, (val: number) => {
 return val + angle;
 });

 // 根据角度计算 Z 轴深度和透明度 (使用三角函数)
 const zTranslate = useTransform(cardRotation, (val: number) => {
 const rad = (val * Math.PI) / 180;
 return Math.cos(rad) * (isMobile ? 120 : 300); // 半径
 });
 
 const xTranslate = useTransform(cardRotation, (val: number) => {
 const rad = (val * Math.PI) / 180;
 return Math.sin(rad) * (isMobile ? 160 : 400);
 });

 const scale = useTransform(cardRotation, (val: number) => {
 const rad = (val * Math.PI) / 180;
 const cosVal = Math.cos(rad);
 return 0.6 + (cosVal + 1) * 0.2; // 0.6 到 1.0
 });

 const opacity = useTransform(cardRotation, (val: number) => {
 const rad = (val * Math.PI) / 180;
 const cosVal = Math.cos(rad);
 return 0.1 + (cosVal + 1) * 0.45; // 0.1 到 1.0
 });

 const blurFilter = useTransform(cardRotation, (val: number) => {
 const rad = (val * Math.PI) / 180;
 const cosVal = Math.cos(rad);
 return `blur(${Math.max(0, (1 - cosVal) * 8)}px)`;
 });
 
 const rotateY = useTransform(cardRotation, (val: number) => -val);

 return (
 <motion.div
 style={isMounted ? {
 position: "absolute",
 x: xTranslate,
 z: zTranslate,
 scale,
 opacity,
 filter: blurFilter,
 rotateY: rotateY // 让卡片始终面向观众
 } : {
 position: "absolute",
 // Hydration 阶段强制给一个默认静态的安全值，避免服务器与客户端 Math.random/userAgent 不一致导致的 mismatch
 transform: "translateX(0px) translateZ(0px) scale(0.6) rotateY(0deg)",
 opacity: 0.1,
 filter: "blur(8px)",
 }}
 className={cn(
 "w-64 h-80 md:w-80 md:h-[400px] rounded-3xl border border-white/10 bg-black/40 flex flex-col p-8 ",
 isActive ? "border-white/40 " : "hover:border-white/20"
 )}
 >
 <div className="flex justify-between items-start mb-auto">
 <span className="text-4xl tracking-tighter text-white">{link.id}</span>
 <div className={cn("px-2 py-1 rounded text-[11px] tracking-widest border bg-black/50", link.glow, link.glow.replace('text-', 'border-').replace('/40', '/20'))}>
 {link.status}
 </div>
 </div>
 
 <div className="space-y-4 relative z-10">
 <div className={cn("w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10", link.glow)}>
 {link.icon}
 </div>
 <div>
 <h2 className="text-xl md:text-2xl tracking-tighter mb-2">{link.label}</h2>
 <p className="text-xs text-white ">SYSTEM_LINK // {link.href}</p>
 </div>
 </div>

 <div className="mt-8 pt-6 border-t border-white/10">
 <Link href={link.href} prefetch={false} className="w-full">
 <button 
 onPointerDownCapture={(e) => e.stopPropagation()} // 终极护盾：防止 Framer Motion 拦截点击事件
 className={cn(
 "w-full py-3 rounded-lg text-xs tracking-widest uppercase flex items-center justify-center gap-2",
 isActive ? "bg-white text-black hover:bg-white/90" : "bg-white/5 text-white hover:bg-white/10 hover:text-white"
 )}>
 {t('txt_a70c9c')}<ChevronLeft className="w-4 h-4 rotate-180" />
 </button>
 </Link>
 </div>
 </motion.div>
 );
};
