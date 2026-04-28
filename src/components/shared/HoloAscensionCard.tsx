import { Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { useTranslations } from "next-intl";

interface HoloAscensionCardProps {
  onClick?: () => void;
  className?: string;
}

export function HoloAscensionCard({ onClick, className }: HoloAscensionCardProps) {
    const t = useTranslations('HoloAscensionCard');
  return (
    // 世界顶端：全息棱镜 (Holo-Prism) 赛博流光入驻卡片
    <div 
      onClick={onClick} 
      className={cn(
        "group relative rounded-xl p-[1.5px] cursor-pointer transition-all duration-700 hover:scale-[1.02]  w-full",
        className
      )}
    >
      {/* 1. 七彩流光跑马灯边框 (底层动态渐变背景) */}
      <div className="absolute inset-0 rounded-xl bg-[linear-gradient(90deg,#ff0000,#ff7300,#fffb00,#48ff00,#00ffd5,#002bff,#7a00ff,#ff00c8,#ff0000)] bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]" />
      
      {/* 2. 内部核心黑胆 (遮罩底层，留出边框缝隙) */}
      <div className="relative z-10 w-full h-full bg-black/80  rounded-[10px] overflow-hidden flex items-center justify-between p-5">
        
        {/* 内部极微弱的流光氛围背景 */}
        <div className="absolute inset-0 bg-gradient-to-r    bg-[length:200%_auto] animate-[shimmer_5s_linear_infinite]  pointer-events-none" />

        <div className="relative z-20 flex items-center gap-5">
          {/* Icon 容器：悬浮多色发光 */}
          <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 group-hover:border-transparent transition-all duration-500 shrink-0">
            {/* 旋转的光晕底座 */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r    animate-spin-slow opacity-0 group-hover:opacity-100 transition-opacity duration-700 " />
            <div className="absolute inset-[1px] rounded-full bg-black z-10" />
            <Sparkles className="relative z-20 w-4 h-4 text-white  transition-colors duration-500" />
          </div>

          {/* 文本区：动态渐变流光文字 */}
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-bold tracking-widest bg-clip-text text-transparent bg-gradient-to-r    bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]  pr-1">
              {t('txt_bf27a7')}</h3>
            <p className="text-[10px] font-mono text-white tracking-[0.15em] group-hover:text-white transition-colors duration-500 line-clamp-1">
              {t('txt_54a5fb')}</p>
          </div>
        </div>

        {/* 右侧流光指示器 */}
        <div className="relative z-20 w-8 h-8 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors duration-500 shrink-0">
          <ArrowRight className="w-4 h-4 text-white group-hover:text-white group-hover:translate-x-1.5 transition-all duration-500" />
        </div>
      </div>
    </div>
  );
}
