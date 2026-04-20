"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useShop } from "@/features/shop/ShopContext";
import { Zap, Store } from "lucide-react";
import { cn } from "@/utils/cn";
import { useViewStack } from "@/hooks/useViewStack";
import { useSubscriptionTimer } from "@/hooks/useSubscriptionTimer";

export const GlobalWormholeCapsule = () => {
  const { availableShops, setActiveShopId, activeShopId, subscription } = useShop();
  const { remainingTime, remainingMilliseconds } = useSubscriptionTimer();
  const { setActiveTab } = useViewStack();
  const [isOpen, setIsOpen] = useState(false);
  const capsuleRef = useRef<HTMLDivElement>(null);
  
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
  const glowColorHex = isEmergency ? "rgba(239,68,68,0.8)" : isBoss ? "rgba(245,158,11,0.6)" : "rgba(0,242,255,0.6)"; 
  const borderColorClass = isEmergency ? "border-red-500/80" : isBoss ? "border-amber-500/50" : "border-gx-cyan/50";
  const textColorClass = isEmergency ? "text-red-500" : isBoss ? "text-amber-500" : "text-gx-cyan";

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
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="mb-4 w-56 rounded-2xl border border-white/20 bg-transparent backdrop-blur-xl p-2 flex flex-col gap-2"
            style={{ boxShadow: `0 0 30px rgba(0,0,0,0.8), inset 0 0 10px ${glowColorHex}` }}
          >
            <div className="px-2 py-1 border-b border-white/10 mb-1">
              <span className="text-[10px] text-white/40 tracking-widest font-mono uppercase">折跃枢纽 / Nexus</span>
            </div>
            <div className="max-h-[50vh] overflow-y-auto scrollbar-hide flex flex-col gap-1.5">
              {availableShops.map(shop => {
                const isSelected = activeShopId === shop.shopId;
                const activeItemColor = shop.role === 'boss' 
                  ? "border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]" 
                  : "border-gx-cyan shadow-[0_0_10px_rgba(0,242,255,0.3)]";
                const itemTextColor = shop.role === 'boss' ? "text-amber-500" : "text-gx-cyan";

                return (
                  <button
                    key={shop.shopId}
                    onClick={() => handleShopClick(shop)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border bg-transparent transition-all duration-300 group",
                      isSelected
                        ? activeItemColor
                        : "border-white/10 hover:border-white/30 hover:bg-white/5"
                    )}
                  >
                    <Store className={cn("w-4 h-4 transition-colors", isSelected ? itemTextColor : "text-white/30 group-hover:text-white/60")} />
                    <div className="flex flex-col items-start text-left">
                      <span className={cn(
                        "text-xs font-bold tracking-wider truncate max-w-[120px]", 
                        isSelected ? "text-white" : "text-white/60 group-hover:text-white"
                      )}>
                        {shop.shopName || "未知节点"}
                      </span>
                      <span className="text-[9px] font-mono text-white/30 uppercase mt-0.5">
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
          "w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-500 relative",
          borderColorClass,
          textColorClass,
          isOpen ? "bg-white/10 scale-95" : "bg-transparent hover:scale-105"
        )}
        style={{ boxShadow: `0 0 15px ${glowColorHex}` }}
      >
        {/* 呼吸光效底层 - 纯靠发光特征色彰显存在感 */}
        <div 
          className={cn(
            "absolute inset-0 rounded-full opacity-40",
            isEmergency ? "animate-ping" : "animate-pulse"
          )}
          style={{ boxShadow: `0 0 20px ${glowColorHex}` }}
        />
        <Zap className={cn("w-5 h-5 relative z-10 drop-shadow-md", isEmergency && "animate-bounce")} />
      </button>

      {/* 终极警告浮窗：仅在倒计时最后5分钟或过期时显示 */}
      <AnimatePresence>
        {isEmergency && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-16 top-1/2 -translate-y-1/2 bg-red-950/80 border border-red-500/50 backdrop-blur-xl px-4 py-2 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.5)] whitespace-nowrap"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-bold tracking-widest text-red-100">
              {remainingTime === "MEMBERSHIP_EXPIRED" ? "会员已到期" : `即将到期 ${remainingTime}`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
