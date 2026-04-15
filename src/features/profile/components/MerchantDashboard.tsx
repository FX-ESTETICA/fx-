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
import { useState, useEffect } from "react";
import { BookingDetails } from "@/features/booking/types";
import { BookingService } from "@/features/booking/api/booking";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { PhoneAuthBar } from "./PhoneAuthBar";
import { IndustryType } from "@/features/calendar/types";
import { UserProfile } from "../types";

import { supabase } from "@/lib/supabase";
import { useShop } from "@/features/shop/ShopContext";
import { useTranslations } from "next-intl";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { GracePeriodBanner } from "@/components/shared/GracePeriodBanner";

interface MerchantDashboardProps {
  merchantId: string;
  shopId?: string;
  industry?: string | null;
  onIndustrySet?: (industry: string) => void;
  profile?: UserProfile;
}

type ServiceInfo = {
  id?: string;
  name?: string;
};

type BookingRecord = {
  id: string;
  date: string;
  startTime: string;
  duration: number;
  status?: string;
  services?: ServiceInfo[];
  customServiceText?: string;
  customer_name?: string;
  customerName?: string;
  customer_phone?: string;
  customerPhone?: string;
};

type ShopBookingPayload = {
  eventType: string;
  new?: {
    id: string;
    date: string;
    start_time: string;
    duration_min: number;
    status?: string;
    data?: {
      services?: ServiceInfo[];
      customServiceText?: string;
      customer_name?: string;
      customerName?: string;
      customer_phone?: string;
      customerPhone?: string;
    };
  };
  old?: { id?: string };
};

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
export const MerchantDashboard = ({ merchantId, shopId, industry, profile }: MerchantDashboardProps) => {
  const t = useTranslations('MerchantDashboard');
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { activeShopId, setActiveShopId, availableShops, subscription } = useShop();
  const { remainingTime, isGracePeriodActive, gracePeriodActionsLeft } = subscription;
  const [bookings, setBookings] = useState<BookingDetails[]>([]);

  // 多门店全局下拉菜单状态
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeShopName = availableShops?.find(s => s.shopId === activeShopId)?.shopName || "GX 高新旗舰店";
  
  const filteredShops = availableShops?.filter(shop => 
    (shop.shopName || "未知门店").toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // 营业状态控制 (微动开关)
  const [storeStatus, setStoreStatus] = useState<'open' | 'closed_today' | 'holiday'>('open');

  // 营业时间无极滑轨状态 (HUD 风格)
  const [openTime, setOpenTime] = useState(8); // 8:00
  const [closeTime, setCloseTime] = useState(22); // 22:00
  
  // 状态与时间防抖同步状态
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  
  useEffect(() => {
    // 监听 config 变动，拉取店长设置的真实营业时间和状态
    const targetShopId = activeShopId || shopId;
    if (!targetShopId || targetShopId === 'default') return;

    let isSubscribed = true;

    // 【致命 0 污染法则】：无论如何，先强制把 UI 状态重置回系统的出厂默认值
    // 彻底斩断上一个商店残留的数据污染
    setStoreStatus('open');
    setOpenTime(8);
    setCloseTime(22);

    const loadStoreConfig = async () => {
      try {
        const { data: config } = await BookingService.getConfigs(targetShopId);
        if (!isSubscribed) return;
        
        if (config) {
          // 只有数据库里有这个字段，才去覆盖默认值
          if (config.storeStatus) {
            setStoreStatus(config.storeStatus as any);
          }
          if (config.hours && Array.isArray(config.hours)) {
            if (config.hours.length > 0) {
              const h = config.hours[0] as any;
              if (h.start !== undefined) setOpenTime(h.start);
              if (h.end !== undefined) setCloseTime(h.end);
            } else {
              setOpenTime(8);
              setCloseTime(22);
            }
          }
          // 注意：如果 config 存在，但刚好没有 hours，它就会老老实实地保持前面强制设置的 8-22
        }
        setIsConfigLoaded(true);
      } catch (e) {
        console.error("Failed to load store config for Dashboard", e);
      }
    };
    loadStoreConfig();

    // 挂载实时雷达监听
    const channel = BookingService.subscribeToShopConfig(targetShopId, (payload) => {
      const newConfig = payload.new?.config as any;
      if (newConfig) {
        if (newConfig.storeStatus) {
          setStoreStatus(newConfig.storeStatus);
        }
        if (newConfig.hours && Array.isArray(newConfig.hours)) {
          if (newConfig.hours.length > 0) {
            const h = newConfig.hours[0];
            if (h.start !== undefined) setOpenTime(h.start);
            if (h.end !== undefined) setCloseTime(h.end);
          } else {
            // 如果全局营业时间被清空，则默认显示 0-24 或 8-22
            setOpenTime(8);
            setCloseTime(22);
          }
        }
      }
    });

    return () => {
      isSubscribed = false;
      if (channel) BookingService.unsubscribe(channel);
    };
  }, [activeShopId, shopId]);

  // 当店长操作开关时，立刻写入数据库
  const handleStatusChange = async (newStatus: 'open' | 'closed_today' | 'holiday') => {
    setStoreStatus(newStatus);
    const targetShopId = activeShopId || shopId;
    if (targetShopId && targetShopId !== 'default' && isConfigLoaded) {
      try {
        await BookingService.updateConfigs(targetShopId, 'storeStatus', newStatus);
      } catch (e) {
        console.error("Failed to update storeStatus", e);
      }
    }
  };

  // 当店长松开滑轨时，同步更新时间 (使用 useEffect 配合防抖，或者简单的失去焦点)
  // 为了更简单的实现，我们可以在 onChange 里更新 state，然后在 onMouseUp / onTouchEnd 里写入数据库
  const handleHoursSave = async (start: number, end: number) => {
    const targetShopId = activeShopId || shopId;
    if (targetShopId && targetShopId !== 'default' && isConfigLoaded) {
      try {
        await BookingService.updateConfigs(targetShopId, 'hours', [{ id: '1', start, end }]);
      } catch (e) {
        console.error("Failed to update hours", e);
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

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        if (!shopId) return;
        console.log(`[MerchantDashboard] Fetching bookings for shop: ${shopId}`);
        const { data } = await BookingService.getBookings(shopId);
        
        // Convert from flat DB format to UI format
        const resolvedIndustry = resolveIndustry(industry);
        const uiBookings = (data as BookingRecord[]).map((b) => ({
          id: b.id,
          industry: resolvedIndustry,
          serviceId: b.services?.[0]?.id || "unknown",
          serviceName: b.services?.map((s) => s.name).join(', ') || b.customServiceText || "未知服务",
          date: b.date,
          timeSlot: `${b.startTime} - ${b.duration}min`,
          customerName: b.customer_name || b.customerName || "散客",
          customerPhone: b.customer_phone || b.customerPhone || "无",
          status: normalizeStatus(b.status),
        }));
        
        setBookings(uiBookings);
      } catch (error) {
        console.error("Failed to fetch merchant bookings:", error);
      }
    };

    fetchBookings();
  }, [merchantId, shopId, industry]);

  // 2. 实时状态监听 (物理隔离)
  useEffect(() => {
    if (!shopId) return;
    
    // 订阅当前门店的所有预约变更
    const channel = BookingService.subscribeToShopBookings(shopId, (payload: unknown) => {
      const typedPayload = payload as ShopBookingPayload;
      console.log(`[MerchantDashboard] New event received for shop ${shopId}:`, typedPayload);
      
      if (typedPayload.eventType === "DELETE") {
        const deletedId = typedPayload.old?.id;
        if (deletedId) {
          setBookings(prev => prev.filter(item => item.id !== deletedId));
        }
        return;
      }
      
      const b = typedPayload.new;
      if (!b) return;
      const resolvedIndustry = resolveIndustry(industry);

      const mappedBooking: BookingDetails = {
        id: b.id,
        industry: resolvedIndustry,
        serviceId: b.data?.services?.[0]?.id || "unknown",
        serviceName: b.data?.services?.map((s: { name?: string }) => s.name || '').filter(Boolean).join(', ') || b.data?.customServiceText || "未知服务",
        date: b.date,
        timeSlot: `${b.start_time} - ${b.duration_min}min`,
        customerName: b.data?.customer_name || b.data?.customerName || "散客",
        customerPhone: b.data?.customer_phone || b.data?.customerPhone || "无",
        status: normalizeStatus(b.status),
      };
      
      if (typedPayload.eventType === "INSERT") {
        setBookings(prev => [mappedBooking, ...prev]);
      } else if (typedPayload.eventType === "UPDATE") {
        setBookings(prev => prev.map(item => item.id === mappedBooking.id ? mappedBooking : item));
      }
    });

    return () => {
      if (channel) BookingService.unsubscribe(channel);
    };
  }, [shopId, industry]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative">
      <GracePeriodBanner 
        remainingTime={remainingTime} 
        remainingMilliseconds={subscription.remainingMilliseconds}
        isReadOnlyMode={remainingTime === "LIMIT_EXCEEDED" && !isGracePeriodActive} 
        isGracePeriodActive={isGracePeriodActive} 
        gracePeriodActionsLeft={gracePeriodActionsLeft}
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
      <div onClick={() => router.push('/studio')} className="cursor-pointer group">
        <GlassCard className="p-6 overflow-visible relative z-40 group-hover:bg-white/[0.02] transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-transparent to-white/[0.02] pointer-events-none rounded-2xl" />
        <div className="absolute top-1/2 left-20 -translate-y-1/2 w-40 h-40 bg-gx-cyan/5 blur-[60px] rounded-full group-hover:bg-gx-cyan/10 transition-all duration-500 pointer-events-none" />
        <div className="absolute top-1/2 right-20 -translate-y-1/2 w-40 h-40 bg-gx-purple/5 blur-[60px] rounded-full group-hover:bg-gx-purple/10 transition-all duration-500 pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row items-center xl:items-center w-full gap-6 xl:gap-12 min-h-[80px]">
          
          {/* 左侧控制中枢：店铺选择与状态开关 */}
          <div className="flex flex-col xl:flex-row items-center shrink-0 w-full xl:w-auto justify-center xl:justify-start gap-6 xl:gap-8">
            {/* 门店统御区 (全局多店切换锚点) */}
            <div className="flex flex-col relative items-center xl:items-start w-full xl:w-auto">
              <h3 
                className="text-lg font-bold tracking-tight text-white/80 hover:text-white transition-colors flex items-center justify-center xl:justify-start gap-2 cursor-pointer w-full"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDropdownOpen(!isDropdownOpen);
                }}
              >
                <div className="truncate max-w-[200px] xl:max-w-[150px]">{activeShopName}</div>
                <div className={cn(
                  "text-[10px] text-white/30 flex items-center justify-center w-4 h-4 rounded-full hover:bg-white/10 hover:text-white transition-all",
                  isDropdownOpen && "rotate-180 bg-white/10 text-white"
                )}>▼</div>
              </h3>
              <div className="text-white/40 text-[10px] uppercase tracking-widest font-mono group-hover:text-gx-cyan/60 transition-colors mt-0.5 text-center xl:text-left w-full">
                <div>{t('txt_58a86b')}</div>
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
              <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-hover:text-gx-cyan group-hover:translate-x-1 transition-all shrink-0 xl:hidden" />
            </div>

            {/* 状态控制微动开关 (Micro-Switches) */}
            <div className="flex items-center justify-center gap-3 w-full xl:w-auto" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <button 
                onClick={() => handleStatusChange('open')} 
                className={cn(
                  "px-4 py-2 xl:px-3 xl:py-1.5 rounded-md text-xs xl:text-[10px] font-bold border transition-all uppercase tracking-widest flex-1 xl:flex-none", 
                  storeStatus === 'open' ? "bg-gx-cyan/20 border-gx-cyan/50 text-gx-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]" : "bg-white/5 border-white/10 text-white/40 hover:text-white/80 hover:bg-white/10"
                )}
              >
                <div>{t('txt_145da8')}</div>
              </button>
              <button 
                onClick={() => handleStatusChange('closed_today')} 
                className={cn(
                  "px-4 py-2 xl:px-3 xl:py-1.5 rounded-md text-xs xl:text-[10px] font-bold border transition-all uppercase tracking-widest flex-1 xl:flex-none", 
                  storeStatus === 'closed_today' ? "bg-red-500/20 border-red-500/50 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "bg-white/5 border-white/10 text-white/40 hover:text-white/80 hover:bg-white/10"
                )}
              >
                <div>{t('txt_52aa20')}</div>
              </button>
              <button 
                onClick={() => handleStatusChange('holiday')} 
                className={cn(
                  "px-4 py-2 xl:px-3 xl:py-1.5 rounded-md text-xs xl:text-[10px] font-bold border transition-all uppercase tracking-widest flex-1 xl:flex-none", 
                  storeStatus === 'holiday' ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]" : "bg-white/5 border-white/10 text-white/40 hover:text-white/80 hover:bg-white/10"
                )}
              >
                <div>{t('txt_99af0d')}</div>
              </button>
            </div>
          </div>

          {/* 右侧纯净滑轨区：营业时间矩阵 (HUD 无极滑轨) */}
          <div className="flex-1 w-full relative bg-transparent flex items-center justify-center pt-10 pb-4 px-2 xl:px-8 xl:pt-4 xl:pb-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <div className="relative h-2 bg-white/5 rounded-full group-hover:bg-white/10 transition-colors w-full">
              <div 
                className={cn(
                  "absolute h-full rounded-full transition-colors pointer-events-none",
                  storeStatus === 'closed_today' ? "bg-red-500/30 group-hover:bg-red-500/50" :
                  storeStatus === 'holiday' ? "bg-yellow-500/30 group-hover:bg-yellow-500/50" :
                  "bg-gx-cyan/30 group-hover:bg-gx-cyan/50"
                )}
                style={{ 
                  left: `${(openTime / 24) * 100}%`, 
                  right: `${100 - (closeTime / 24) * 100}%` 
                }}
              />
              
              {storeStatus === 'open' && (
                <>
                  <input 
                    type="range" 
                    min="0" max="24" 
                    value={openTime} 
                    onChange={(e) => setOpenTime(Math.min(Number(e.target.value), closeTime - 1))}
                    onMouseUp={() => handleHoursSave(openTime, closeTime)}
                    onTouchEnd={() => handleHoursSave(openTime, closeTime)}
                    className="absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none z-20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:cursor-grab active:[&::-webkit-slider-thumb]:cursor-grabbing [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:cursor-grab active:[&::-moz-range-thumb]:cursor-grabbing [&::-moz-range-thumb]:border-0"
                  />
                  <input 
                    type="range" 
                    min="0" max="24" 
                    value={closeTime} 
                    onChange={(e) => setCloseTime(Math.max(Number(e.target.value), openTime + 1))}
                    onMouseUp={() => handleHoursSave(openTime, closeTime)}
                    onTouchEnd={() => handleHoursSave(openTime, closeTime)}
                    className="absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none z-30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:cursor-grab active:[&::-webkit-slider-thumb]:cursor-grabbing [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:cursor-grab active:[&::-moz-range-thumb]:cursor-grabbing [&::-moz-range-thumb]:border-0"
                  />
                </>
              )}
              
              {/* 起点发光节点指示器与悬浮时间 */}
              <div 
                className={cn("absolute top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10", storeStatus !== 'open' && "opacity-50")} 
                style={{ left: `${(openTime / 24) * 100}%`, transform: 'translate(-50%, -50%)' }}
              >
                <div className={cn(
                  "text-xs font-mono font-bold tracking-tighter mix-blend-screen text-shadow-sm group-hover:text-white transition-colors mb-2.5 whitespace-nowrap bg-black/60 px-2 py-1 rounded-md border backdrop-blur-md shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                  storeStatus === 'closed_today' ? "text-red-500 border-red-500/30" :
                  storeStatus === 'holiday' ? "text-yellow-500 border-yellow-500/30" :
                  "text-gx-cyan border-gx-cyan/30"
                )}>
                  {openTime.toString().padStart(2, '0')}:00
                </div>
                <div className={cn(
                  "w-3.5 h-3.5 rounded-full transition-shadow relative",
                  storeStatus === 'closed_today' ? "bg-red-500 shadow-[0_0_10px_#EF4444] group-hover:shadow-[0_0_15px_#EF4444]" :
                  storeStatus === 'holiday' ? "bg-yellow-500 shadow-[0_0_10px_#EAB308] group-hover:shadow-[0_0_15px_#EAB308]" :
                    "bg-gx-cyan shadow-[0_0_10px_#00F0FF] group-hover:shadow-[0_0_15px_#00F0FF]"
                  )}>
                    {storeStatus === 'open' && <div className="absolute inset-0 rounded-full bg-gx-cyan animate-ping opacity-40" />}
                  </div>
                </div>

                {/* 终点发光节点指示器与悬浮时间 */}
                <div 
                  className={cn("absolute top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10", storeStatus !== 'open' && "opacity-50")} 
                  style={{ left: `${(closeTime / 24) * 100}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className={cn(
                    "text-xs font-mono font-bold tracking-tighter mix-blend-screen text-shadow-sm group-hover:text-white transition-colors mb-2.5 whitespace-nowrap bg-black/60 px-2 py-1 rounded-md border backdrop-blur-md shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                    storeStatus === 'closed_today' ? "text-red-500 border-red-500/30" :
                    storeStatus === 'holiday' ? "text-yellow-500 border-yellow-500/30" :
                    "text-gx-cyan border-gx-cyan/30"
                  )}>
                    {closeTime.toString().padStart(2, '0')}:00
                  </div>
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full transition-shadow relative",
                    storeStatus === 'closed_today' ? "bg-red-500 shadow-[0_0_10px_#EF4444] group-hover:shadow-[0_0_15px_#EF4444]" :
                    storeStatus === 'holiday' ? "bg-yellow-500 shadow-[0_0_10px_#EAB308] group-hover:shadow-[0_0_15px_#EAB308]" :
                    "bg-gx-cyan shadow-[0_0_10px_#00F0FF] group-hover:shadow-[0_0_15px_#00F0FF]"
                  )}>
                    {storeStatus === 'open' && <div className="absolute inset-0 rounded-full bg-gx-cyan animate-ping opacity-40" />}
                  </div>
                </div>

                {/* 锁单警告遮罩 */}
                {storeStatus !== 'open' && (
                  <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                    <div className={cn(
                      "px-4 py-1.5 rounded-lg border backdrop-blur-md font-bold tracking-widest text-xs uppercase shadow-2xl",
                      storeStatus === 'closed_today' ? "bg-red-500/10 border-red-500/50 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]" :
                      "bg-yellow-500/10 border-yellow-500/50 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                    )}>
                      <div>{storeStatus === 'closed_today' ? t('status_closed_today') : t('status_vacation')}</div>
                    </div>
                  </div>
                )}
              </div>

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
            <Link href={`/calendar/${industry || 'beauty'}?shopId=${activeShopId || shopId || 'default'}`} prefetch={false} className="block group">
              <div className="p-4 sm:p-6 flex flex-col items-center justify-center gap-3 hover:bg-white/[0.02] transition-colors h-full cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-gx-cyan/10 border border-gx-cyan/20 flex items-center justify-center text-gx-cyan group-hover:scale-110 transition-transform duration-500 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-bold tracking-tight text-white/90 group-hover:text-white transition-colors">{t('txt_b170b6')}</h3>
                  <p className="text-white/40 text-[9px] uppercase tracking-widest font-mono mt-1 hidden sm:block">{t('txt_a75625')}</p>
                </div>
              </div>
            </Link>
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
          <Link href="/nebula" prefetch={false} className="block group">
            <div className="p-4 sm:p-6 flex flex-col items-center justify-center gap-3 hover:bg-white/[0.02] transition-colors h-full cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gx-purple/10 border border-gx-purple/20 flex items-center justify-center text-gx-purple group-hover:scale-110 transition-transform duration-500 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold tracking-tight text-white/90 group-hover:text-white transition-colors">{t('txt_9f7256')}</h3>
                <p className="text-white/40 text-[9px] uppercase tracking-widest font-mono mt-1 hidden sm:block">{t('txt_66cf43')}</p>
              </div>
            </div>
          </Link>
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
