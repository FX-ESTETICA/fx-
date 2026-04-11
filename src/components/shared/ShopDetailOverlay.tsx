import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, MapPin } from "lucide-react";
import Image from "next/image";
import { AiBookingAssistant } from "./AiBookingAssistant";

interface ShopDetailOverlayProps {
  shop: any | null;
  onClose: () => void;
}

export function ShopDetailOverlay({ shop, onClose }: ShopDetailOverlayProps) {
  const [isAiOpen, setIsAiOpen] = useState(false);
  
  if (!shop) return null;

  const config = shop.config || {};

  const coverImages = config.coverImages || ["https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=2070&auto=format&fit=crop"];
  const capsules = config.capsules || [];
  const slogan = config.slogan || "探索数字宇宙边界";

  // 移除传统的路由跳转，改为直接唤起 AI 管家
  const handleOpenAi = (serviceName?: string) => {
    // 后续可以把 serviceName 传给 AiBookingAssistant 作为初始意图
    setIsAiOpen(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[999] bg-black"
      >
        {/* 背景光晕 (固定不随滚动条移动) */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,240,255,0.15)_0%,transparent_70%)]" />
        </div>

        {/* 独立的滚动容器：将 fixed 与 absolute 降维风险隔离 */}
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden no-scrollbar">
          {/* 整个页面内容容器 (随滚动条移动) */}
          <div className="relative w-full min-h-screen flex flex-col z-10 pb-32">
          
          {/* 顶部巨幅海报 (Cover) */}
          <div className="relative w-full h-[60vh] md:h-[70vh] shrink-0">
            <div className="flex w-full h-full snap-x snap-mandatory overflow-x-auto no-scrollbar">
              {coverImages.map((img: string, i: number) => (
                <div key={i} className="relative w-full h-full shrink-0 snap-start">
                  <Image
                    src={img}
                    alt={`${shop.name} cover ${i + 1}`}
                    fill
                    className="object-cover opacity-90"
                  />
                  {/* 海报底部的深邃暗场过渡，平滑融入下方黑底 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                </div>
              ))}
            </div>
            
            {/* 品牌信息沉降在海报底部 */}
            <div className="absolute bottom-8 left-6 right-6 flex flex-col items-start">
              <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(0,0,0,1)]">
                {shop.name}
              </h2>
              <div className="text-gx-cyan font-mono text-[12px] md:text-sm tracking-widest uppercase mt-3 drop-shadow-[0_0_10px_rgba(0,0,0,1)]">
                {slogan}
              </div>
            </div>
          </div>

          {/* 下方详情流 (Services & Info) */}
          <div className="w-full px-6 md:px-12 py-10 space-y-12 max-w-7xl mx-auto">
            
            {/* 核心引流胶囊阵列 */}
            <div className="space-y-5">
              <h3 className="text-[12px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-4 bg-gx-cyan" />
                特权服务 / Exclusive Services
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {capsules.map((cap: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => handleOpenAi(cap.label || cap.name)}
                    className="flex flex-col items-start p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-gx-cyan/50 hover:bg-gx-cyan/10 transition-all group w-full text-left"
                  >
                    <span className="text-base font-bold text-white group-hover:text-gx-cyan transition-colors line-clamp-2 leading-snug">
                      {cap.label || cap.name}
                    </span>
                    {cap.price && (
                      <span className="text-sm font-mono text-gx-gold mt-3">
                        ¥{cap.price}
                      </span>
                    )}
                  </button>
                ))}
                {capsules.length === 0 && (
                  <span className="text-sm text-white/20 font-mono col-span-full">未配置特权服务</span>
                )}
              </div>
            </div>

            {/* 门店物理坐标 */}
            <div className="space-y-5">
              <h3 className="text-[12px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-4 bg-gx-cyan" />
                节点坐标 / Location
              </h3>
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 w-full">
                <MapPin className="w-6 h-6 text-gx-cyan shrink-0" />
                <span className="text-base text-white/80 font-mono line-clamp-3 leading-relaxed">
                  {config.location?.address || "星空坐标未公开"}
                </span>
              </div>
            </div>
            
            {/* 预留的空间，防止内容到底部太挤 */}
            <div className="h-10" />
          </div>
        </div>
        {/* === 结束独立的滚动容器 === */}
        </div>

        {/* 悬浮关闭按钮 (位于独立滚动层之上，不受滚动影响) */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-3 rounded-full bg-black/40 border border-white/10 text-white/80 hover:text-white hover:bg-black/60 transition-all z-50 backdrop-blur-xl"
        >
          <X className="w-6 h-6" />
        </button>

        {/* 绝对底部的吸附预约按钮 (不受滚动条影响，永远悬浮) */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-[env(safe-area-inset-bottom,24px)] md:px-12 bg-gradient-to-t from-black via-black/90 to-transparent z-50 pointer-events-none">
          <button
            onClick={() => setIsAiOpen(true)}
            className="w-full md:max-w-md mx-auto py-5 rounded-full bg-gradient-to-r from-gx-cyan to-blue-500 text-black font-black text-base tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform shadow-[0_0_30px_rgba(0,240,255,0.4)] pointer-events-auto"
          >
            <Sparkles className="w-5 h-5" />
            AI 智能管家预约
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
