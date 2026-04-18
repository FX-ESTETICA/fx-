import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface GxProCardProps {
  shop: any;
  onClick: () => void;
  index?: number;
}

export function GxProCard({ shop, onClick, index = 0 }: GxProCardProps) {
    const t = useTranslations('GxProCard');
  const config = shop.config || {};
  const coverImage = config.coverImages?.[0] || "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=2070&auto=format&fit=crop";
  const slogan = config.slogan || "探索数字宇宙边界";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index % 5) * 0.05 }}
      onClick={onClick}
      className="cursor-pointer relative w-full aspect-[16/9] rounded-3xl overflow-hidden group border border-yellow-500/20 hover:border-yellow-500/50 transition-all duration-500 shrink-0"
    >
      {/* 边缘流光边框效果 */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />

      {/* 背景图 */}
      <Image
        src={coverImage}
        alt={shop.name || "GX PRO 节点"}
        fill
        sizes="(max-width: 768px) 100vw, 800px"
        className="object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700 group-hover:scale-105"
        priority={index < 4}
        loading={index < 4 ? "eager" : "lazy"}
      />

      {/* 纯黑渐变暗场 (更深邃的底部) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

      {/* 右上角信标 (GX PRO 官方认证) */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded border border-yellow-500/30 z-10 pointer-events-none shadow-[0_0_15px_rgba(255,215,0,0.2)]">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
        <span className="text-[10px] font-black text-yellow-500 tracking-widest uppercase drop-shadow-[0_0_5px_rgba(255,215,0,0.8)]">{t('txt_53a12c')}</span>
      </div>

      {/* 底部内容区 */}
      <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between z-20 pointer-events-none">
        
        {/* 左下角：名字 + Slogan */}
        <div className="flex flex-col items-start gap-1 max-w-[65%]">
          <h3 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,1)] text-white line-clamp-1">
            {shop.name}
          </h3>
          <p className="text-xs font-mono text-white/70 tracking-widest line-clamp-1 uppercase">
            {slogan}
          </p>
        </div>
        
        {/* 右下角：立即预约按钮 */}
        <div className="shrink-0 flex items-center gap-1.5 text-yellow-400 font-bold text-xs bg-yellow-500/10 px-4 py-2 rounded-full border border-yellow-500/30 backdrop-blur-md transition-colors shadow-[0_0_15px_rgba(255,215,0,0.15)] pointer-events-auto">
          <span>{t('txt_3ed720')}</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>

      </div>
    </motion.div>
  );
}
