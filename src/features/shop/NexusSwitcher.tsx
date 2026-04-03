"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useShop } from "./ShopContext";
import { Zap, ChevronDown, Store, CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/cn";

export const NexusSwitcher = () => {
  const { activeShopId, setActiveShopId, availableShops } = useShop();
  const [isOpen, setIsOpen] = useState(false);

  // If there's 0 or 1 shop, there's no need to show the switcher
  if (availableShops.length <= 1) return null;

  const activeShop = availableShops.find(s => s.shopId === activeShopId);

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-black/40 border border-white/10 rounded-full backdrop-blur-md hover:bg-white/5 hover:border-gx-purple/50 transition-all"
      >
        <Zap className="w-4 h-4 text-gx-purple drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
        <span className="text-xs font-mono tracking-widest text-white/80">
          {activeShop?.shopName || "联邦星云 / Nexus"}
        </span>
        <ChevronDown className={cn("w-3 h-3 text-white/40 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-3 w-64 bg-black/80 border border-white/10 backdrop-blur-xl rounded-xl p-2 shadow-[0_0_30px_rgba(0,0,0,0.8)]"
          >
            <div className="px-3 py-2 border-b border-white/5 mb-2">
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">联邦矩阵节点 / Nexus Nodes</span>
            </div>
            <div className="space-y-1 max-h-[50vh] overflow-y-auto scrollbar-hide">
              {availableShops.map((shop) => (
                <button
                  key={shop.shopId}
                  onClick={() => {
                    setActiveShopId(shop.shopId);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all",
                    activeShopId === shop.shopId 
                      ? "bg-gx-purple/10 border border-gx-purple/30 text-white" 
                      : "hover:bg-white/5 border border-transparent text-white/60 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Store className={cn("w-4 h-4", activeShopId === shop.shopId ? "text-gx-purple" : "text-white/40")} />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold truncate max-w-[120px]">{shop.shopName || "未知节点"}</span>
                      <span className="text-[9px] font-mono text-white/30 uppercase">{shop.role} | {shop.industry}</span>
                    </div>
                  </div>
                  {activeShopId === shop.shopId && <CheckCircle2 className="w-4 h-4 text-gx-purple drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};