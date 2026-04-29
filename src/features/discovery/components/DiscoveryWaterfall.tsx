"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/shared/GlassCard";
import { Heart, MessageCircle, Play, Image as ImageIcon } from "lucide-react";
import { DiscoveryItem } from "../types";
import { cn } from "@/utils/cn";
import Image from "next/image";
import { useVisualSettings } from "@/hooks/useVisualSettings";

interface DiscoveryWaterfallProps {
 items: DiscoveryItem[];
 onItemClick?: (item: DiscoveryItem) => void;
}

// 虚拟卡片包裹器：通过 IntersectionObserver 动态卸载屏幕外的重型 DOM
const VirtualCardWrapper = ({ item, children }: { item: DiscoveryItem, children: React.ReactNode }) => {
 const ref = useRef<HTMLDivElement>(null);
 const observerRef = useRef<IntersectionObserver | null>(null);
 const [isVisible, setIsVisible] = useState(true);

 useEffect(() => {
 if (!ref.current) return;
 
 // 强制先显示，防止首次进入时由于 display: none 到 block 的切换导致 Observer 失效
 // 使用 requestAnimationFrame 确保 DOM 已经完全挂载并渲染
 const rAF = requestAnimationFrame(() => {
 const observer = new IntersectionObserver(
 ([entry]) => {
 // 扩大缓冲区域，提前加载，防止滑动过快出现白块
 // 只有在明确离开视口很远时才卸载，进入视口或靠近视口时都保持渲染
 if (entry.isIntersecting) {
 setIsVisible(true);
 }
 },
 { rootMargin: "600px" } 
 );
 
 if (ref.current) {
 observer.observe(ref.current);
 ref.current.dataset.observerAttached = 'true';
 }
 
 // 保存 observer 以便清理
 observerRef.current = observer;
 });

 return () => {
 cancelAnimationFrame(rAF);
 if (observerRef.current) {
 observerRef.current.disconnect();
 }
 };
 }, []);

 return (
 <div ref={ref} className="break-inside-avoid mb-4" style={{ minHeight: `${(1 / item.aspectRatio) * 100 + 100}px` }}>
 {isVisible ? children : null}
 </div>
 );
};

export const DiscoveryWaterfall = ({ 
 items, 
 onItemClick 
}: DiscoveryWaterfallProps) => {
 const [mounted] = useState(() => typeof window !== "undefined");

 if (!mounted) return null;

 return (
 <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
 {items.map((item) => (
 <VirtualCardWrapper key={item.id} item={item}>
 <motion.div
 
 
 // 限制最大延迟时间
 >
 <DiscoveryCard item={item} onClick={() => onItemClick?.(item)} />
 </motion.div>
 </VirtualCardWrapper>
 ))}
 </div>
 );
};

const DiscoveryCard = ({ item, onClick }: { item: DiscoveryItem; onClick?: () => void }) => {
 const [isHovered, setIsHovered] = useState(false);
 const isAuthorAvatarLocal = item.author.avatarUrl?.startsWith("data:") || item.author.avatarUrl?.startsWith("blob:");
 const { settings } = useVisualSettings();
 const isLight = settings.frontendBgIndex !== 0;

 return (
 <GlassCard 
 hoverGlow={false}
 className={cn("p-0 overflow-hidden cursor-pointer group mb-4 border", isLight ? "border-black/5 bg-black/[0.03]" : "border-white/5 bg-white/[0.03]")}
 >
 <div 
 className={cn("relative overflow-hidden", isLight ? "bg-black/5" : "bg-white/5")}
 onMouseEnter={() => setIsHovered(true)}
 onMouseLeave={() => setIsHovered(false)}
 onClick={onClick}
 >
 {/* 媒体占位符 - 模拟加载中或 CDN 链接 */}
 <div 
 style={{ paddingBottom: `${(1 / item.aspectRatio) * 100}%` }}
 className="w-full relative"
 >
 <Image
 src={item.mediaUrl}
 alt={item.title}
 fill
 sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
 className={cn(
 "absolute inset-0 w-full h-full object-cover ",
 isHovered ? "scale-110" : "scale-100"
 )}
 />
 
 {/* 媒体类型标识 - 统一白色风格 */}
 <div className="absolute top-2 right-2 p-1.5 rounded-full border bg-black/40 border-white/10">
 {item.mediaType === 'video' ? (
 <Play className="w-3 h-3 text-white fill-white" />
 ) : (
 <ImageIcon className="w-3 h-3 text-white" />
 )}
 </div>

 {/* 覆盖层信息 (Hover) - 顶级抖音级修复：永远使用黑色渐变和白字 */}
 <div className={cn(
 "absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4 pointer-events-none",
 isHovered ? "opacity-100" : "opacity-0"
 )}>
 <div className="flex items-center gap-2 mb-2 pointer-events-auto">
 <div className="w-6 h-6 rounded-full border overflow-hidden border-white/20 bg-black/40">
 {item.author.avatarUrl ? (
 <Image
 src={item.author.avatarUrl}
 alt={item.author.name}
 width={24}
 height={24}
 className="w-full h-full object-cover"
 unoptimized={isAuthorAvatarLocal}
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center text-[11px] text-white">
 {item.author.name[0]}
 </div>
 )}
 </div>
 <span className="text-[11px] font-medium text-white">{item.author.name}</span>
 </div>
 </div>
 </div>
 </div>

 {/* 基础信息 */}
 <div className="p-3 space-y-2">
 <h4 className={cn("text-xs leading-snug line-clamp-2 ", isLight ? "text-black group-hover:text-black" : "text-white group-hover:text-white")}>
 {item.title}
 </h4>
 
 <div className={cn("flex items-center justify-between text-[11px] ", isLight ? "text-black" : "text-white")}>
 <div className="flex items-center gap-3">
 <div className={cn("flex items-center gap-1 ", isLight ? "hover:text-black" : "hover:text-white")}>
 <Heart className="w-3 h-3" />
 <span>{item.stats.likes}</span>
 </div>
 <div className={cn("flex items-center gap-1 ", isLight ? "hover:text-black" : "hover:text-white")}>
 <MessageCircle className="w-3 h-3" />
 <span>{item.stats.comments}</span>
 </div>
 </div>
 <div className={cn("px-1.5 py-0.5 rounded border uppercase tracking-tighter text-[11px]", isLight ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10")}>
 {item.category}
 </div>
 </div>
 </div>
 </GlassCard>
 );
};
