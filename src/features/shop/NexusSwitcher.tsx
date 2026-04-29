"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useShop } from "./ShopContext";
import { Store, CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { useTranslations } from "next-intl";

export const NexusSwitcher = () => {
 const t = useTranslations('NexusSwitcher');
 const { activeShopId, setActiveShopId, availableShops } = useShop();
 const [isOpen, setIsOpen] = useState(false);

 // If there's 0 or 1 shop, there's no need to show the switcher
 if (availableShops.length <= 1) return null;

 const activeShop = availableShops.find(s => s.shopId === activeShopId);

 return (
 <div className="relative z-50 flex items-center">
 <button
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 setIsOpen(!isOpen);
 }}
 className="flex items-center text-[11px] uppercase tracking-widest text-gx-cyan/60 hover:text-gx-cyan group"
 >
 <span className="truncate max-w-[120px]">{activeShop?.shopName || "联邦星云"}</span>
 </button>

 <AnimatePresence>
 {isOpen && (
 <motion.div
 
 
 
 className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-64 bg-black/80 border border-white/10 backdrop-blur-xl rounded-xl p-2 shadow-[0_0_30px_rgba(0,0,0,0.8)]"
 >
 <div className="px-3 py-2 border-b border-white/5 mb-2">
 <span className="text-[11px] text-white uppercase tracking-widest ">{t('txt_e628fe')}</span>
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
 "w-full flex items-center justify-between p-3 rounded-lg text-left ",
 activeShopId === shop.shopId 
 ? "bg-gx-cyan/10 border border-gx-cyan/30 text-white" 
 : "hover:bg-white/5 border border-transparent text-white hover:text-white"
 )}
 >
 <div className="flex items-center gap-3">
 <Store className={cn("w-4 h-4", activeShopId === shop.shopId ? "text-gx-cyan" : "text-white")} />
 <div className="flex flex-col">
 <span className="text-xs truncate max-w-[120px]">{shop.shopName || "未知节点"}</span>
 <span className="text-[11px] text-white uppercase">{shop.role} | {shop.industry}</span>
 </div>
 </div>
 {activeShopId === shop.shopId && <CheckCircle2 className="w-4 h-4 text-gx-cyan" />}
 </button>
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
};