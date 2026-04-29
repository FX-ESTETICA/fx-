"use client";

import { useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { cn } from "@/utils/cn";
import { useTranslations } from "next-intl";

const DRAG_RANGE = 250; // 物理滑动阈值基准

interface CarouselProps {
 shops?: any[];
 onShopClick?: (shop: any) => void;
}

const CarouselCard = ({ item, offset, dragX, onClick }: { item: any; offset: number; dragX: any; onClick?: () => void }) => {
 const t = useTranslations('HolographicCarousel');
 const config = item.config || {};
 const coverImage = config.coverImages?.[0] || "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=2070&auto=format&fit=crop";
 const slogan = config.slogan || "探索数字宇宙边界";

 // 核心公式：将物理像素位移 (dragX) 映射为归一化进度 (-1 到 1)
 const progress = useTransform(dragX, (v: number) => v / DRAG_RANGE);

 // 虚拟偏移量：基础偏移量加上实时的拖拽进度，实现绝对连续的 TikTok 级跟手感
 const virtualOffset = useTransform(progress, (p) => offset + p);

 // 1. X 轴位移：基于 60% 的基础间距实时平移
 const x = useTransform(virtualOffset, (vo) => `calc(${vo * 60}%)`);

 // 2. 缩放景深：越靠近中心 (vo=0) 越大，越远越小
 const scale = useTransform(virtualOffset, (vo) => 1 - Math.min(Math.abs(vo), 1) * 0.15);

 // 3. 层级控制：中心层级最高，平滑过渡防止突变
 const zIndexFloat = useTransform(virtualOffset, (vo) => 30 - Math.abs(vo) * 20);
 const zIndex = useTransform(zIndexFloat, Math.round);

 // 4. 黑场模糊：远离中心时加深遮罩，中心完全清透 

 return (
 <motion.div
 style={{
 x,
 scale,
 zIndex,
 transformOrigin: "center center",
 WebkitFontSmoothing: "antialiased",
 backfaceVisibility: "hidden",
 }}
 className={cn(
 "absolute h-full aspect-[16/9] sm:aspect-[21/9] max-w-[80vw] rounded-[clamp(16px,2vw,24px)] overflow-hidden",
 "ring-1 ring-white/5 border border-white/5 bg-gx-dark-800 "
 )}
 >
 <Image
 src={coverImage}
 alt={item.name}
 fill
 sizes="(max-width: 768px) 100vw, 80vw"
 className="object-cover"
 priority={offset === 0}
 />

 <motion.div
 className="absolute inset-0 bg-black/70 -[2px]"
 />

 <motion.div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

 <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 rounded border border-yellow-500/30 ">
 <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 " />
 <span className="text-[11px] text-yellow-500 tracking-widest uppercase ">
 {t('txt_53a12c')}</span>
 </div>

 <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 z-10">
 <div>
 <h2 className="text-xl md:text-2xl lg:text-3xl text-white uppercase tracking-tighter mb-1 line-clamp-1">
 {item.name}
 </h2>
 <p className="text-[11px] sm:text-[11px] text-white tracking-widest line-clamp-1 uppercase">
 {slogan}
 </p>
 </div>
 <div 
 onClick={(e) => {
 e.stopPropagation();
 onClick?.();
 }}
 className="hidden md:flex shrink-0 items-center gap-1.5 text-yellow-400 text-xs bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20 hover:bg-yellow-500/20 cursor-pointer pointer-events-auto"
 >
 <span>{t('txt_3ed720')}</span>
 <ArrowUpRight className="w-3.5 h-3.5" />
 </div>
 </div>
 </motion.div>

 <motion.div
 className="absolute inset-0 rounded-[clamp(16px,2vw,24px)] border border-white/20 ring-1 ring-white/20 pointer-events-none"
 />
 </motion.div>
 );
};

export const HolographicCarousel = ({ shops = [], onShopClick, isActive = true }: CarouselProps & { isActive?: boolean }) => {
 const [activeIndex, setActiveIndex] = useState(0);
 const dragX = useMotionValue(0);
 const [isDragging, setIsDragging] = useState(false);

 if (!shops || shops.length === 0) return null;

 const handleDragEnd = (_: any, { offset }: any) => {
 setIsDragging(false);
 const swipe = offset.x;
 const swipeThreshold = 50;

 if (swipe < -swipeThreshold) {
 animate(dragX, -DRAG_RANGE, {
 type: "spring",
 stiffness: 400,
 damping: 40,
 onComplete: () => {
 setActiveIndex((prev) => prev + 1);
 dragX.set(0);
 },
 });
 } else if (swipe > swipeThreshold) {
 animate(dragX, DRAG_RANGE, {
 type: "spring",
 stiffness: 400,
 damping: 40,
 onComplete: () => {
 setActiveIndex((prev) => prev - 1);
 dragX.set(0);
 },
 });
 } else {
 animate(dragX, 0, { type: "spring", stiffness: 400, damping: 40 });
 }
 };

 const handleTap = () => {
 if (!isDragging) {
 const length = shops.length;
 const normalizedActiveIndex = ((activeIndex % length) + length) % length;
 const activeShop = shops[normalizedActiveIndex];
 onShopClick?.(activeShop);
 }
 };

 return (
 <div className="relative w-full h-[clamp(200px,25vh,280px)] flex items-center justify-center overflow-hidden py-2 perspective-1000">
 <div className="relative w-full max-w-5xl h-full flex items-center justify-center">
 {shops.map((shop, index) => {
 const length = shops.length;
 const normalizedActiveIndex = ((activeIndex % length) + length) % length;

 let offset = index - normalizedActiveIndex;
 if (offset > Math.floor(length / 2)) offset -= length;
 if (offset < -Math.floor(length / 2)) offset += length;

 if (Math.abs(offset) > 2) return null;

 return <CarouselCard key={shop.id} item={shop} offset={offset} dragX={dragX} onClick={() => onShopClick?.(shop)} />;
 })}

 <motion.div
 drag={isActive ? "x" : false}
 dragConstraints={{ left: 0, right: 0 }}
 dragElastic={1}
 style={{ x: dragX }}
 onDragStart={() => setIsDragging(true)}
 onDragEnd={handleDragEnd}
 onTap={handleTap}
 className={cn(
 "absolute inset-0 z-50 touch-none",
 isDragging ? "cursor-grabbing" : "cursor-pointer"
 )}
 />
 </div>

 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50 pointer-events-none">
 {shops.map((_, idx) => {
 const length = shops.length;
 const normalizedActiveIndex = ((activeIndex % length) + length) % length;
 return (
 <div
 key={idx}
 className={cn(
 "h-1 rounded-full ",
 normalizedActiveIndex === idx
 ? "w-6 "
 : "w-1.5 bg-white/20"
 )}
 />
 );
 })}
 </div>
 </div>
 );
};
