import { useState } from "react";
import { ImagePlus, Star, Clock, MapPin, Navigation2, Plus } from "lucide-react";
import { cn } from "@/utils/cn";
import { useTranslations } from "next-intl";

export interface ShopDetailViewProps {
  coverImages: string[];
  storeName: string;
  slogan: string;
  location: { name: string; address?: string; lat: number; lng: number } | null;
  capsules: any[];
  onCapsuleClick?: (capsuleName: string) => void;
  storeStatus?: 'open' | 'closed_today' | 'holiday';
  hours?: any[];
  variant?: 'compact' | 'full';
}

export function ShopDetailView({
  coverImages,
  storeName,
  slogan,
  location,
  capsules,
  onCapsuleClick,
  storeStatus = 'open',
  hours = [],
  variant = 'full'
}: ShopDetailViewProps) {
    const t = useTranslations('ShopDetailView');
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);
  const isCompact = variant === 'compact';

  return (
    <div className={cn("w-full pb-10 bg-[#0a0a0a] min-h-[100dvh]", !isCompact && "md:pb-24")}>
      {/* Detail View Hero Image */}
      <div className={cn("w-full bg-white/5 relative", isCompact ? "aspect-[4/3]" : "h-[40vh] md:h-[60vh]")}>
        {coverImages.length > 0 ? (
          <img src={coverImages[0]} alt="Cover" className="w-full h-full object-cover opacity-90" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 border-b border-white/10">
            <ImagePlus className="w-6 h-6 text-white/20 mb-2" />
            <span className="text-white/20 font-mono text-[10px] tracking-widest">{t('txt_36b5f5')}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/40 to-transparent" />
      </div>

      {/* Main Content Area */}
      <div className={cn(
        "relative z-10",
        isCompact ? "px-5 -mt-12 flex flex-col" : "px-6 md:px-12 max-w-7xl mx-auto -mt-20 md:-mt-32 flex flex-col lg:flex-row gap-8 md:gap-12"
      )}>
        
        {/* 左脑：原生比例画廊 (仅在 Full 模式下展示，Compact 模式下隐藏) */}
        {!isCompact && (
          <div className="hidden lg:block w-full lg:w-[45%] shrink-0">
            <div className="w-full aspect-[3/4] xl:aspect-[4/5] rounded-3xl bg-[#111] border border-white/10 relative overflow-hidden  group sticky top-8 flex items-center justify-center">
              {coverImages.length > 0 ? (
                <img src={coverImages[0]} alt="Gallery" className="w-full h-full object-contain bg-black/50" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                  <ImagePlus className="w-8 h-8 text-white/20 mb-2" />
                  <span className="text-white/20 font-mono text-[10px] tracking-widest">{t('txt_b59359')}</span>
                </div>
              )}
              {/* 画廊顶部光影遮罩 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
              
              {/* SWIPE Badge */}
              <div className="absolute top-6 left-6 px-3 py-1.5 rounded-lg bg-black/40  border border-white/10 text-[10px] font-bold tracking-widest text-white/80 uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
                SWIPE
              </div>

              {/* 指示器 */}
              {coverImages.length > 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  {coverImages.map((_, i) => (
                    <div key={i} className={cn("h-1 rounded-full transition-all", i === 0 ? "w-4 bg-white" : "w-1.5 bg-white/30")} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 右脑：控制舱 + 服务引擎矩阵 */}
        <div className={cn(
          "flex flex-col",
          isCompact ? "w-full" : "w-full lg:w-[55%] gap-8 lg:gap-10"
        )}>
          
          {/* 控制舱 (黑金信息卡片) */}
          <div className="bg-[#111] border border-white/10 rounded-2xl p-5  relative w-full">
          {/* 跨界黑金评分硬币 (The Holographic Rating Coin) */}
          <div className="absolute top-0 right-6 -translate-y-1/2 translate-x-1/2 z-20 flex flex-col items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#2a2a2a] via-black to-[#111] border border-gx-gold/30  cursor-pointer hover:scale-105 hover:border-gx-gold/50 transition-all duration-300 group">
            <Star className="w-3.5 h-3.5 fill-gx-gold text-gx-gold  mb-0.5" />
            <span className="text-gx-gold text-[10px] font-bold font-mono leading-none">5.0</span>
            <div className="absolute inset-0 rounded-full bg-gx-gold/0 group-hover:bg-gx-gold/10 transition-colors duration-500" />
          </div>

          <div className="flex justify-between items-start mb-2 pr-6 pt-2">
            <h1 className="text-2xl font-bold leading-tight text-white truncate w-full">{storeName || "公司名称"}</h1>
          </div>
          
          <p className={cn(
            "text-xs text-transparent bg-clip-text bg-[length:200%_auto] font-medium pb-2",
            slogan ? "bg-gradient-to-r  via-blue-400 " : "bg-gradient-to-r from-white/40 to-white/10"
          )}>
            {slogan || "公司简历"}
          </p>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />

          <div className="flex items-start justify-between text-xs text-white/60 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5  shrink-0" />
              <span className="whitespace-nowrap">{t('txt_cc3307')}</span>
              {hours && hours.length > 0 && (
                <span className="font-mono whitespace-nowrap text-white/80 ml-2">
                  {String(hours[0].start).padStart(2, '0')}:00 - {String(hours[0].end).padStart(2, '0')}:00
                </span>
              )}
            </div>
            <div className={cn(
              "px-2 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider shrink-0 ml-2",
              storeStatus === 'open' ? " " :
              storeStatus === 'closed_today' ? "bg-red-500/20 text-red-500" :
              "bg-yellow-500/20 text-yellow-500"
            )}>
              {storeStatus === 'open' ? 'OPEN' : storeStatus === 'closed_today' ? 'CLOSED' : 'HOLIDAY'}
            </div>
          </div>

          <div 
            className="flex items-start gap-2 text-xs text-white/60 cursor-pointer group"
            onClick={() => setIsAddressExpanded(!isAddressExpanded)}
          >
            <MapPin className="w-3.5 h-3.5  mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
            <span className={cn(
              "leading-relaxed transition-all duration-300",
              !isAddressExpanded && "line-clamp-1"
            )}>
              {location ? (location.address || location.name) : "等待物理坐标接入..."}
            </span>
          </div>

          <button 
            onClick={() => {
              if (location?.lat && location?.lng) {
                window.open(`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`, '_blank');
              } else if (location?.name) {
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.name)}`, '_blank');
              }
            }}
            className="w-full mt-5 py-3   transition-colors rounded-xl flex items-center justify-center gap-2  text-xs font-bold tracking-widest border "
          >
            <Navigation2 className="w-4 h-4" /> {t('txt_e7a0d0')}</button>
        </div>

        {/* 货架 / 引流胶囊 (右脑的下半部分) */}
          <div className={cn(isCompact ? "mt-8" : "flex-1")}>
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
              <div className="w-1 h-1 rounded-full " />
              {t('txt_54cfc3')}</h3>
            {capsules.length > 0 ? (
              <div className={cn(
                isCompact ? "space-y-3" : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
              )}>
              {capsules.map((cap, idx) => (
                <div 
                  key={cap.id || idx} 
                  onClick={() => onCapsuleClick && onCapsuleClick(cap.label || cap.name)}
                  className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-between group   transition-all cursor-pointer relative overflow-hidden h-full min-h-[100px]"
                >
                  <div className="absolute top-0 bottom-0 left-0 w-1   transition-colors" />
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-white  transition-colors line-clamp-2 pr-2">{cap.label || cap.name}</h4>
                      <div className="text-[10px] text-white/40 font-mono mt-1.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> {cap.duration || "60"} MIN
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-end mt-auto">
                    <div className="text-[9px]  border  px-2 py-0.5 rounded-full">{t('txt_26ad89')}</div>
                    <div className="text-lg font-bold text-white font-mono">{cap.price}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full py-10 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-white/20 bg-white/5">
              <Plus className="w-6 h-6 mb-2 opacity-50" />
              <span className="text-[10px] font-mono tracking-widest">{t('txt_637f84')}</span>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
