"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useShop } from "@/features/shop/ShopContext";
import { Zap, Store } from "lucide-react";
import { cn } from "@/utils/cn";
import { useViewStack } from "@/hooks/useViewStack";
import { useSubscriptionTimer } from "@/hooks/useSubscriptionTimer";
import { useVisualSettings } from "@/hooks/useVisualSettings";
import { usePathname } from "next/navigation";
import { useActiveTab } from "@/hooks/useActiveTab";

export const GlobalWormholeCapsule = () => {
 const { availableShops, setActiveShopId, activeShopId, subscription } = useShop();
 const { remainingTime, remainingMilliseconds } = useSubscriptionTimer();
 const { setActiveTab } = useViewStack();
 const [isOpen, setIsOpen] = useState(false);
 const capsuleRef = useRef<HTMLDivElement>(null);
 const { settings } = useVisualSettings();
 const pathname = usePathname();
 const activeTab = useActiveTab();

 // 动态嗅探当前环境：前端 vs 日历
 const isCalendar = activeTab === "calendar" || pathname?.startsWith("/calendar");
 const isLight = isCalendar 
 ? settings.calendarBgIndex !== 0 
 : settings.frontendBgIndex !== 0;
 
 // 拖拽防误触系统
 const isDragging = useRef(false);

 // Click outside to close
 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (capsuleRef.current && !capsuleRef.current.contains(event.target as Node)) {
 setIsOpen(false);
 }
 };
 document.addEventListener("mousedown", handleClickOutside);
 return () => document.removeEventListener("mousedown", handleClickOutside);
 }, []);

 if (!availableShops || availableShops.length === 0) return null;

 // 新增逻辑：如果订阅即将到期（< 5分钟）或者已过期，则强制显示红色警告胶囊
 const isEmergency = subscription.subscriptionTier !== 'FREE' && 
 (remainingTime === "MEMBERSHIP_EXPIRED" || 
 (remainingMilliseconds !== null && remainingMilliseconds < 5 * 60 * 1000));

 // Determine glow colors based on the highest role (boss > merchant)
 const isBoss = availableShops.some(s => s.role === 'boss');
 
 // 红色警报覆盖逻辑
  const glowColorHex = isEmergency 
    ? (isLight ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.8)")
    : isBoss 
    ? (isLight ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.6)")
    : (isLight ? "rgba(0,242,255,0.4)" : "rgba(0,242,255,0.6)");

  const borderColorClass = isEmergency 
    ? (isLight ? "border-red-500/50" : "border-red-500/80")
    : isBoss 
    ? (isLight ? "border-amber-500/30" : "border-amber-500/50")
    : (isLight ? "border-cyan-500/40" : "border-cyan-500/40");

  const textColorClass = isEmergency 
    ? (isLight ? "text-red-500" : "text-red-500")
    : isBoss 
    ? (isLight ? "text-amber-600" : "text-amber-500")
    : (isLight ? "text-cyan-500" : "text-cyan-400");

 const handleShopClick = (shop: typeof availableShops[0]) => {
 setActiveShopId(shop.shopId);
 setIsOpen(false);
 // 精准折跃：瞬间切换到对应行业的日历
 setActiveTab('calendar', { industry: shop.industry || 'beauty' });
 };

 return (
 <motion.div 
 ref={capsuleRef} 
 className="fixed right-4 bottom-24 z-[9999] flex flex-col items-end"
 drag
 dragConstraints={{ left: -window.innerWidth + 60, right: 0, top: -window.innerHeight + 100, bottom: 0 }}
 dragElastic={0.1}
 dragMomentum={false}
 onDragStart={() => {
 isDragging.current = true;
 }}
 onDragEnd={() => {
 // 给一个微小的延迟，确保 onClick 能读到 true，然后再重置
 setTimeout(() => {
 isDragging.current = false;
 }, 100);
 }}
 whileDrag={{ scale: 1.05, opacity: 0.9 }}
 >
 <AnimatePresence>
 {isOpen && (
 <motion.div
 
 
 
 
 className={cn(
 "mb-4 w-56 rounded-2xl border p-2 flex flex-col gap-2 backdrop-blur-md",
 isLight 
 ? "bg-transparent border-cyan-500/30 shadow-[0_0_15px_rgba(0,242,255,0.15)]" 
 : "bg-transparent border-cyan-500/30"
 )}
 style={isLight ? undefined : { boxShadow: `inset 0 0 10px ${glowColorHex}` }}
 >
 <div className="max-h-[50vh] overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [scrollbar-width:none] flex flex-col gap-1.5">
 {availableShops.map(shop => {
 const isSelected = activeShopId === shop.shopId;
 const activeItemColor = shop.role === 'boss' 
 ? (isLight ? "border-amber-400 bg-transparent shadow-[0_0_10px_rgba(245,158,11,0.15)]" : "border-amber-500 bg-transparent shadow-[0_0_10px_rgba(245,158,11,0.2)]")
 : (isLight ? "border-cyan-400 bg-transparent shadow-[0_0_10px_rgba(0,242,255,0.15)]" : "border-cyan-500 bg-transparent shadow-[0_0_10px_rgba(0,242,255,0.2)]");
 const itemTextColor = shop.role === 'boss' 
 ? (isLight ? "text-amber-600" : "text-amber-400") 
 : (isLight ? "text-cyan-600" : "text-cyan-400");

 return (
 <button
 key={shop.shopId}
 onClick={() => handleShopClick(shop)}
 className={cn(
 "w-full flex items-center gap-3 p-3 rounded-xl border group transition-all",
 isSelected
 ? activeItemColor
 : isLight 
 ? "border-transparent bg-transparent hover:border-cyan-500/30" 
 : "border-transparent bg-transparent hover:border-cyan-500/30"
 )}
 >
 <Store className={cn("w-4 h-4 transition-colors", isSelected ? itemTextColor : (isLight ? "text-black group-hover:text-cyan-600" : "text-white group-hover:text-cyan-400"))} />
 <div className="flex flex-col items-start text-left">
 <span className={cn(
 "text-xs tracking-wider truncate max-w-[120px] transition-colors", 
 isSelected 
 ? itemTextColor 
 : (isLight ? "text-black group-hover:text-cyan-600" : "text-white group-hover:text-cyan-400")
 )}>
 {shop.shopName || "未知节点"}
 </span>
 <span className={cn("text-[11px] uppercase mt-0.5 transition-colors", isSelected ? itemTextColor : (isLight ? "text-black/60 group-hover:text-cyan-600/70" : "text-white/60 group-hover:text-cyan-400/70"))}>
 {shop.industry || 'UNKNOWN'}
 </span>
 </div>
 </button>
 );
 })}
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 <button
 onPointerDown={() => {
 // 记录按下时刻
 isDragging.current = false;
 }}
 onClick={(e) => {
 // 极简防误触：如果在拖拽则丢弃点击事件
 if (isDragging.current) {
 e.stopPropagation();
 return;
 }
 setIsOpen(!isOpen);
 }}
 className={cn(
          "w-12 h-12 rounded-full border flex items-center justify-center relative bg-transparent hover:scale-105",
          borderColorClass,
          textColorClass,
          isOpen && "scale-95"
        )}
 style={isLight && !isEmergency ? undefined : { boxShadow: `0 0 15px ${glowColorHex}` }}
 >
 {/* 呼吸光效底层 - 纯靠发光特征色彰显存在感 */}
 <div 
 className={cn(
 "absolute inset-0 rounded-full",
 isLight ? "" : "",
 isEmergency ? "animate-ping" : (isLight ? "animate-none" : "")
 )}
 style={isLight && !isEmergency ? undefined : { boxShadow: `0 0 20px ${glowColorHex}` }}
 />
 <Zap className={cn("w-5 h-5 relative z-10", isLight ? "" : "", isEmergency && "")} />
 </button>

 {/* 终极警告浮窗：仅在倒计时最后5分钟或过期时显示 */}
 <AnimatePresence>
 {isEmergency && (
 <motion.div
 
 
 
 className={cn(
 "absolute right-16 top-1/2 -translate-y-1/2 px-4 py-2 rounded-full flex items-center gap-3 whitespace-nowrap",
 isLight 
 ? "bg-red-50 border border-red-200 " 
 : "bg-red-950/80 border border-red-500/50 "
 )}
 >
 <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
 <span className={cn("text-xs tracking-widest", isLight ? "text-red-600" : "text-red-100")}>
 {remainingTime === "MEMBERSHIP_EXPIRED" ? "会员已到期" : `即将到期 ${remainingTime}`}
 </span>
 </motion.div>
 )}
 </AnimatePresence>
 </motion.div>
 );
};
