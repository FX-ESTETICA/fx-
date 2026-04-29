import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { AiBookingAssistant } from "./AiBookingAssistant";
import { useTranslations } from "next-intl";
import { cn } from "@/utils/cn";
import { BookingService } from "@/features/booking/api/booking";

import { ShopDetailView } from "./ShopDetailView";
import { useHardwareBack } from "@/hooks/useHardwareBack";

interface ShopDetailOverlayProps {
 shop: any | null;
 onClose: () => void;
}

export function ShopDetailOverlay({ shop, onClose }: ShopDetailOverlayProps) {
 const t = useTranslations('ShopDetailOverlay');
 const [isAiOpen, setIsAiOpen] = useState(false);
 const [realtimeConfig, setRealtimeConfig] = useState<any>(null);

 const registerBack = useHardwareBack(state => state.register);
 const unregisterBack = useHardwareBack(state => state.unregister);

 useEffect(() => {
 if (shop) {
 registerBack('shop-detail-overlay', () => {
 onClose();
 return true;
 }, 30);
 } else {
 unregisterBack('shop-detail-overlay');
 }
 return () => unregisterBack('shop-detail-overlay');
 }, [shop, onClose, registerBack, unregisterBack]);

 useEffect(() => {
 if (!shop?.id) return;
 
 // 初始化同步
 setRealtimeConfig(shop.config || {});

 // 挂载实时配置雷达
 const channel = BookingService.subscribeToShopConfig(shop.id, (payload) => {
 const newConfig = payload.new?.config as any;
 if (newConfig) {
 setRealtimeConfig(newConfig);
 }
 });

 return () => {
 if (channel) BookingService.unsubscribe(channel);
 };
 }, [shop?.id, shop?.config]);
 
 if (!shop) return null;

 const config = realtimeConfig || shop.config || {};

 const coverImages = config.coverImages || ["https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=2070&auto=format&fit=crop"];
 const capsules = config.capsules || [];
 const slogan = config.slogan || "探索数字宇宙边界";
 const storeStatus = config.storeStatus || 'open';
 const hours = config.hours || [];

 // 移除传统的路由跳转，改为直接唤起 AI 管家
 const handleOpenAi = (_serviceName?: string) => {
 if (storeStatus !== 'open') return; // 如果关门，拦截服务胶囊点击
 // 后续可以把 serviceName 传给 AiBookingAssistant 作为初始意图
 setIsAiOpen(true);
 };

 return (
 <AnimatePresence>
 <motion.div
 
 
 
 
 className="fixed inset-0 z-[999] bg-black"
 >
 {/* 背景光晕 (固定不随滚动条移动) */}
 <div className="absolute inset-0 pointer-events-none z-0">
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,240,255,0.15)_0%,transparent_70%)]" />
 </div>

 {/* 独立的滚动容器：将 fixed 与 absolute 降维风险隔离 */}
 <div className="absolute inset-0 overflow-y-auto overflow-x-hidden no-scrollbar">
 {/* 整个页面内容容器 (随滚动条移动) */}
 <div className="relative w-full min-h-[100dvh] flex flex-col z-10 pb-32 md:pb-0 bg-[#0a0a0a]">
 <ShopDetailView 
 coverImages={coverImages}
 storeName={shop.name}
 slogan={slogan}
 location={config.location}
 capsules={capsules}
 onCapsuleClick={handleOpenAi}
 storeStatus={storeStatus}
 hours={hours}
 variant="full"
 hideContent={isAiOpen}
 />
 </div>
 </div>
 {/* === 结束独立的滚动容器 === */}

 {/* 悬浮关闭按钮 (位于独立滚动层之上，不受滚动影响) */}
 <button
 onClick={onClose}
 className={cn(
 "absolute top-[var(--sat)] right-6 p-3 rounded-full bg-black/40 border border-white/10 text-white hover:text-white hover:bg-black/60 z-50",
 isAiOpen && "opacity-0 pointer-events-none"
 )}
 >
 <X className="w-6 h-6" />
 </button>

 {/* 绝对底部的吸附预约按钮 (多端智能自适应：统一避开底部导航栏的高度，宽屏悬浮右下角) */}
 <div className={cn(
 "absolute bottom-[calc(80px+env(safe-area-inset-bottom,0px))] left-0 right-0 p-6 md:left-auto md:w-auto md:right-12 md:p-0 z-[100] pointer-events-none ",
 isAiOpen && "opacity-0"
 )}>
 <button
 onClick={() => {
 if (storeStatus === 'open') {
 setIsAiOpen(true);
 }
 }}
 disabled={storeStatus !== 'open'}
 className={cn(
 "w-full md:w-auto md:px-10 py-4 rounded-full text-base tracking-[0.2em] flex items-center justify-center gap-3 pointer-events-auto",
 storeStatus === 'open' 
 ? "text-blue-400 hover:scale-[1.05] hover:text-blue-300"
 : "text-white cursor-not-allowed"
 )}
 >
 {storeStatus === 'open' && <Sparkles className="w-5 h-5" />}
 {storeStatus === 'open' 
 ? t('txt_2271ab') 
 : storeStatus === 'closed_today' 
 ? '今日关门，暂停预约' 
 : '节假日休假中'}
 </button>
 </div>

 {/* 引入 C 端全息 AI 对话舱 */}
 <AiBookingAssistant 
 isOpen={isAiOpen} 
 onClose={() => setIsAiOpen(false)} 
 shop={shop} 
 />
 </motion.div>
 </AnimatePresence>
 );
}
