"use client";

import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { 
  Calendar, 
  Sparkles,
  ArrowRight,
  Play,
  Eye,
  MonitorSmartphone,
  LogOut,
  Search
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { BookingDetails } from "@/features/booking/types";
import { ShopOperatingConfig, DailyOverride } from "@/features/calendar/components/IndustryCalendar";
import { TodayOverrideController } from "@/features/calendar/components/TodayOverrideController";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { PhoneAuthBar } from "./PhoneAuthBar";
import { IndustryType } from "@/features/calendar/types";
import { UserProfile } from "../types";

import { supabase } from "@/lib/supabase";
import { useShop } from "@/features/shop/ShopContext";
import { useTranslations } from "next-intl";
import { useAuth } from "@/features/auth/hooks/useAuth";
// import { useRouter } from "next/navigation";
import { GracePeriodBanner } from "@/components/shared/GracePeriodBanner";

interface MerchantDashboardProps {
  merchantId: string;
  shopId?: string;
  industry?: string | null;
  onIndustrySet?: (industry: string) => void;
  profile?: UserProfile;
}

type StatsCardProps = {
  label: string;
  value: number | string;
  color: "red" | "cyan" | "gold";
};

const resolveIndustry = (value?: string | null): IndustryType => {
  const allowed: IndustryType[] = ["beauty", "dining", "hotel", "medical", "expert", "fitness", "other"];
  return allowed.includes(value as IndustryType) ? (value as IndustryType) : "beauty";
};

const normalizeStatus = (value?: string): BookingDetails["status"] => {
  const lower = (value || "pending").toLowerCase();
  return lower === "confirmed" || lower === "cancelled" || lower === "completed"
    ? (lower as BookingDetails["status"])
    : "pending";
};

/**
 * MerchantDashboard - 商家端管理看板
 * 采用 Admin Red (#FF2D55) 视觉规范
 */
import { useViewStack } from "@/hooks/useViewStack";
import { useSubscriptionTimer } from "@/hooks/useSubscriptionTimer";

export const MerchantDashboard = ({ shopId, industry, profile }: MerchantDashboardProps) => {
  const t = useTranslations('MerchantDashboard');
  // const router = useRouter();
  const { user, signOut } = useAuth();
  const { activeShopId, setActiveShopId, availableShops, subscription, shopConfig, isShopConfigLoaded, updateShopConfig, refreshBookings, trackAction, globalBookings } = useShop();
  const { setActiveTab, pushOverlay } = useViewStack();
  const { remainingTime, remainingMilliseconds } = useSubscriptionTimer();
  const isGracePeriodActive = subscription.isGracePeriodActive;
  const gracePeriodActionsLeft = subscription.gracePeriodActionsLeft;
  const [bookings, setBookings] = useState<BookingDetails[]>([]);

  // 多门店全局下拉菜单状态
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeShopName = availableShops?.find(s => s.shopId === activeShopId)?.shopName || "GX 高新旗舰店";
  
  const filteredShops = availableShops?.filter(shop => 
    (shop.shopName || "未知门店").toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // 从 ShopContext 全局中枢获取配置，并做防御性降维
  const fullConfig = useMemo(() => {
    if (!shopConfig || !shopConfig.hours) return null;
    const parsedConfig = shopConfig.hours;
    if (Array.isArray(parsedConfig)) return null;
    
    return {
      ...parsedConfig,
      regular: (parsedConfig as ShopOperatingConfig).regular || { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
      specialDates: (parsedConfig as ShopOperatingConfig).specialDates || {}
    } as ShopOperatingConfig;
  }, [shopConfig]);

  // 提取当天的 Override
  const todayDateStr = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  const todayOverride = fullConfig?.todayOverride?.date === todayDateStr ? fullConfig.todayOverride : null;

  // 当 TodayOverrideController 改变时触发
  const handleTodayOverrideChange = async (newOverride: DailyOverride | null) => {
    const targetShopId = activeShopId || shopId;
    if (targetShopId && targetShopId !== 'default' && isShopConfigLoaded) {
      try {
        const newConfig: ShopOperatingConfig = fullConfig 
          ? { ...fullConfig } 
          : { regular: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] }, specialDates: {} };

        newConfig.todayOverride = newOverride;

        // 计算新的 storeStatus
        let nextStoreStatus: 'open' | 'closed_today' | 'holiday' = 'open';
        if (newOverride && newOverride.isClosed && newOverride.date === todayDateStr) {
          nextStoreStatus = 'closed_today';
        } else if (newConfig.specialDates && newConfig.specialDates[todayDateStr]?.isClosed) {
          nextStoreStatus = 'holiday';
        }

        // 我们不能再只更新局部了，我们需要同时更新 hours 和 storeStatus，所以改用批量 API
        const patchObj = {
          hours: newConfig,
          storeStatus: nextStoreStatus
        };

        // 乐观更新 + 强制物理写入
        const { data: currentShop } = await supabase
          .from('shops')
          .select('config')
          .eq('id', targetShopId)
          .single();

        const mergedConfig = {
          ...(currentShop?.config as Record<string, unknown> || {}),
          ...patchObj
        };

        // 乐观更新 context
        updateShopConfig('hours', newConfig);
        updateShopConfig('storeStatus', nextStoreStatus);

        await supabase.from('shops').update({ config: mergedConfig }).eq('id', targetShopId);
        
        refreshBookings();
        trackAction();
      } catch (e) {
        console.error("Failed to update hours override", e);
      }
    }
  };

  const [isStoreConfigured, setIsStoreConfigured] = useState(false); 
  const [isCheckingStore, setIsCheckingStore] = useState(true);

  useEffect(() => {
    // 真实的物理校验：检查用户绑定的那家店是否已经有了 config 数据
    const checkStoreConfigured = async () => {
      if (!user?.id) {
        setIsCheckingStore(false);
        return;
      }
      try {
        const { data: bindings } = await supabase
          .from('shop_bindings')
          .select('shop_id')
          .eq('user_id', user.id)
          .eq('role', 'OWNER')
          .limit(1)
          .maybeSingle();

        if (bindings?.shop_id) {
          const { data: shop } = await supabase
            .from('shops')
            .select('config')
            .eq('id', bindings.shop_id)
            .single();

          // 如果 config 里有 coverImages，我们认为它已经被配置过了
          if (shop?.config && (shop.config as any).coverImages?.length > 0) {
            setIsStoreConfigured(true);
          } else {
            setIsStoreConfigured(false);
          }
        } else {
          setIsStoreConfigured(false);
        }
      } catch (error) {
        console.error("Failed to check store configuration:", error);
        setIsStoreConfigured(false);
      } finally {
        setIsCheckingStore(false);
      }
    };

    checkStoreConfigured();
  }, [user]);

  // MOCK 数据：数字印记 (Digital Footprints) 视频缩略图
  const mockFootprints = [
    { id: "1", title: "赛博空间漫游", views: "1.2W", duration: "00:15", cover: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=600&auto=format&fit=crop" },
    { id: "2", title: "霓虹下的美学", views: "8.5K", duration: "00:30", cover: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=600&auto=format&fit=crop" },
    { id: "3", title: "深渊咖啡馆打卡", views: "45K", duration: "01:05", cover: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=600&auto=format&fit=crop" },
    { id: "4", title: "未来医美体验", views: "3.2K", duration: "00:45", cover: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=600&auto=format&fit=crop" },
    { id: "5", title: "机械臂理疗", views: "900", duration: "00:20", cover: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=600&auto=format&fit=crop" },
  ];

  // ==========================================
  // 【单页架构跳转适配】：Nebula 和 Studio 现在是全局 Overlay
  // ==========================================
  const handleNavigateToStudio = (e: React.MouseEvent) => {
    e.preventDefault();
    // 【修复传递断层】：将当前在智控页选中的 activeShopId 透传给 Studio 引擎
    const targetShopId = activeShopId || shopId;
    pushOverlay('studio', { shopId: targetShopId });
  };
  
  const handleNavigateToCalendar = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveTab('calendar', { industry: industry || 'beauty' });
  };
  
  const handleNavigateToNebula = (e: React.MouseEvent) => {
    e.preventDefault();
    pushOverlay('nebula');
  };

  // 1 & 2. 移除 MerchantDashboard 内置的 Bookings 独立拉取和监听
  // 【世界顶端架构】：完全复用 ShopContext 里的 globalBookings，消灭所有的并发与多重 websocket
  useEffect(() => {
    const resolvedIndustry = resolveIndustry(industry);
    const uiBookings = globalBookings.map((b) => ({
      id: b.id,
      industry: resolvedIndustry,
      serviceId: b.services?.[0]?.id || "unknown",
      serviceName: b.services?.map((s: any) => s.name).join(', ') || b.customServiceText || "未知服务",
      date: b.date,
      timeSlot: `${b.startTime} - ${b.duration || b.duration_min}min`,
      customerName: b.customer_name || b.customerName || "散客",
      customerPhone: b.customer_phone || b.customerPhone || "无",
      status: normalizeStatus(b.status),
    }));
    setBookings(uiBookings);
  }, [globalBookings, industry]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative">
      <GracePeriodBanner 
        remainingTime={remainingTime} 
        remainingMilliseconds={remainingMilliseconds}
        isReadOnlyMode={remainingTime === "LIMIT_EXCEEDED" && !isGracePeriodActive} 
        isGracePeriodActive={isGracePeriodActive} 
        gracePeriodActionsLeft={gracePeriodActionsLeft || 0}
      />
      
      {/* 待配置的数字门店横幅 - 核心 B 端流程闭环 */}
      {!isCheckingStore && !isStoreConfigured && (
        <Link href="/studio">
          <GlassCard glowColor="cyan" className="p-4 group cursor-pointer hover:bg-white/5 transition-all overflow-hidden relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-gx-cyan/10 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gx-cyan/10 border border-gx-cyan/20 flex items-center justify-center text-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                  <MonitorSmartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-gx-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]">
                    {t('txt_0dcaa5')}</h3>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono mt-0.5">
                    {t('txt_f6e889')}</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:text-gx-cyan group-hover:bg-gx-cyan/10 transition-all">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </GlassCard>
        </Link>
      )}

      {/* 顶部统计卡片与联邦集结舱 (连体数据舱) */}
      <GlassCard className="p-0 overflow-hidden relative">
        <div className="grid grid-cols-3 divide-x divide-white/5">
          <StatsCard 
            label={t('txt_f49d92')} 
            value={bookings.filter(b => b.status === "pending").length} 
            color="red"
          />
          <StatsCard 
            label={t('txt_733f4a')} 
            value={bookings.filter(b => b.status === "confirmed").length} 
            color="cyan"
          />
          <StatsCard 
            label={t('txt_5af2c6')} 
            value={0} 
            color="gold"
          />
        </div>
      </GlassCard>

      {/* 核心控制台 (全息驾驶舱风格) - 贯穿全宽连体控制舱 */}
      <div className="relative group">
        <GlassCard className="p-6 overflow-visible relative z-40 transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-transparent to-white/[0.02] pointer-events-none rounded-2xl" />
        <div className="absolute top-1/2 left-20 -translate-y-1/2 w-40 h-40 bg-gx-cyan/5 blur-[60px] rounded-full group-hover:bg-gx-cyan/10 transition-all duration-500 pointer-events-none" />
        <div className="absolute top-1/2 right-20 -translate-y-1/2 w-40 h-40 bg-gx-purple/5 blur-[60px] rounded-full group-hover:bg-gx-purple/10 transition-all duration-500 pointer-events-none" />

        <div className="relative z-10 flex flex-row items-stretch w-full gap-4 md:gap-8">
          
          {/* 左侧控制中枢：店铺选择与状态开关 */}
          <div className="flex flex-col items-center shrink-0 w-[140px] md:w-64 border-r border-white/5 pr-4 md:pr-6 justify-center">
            {/* 门店统御区 (全局多店切换锚点) */}
            <div className="flex flex-col relative items-center w-full">
              <h3 
                className="text-sm md:text-lg font-bold tracking-tight text-white/80 hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer w-full"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDropdownOpen(!isDropdownOpen);
                }}
              >
                <div className="truncate max-w-[100px] md:max-w-[150px] text-center">{activeShopName}</div>
                <div className={cn(
                  "text-[8px] md:text-[10px] text-white/30 flex items-center justify-center w-4 h-4 rounded-full hover:bg-white/10 hover:text-white transition-all shrink-0",
                  isDropdownOpen && "rotate-180 bg-white/10 text-white"
                )}>▼</div>
              </h3>
              <div className="text-white/40 text-[8px] md:text-[10px] uppercase tracking-widest font-mono group-hover:text-gx-cyan/60 transition-colors mt-0.5 text-center w-full truncate">
                <div>多门店切换引擎</div>
              </div>

              {/* 悬浮下拉菜单 (Glassmorphism 赛博空间) */}
              {isDropdownOpen && (
                <div 
                  className="absolute top-full left-1/2 xl:left-0 -translate-x-1/2 xl:translate-x-0 mt-3 w-64 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                  {/* 模糊搜索框 (门店大于3家时自动浮现) */}
                  {availableShops.length > 3 && (
                    <div className="p-3 border-b border-white/5 relative">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                      <input 
                        type="text" 
                        placeholder={t('txt_096cda')} 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-gx-cyan/50 transition-colors"
                      />
                    </div>
                  )}
                  
                  {/* 门店列表引擎 */}
                  <div className="max-h-[240px] overflow-y-auto no-scrollbar py-2">
                    {filteredShops.length > 0 ? (
                      filteredShops.map(shop => (
                        <div 
                          key={shop.shopId}
                          onClick={() => {
                            setActiveShopId(shop.shopId);
                            setIsDropdownOpen(false);
                            searchQuery && setSearchQuery("");
                          }}
                          className={cn(
                            "px-4 py-2.5 text-sm cursor-pointer transition-all flex items-center justify-between",
                            shop.shopId === activeShopId 
                              ? "bg-gx-cyan/10 text-gx-cyan font-bold" 
                              : "text-white/60 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <span className="truncate">{shop.shopName || "未知门店"}</span>
                          {shop.shopId === activeShopId && (
                            <div className="w-1.5 h-1.5 rounded-full bg-gx-cyan shadow-[0_0_5px_#00F0FF]" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs text-white/30 text-center">
                        {t('txt_386390')}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* 移动端显示的箭头：绝对定位到右上角，不破坏居中结构 */}
            </div>

            {/* 装修数字门店专属按钮，紧贴在店铺名称下方，确保一比一对应 */}
            <div className="flex justify-center w-full mt-4">
              <button 
                onClick={handleNavigateToStudio}
                className="flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-full bg-white/5 border border-white/10 hover:bg-gx-cyan/10 hover:border-gx-cyan/30 hover:text-gx-cyan transition-all text-[9px] md:text-[11px] font-mono tracking-widest text-white/60 w-full max-w-[120px]"
              >
                <MonitorSmartphone className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                <span className="truncate">装修门店</span>
              </button>
            </div>
          </div>

          <div className="flex-1 min-w-0 flex items-center justify-start pl-1 md:pl-4">
            <TodayOverrideController 
              todayOverride={todayOverride}
              onChange={handleTodayOverrideChange}
              title="今日营业时间控制舱"
              subtitle=""
              variant="minimal"
              fullConfig={fullConfig}
            />
          </div>
        </div>
      </GlassCard>
    </div>

      {/* 功能入口区 - 横向连体数据舱 */}
      <GlassCard className="p-0 overflow-hidden relative">
        {/* 背景光效：左青右紫 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-32 h-32 bg-gx-cyan/5 blur-[50px] rounded-full" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gx-purple/5 blur-[50px] rounded-full" />
        </div>

        <div className="relative z-10 grid grid-cols-2 divide-x divide-white/5">
          {/* 左侧：日历后台 */}
          {industry !== 'none' ? (
            <div onClick={handleNavigateToCalendar} className="block group">
              <div className="p-4 sm:p-6 flex flex-col items-center justify-center gap-3 hover:bg-white/[0.02] transition-colors h-full cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-gx-cyan/10 border border-gx-cyan/20 flex items-center justify-center text-gx-cyan group-hover:scale-110 transition-transform duration-500 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-bold tracking-tight text-white/90 group-hover:text-white transition-colors">{t('txt_b170b6')}</h3>
                  <p className="text-white/40 text-[9px] uppercase tracking-widest font-mono mt-1 hidden sm:block">{t('txt_a75625')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6 flex flex-col items-center justify-center gap-3 opacity-50 cursor-not-allowed">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold tracking-tight text-white/50">{t('txt_b170b6')}</h3>
              </div>
            </div>
          )}

          {/* 右侧：星云入口 */}
          <div onClick={handleNavigateToNebula} className="block group">
            <div className="p-4 sm:p-6 flex flex-col items-center justify-center gap-3 hover:bg-white/[0.02] transition-colors h-full cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gx-purple/10 border border-gx-purple/20 flex items-center justify-center text-gx-purple group-hover:scale-110 transition-transform duration-500 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold tracking-tight text-white/90 group-hover:text-white transition-colors">{t('txt_9f7256')}</h3>
                <p className="text-white/40 text-[9px] uppercase tracking-widest font-mono mt-1 hidden sm:block">{t('txt_66cf43')}</p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 数字印记 (Digital Footprints) - 0成本动态横滑列表 */}
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/50">
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <span>{t('txt_999d5c')}</span>
          </div>
          <button className="text-[9px] font-mono text-gx-cyan uppercase tracking-widest hover:text-white transition-colors">
            {t('txt_0467cc')}</button>
        </div>

        {/* 滑动视口：极致阻尼与隐藏滚动条 */}
        <div className="w-full overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 -mx-2 px-2">
          <div className="flex gap-3 min-w-max">
            {mockFootprints.map((video) => (
              <div 
                key={video.id}
                className="relative w-28 md:w-32 aspect-[9/16] shrink-0 snap-center rounded-xl overflow-hidden cursor-pointer group bg-black/20 border border-white/5 hover:border-white/20 transition-all duration-500 shadow-[0_4px_15px_rgba(0,0,0,0.5)]"
              >
                {/* 背景封面层：使用 img 标签模拟极低成本的 WebP 缩略图 */}
                <img 
                  src={video.cover} 
                  alt={video.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                />
                
                {/* 底部信息遮罩层 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

                {/* 中央播放诱导元件 */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 group-hover:bg-gx-cyan/20 group-hover:border-gx-cyan/50 transition-all duration-300">
                  <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" />
                </div>

                {/* 数据锚点挂载区 */}
                <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-col gap-1.5 pointer-events-none">
                  <span className="text-[10px] font-bold text-white leading-tight line-clamp-1 drop-shadow-md">
                    {video.title}
                  </span>
                  <div className="flex items-center justify-between text-[9px] font-mono text-white/70">
                    <div className="flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5" />
                      <span>{video.views}</span>
                    </div>
                    <span className="bg-black/50 px-1 rounded backdrop-blur-sm border border-white/10">
                      {video.duration}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 系统底层锚点 (System Anchor) - 融合胶囊 */}
      <div className="pt-6 pb-6 w-full flex flex-col items-center justify-center px-2 gap-6">
        <PhoneAuthBar initialPhone={profile?.phone || ""} className="max-w-none mx-0 w-auto" />
        
        {/* 退出账号按钮 */}
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] text-white/30 hover:text-white/70 uppercase tracking-widest transition-colors flex items-center gap-1.5"
          onClick={async () => {
            await signOut();
            window.location.href = "/login";
          }}
        >
          <LogOut className="w-3 h-3" />
          {t('txt_4d90f0')}</Button>
      </div>
    </div>
  );
};

// --- 子组件 ---

const StatsCard = ({ label, value, color }: StatsCardProps) => (
  <div 
    className={cn(
      "p-4 group hover:bg-white/5 transition-all relative overflow-hidden",
      color === "red" ? "hover:shadow-[inset_0_0_20px_rgba(255,45,85,0.1)]" :
      color === "cyan" ? "hover:shadow-[inset_0_0_20px_rgba(0,240,255,0.1)]" :
      "hover:shadow-[inset_0_0_20px_rgba(255,215,0,0.1)]"
    )}
  >
    <div className="flex flex-col space-y-1">
      <p className="text-white/40 text-[10px] md:text-xs uppercase tracking-widest font-mono truncate">{label}</p>
      <p className={cn(
        "text-2xl md:text-3xl font-bold tracking-tighter transition-colors duration-500",
        color === "red" ? "group-hover:text-gx-admin-red" :
        color === "cyan" ? "group-hover:text-gx-cyan" :
        "group-hover:text-gx-gold"
      )}>{value}</p>
    </div>
  </div>
);
