"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useShop } from "@/features/shop/ShopContext";
import { useRouter } from "next/navigation";
import { Zap, Store } from "lucide-react";
import { cn } from "@/utils/cn";

export const GlobalWormholeCapsule = () => {
  const { availableShops, setActiveShopId, activeShopId } = useShop();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const capsuleRef = useRef<HTMLDivElement>(null);

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

  // Determine glow colors based on the highest role (boss > merchant)
  const isBoss = availableShops.some(s => s.role === 'boss');
  
  // Boss = Amber/Gold glow, Merchant = Cyan glow
  const glowColorHex = isBoss ? "rgba(245,158,11,0.6)" : "rgba(0,242,255,0.6)"; 
  const borderColorClass = isBoss ? "border-amber-500/50" : "border-gx-cyan/50";
  const textColorClass = isBoss ? "text-amber-500" : "text-gx-cyan";

  const handleShopClick = (shop: typeof availableShops[0]) => {
    setActiveShopId(shop.shopId);
    setIsOpen(false);
    // 精准折跃：跳转到对应行业的日历
    router.push(`/calendar/${shop.industry || 'beauty'}`);
  };

  return (
    <div ref={capsuleRef} className="fixed right-4 bottom-24 z-[9999] flex flex-col items-end">
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
        onClick={() => setIsOpen(!isOpen)}
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
          className="absolute inset-0 rounded-full animate-pulse opacity-40"
          style={{ boxShadow: `0 0 20px ${glowColorHex}` }}
        />
        <Zap className="w-5 h-5 relative z-10 drop-shadow-md" />
      </button>
    </div>
  );
};
