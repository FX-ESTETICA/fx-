"use client";

import { 
 Calendar, 
 Sparkles,
 Play,
 Eye,
 MonitorSmartphone,
 Search
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { BookingDetails } from "@/features/booking/types";
import { ShopOperatingConfig, DailyOverride } from "@/features/calendar/components/IndustryCalendar";
import { TodayOverrideController } from "@/features/calendar/components/TodayOverrideController";
import { cn } from "@/utils/cn";
import { PhoneAuthBar } from "./PhoneAuthBar";
import { IndustryType } from "@/features/calendar/types";
import { UserProfile } from "../types";

import { supabase } from "@/lib/supabase";
import { useShop } from "@/features/shop/ShopContext";
import { useTranslations } from "next-intl";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useVisualSettings } from "@/hooks/useVisualSettings";
// import { useRouter } from "next/navigation";
import { GracePeriodBanner } from "@/components/shared/GracePeriodBanner";
import { FrontendThemeSwitcher } from "./FrontendThemeSwitcher";
import { PrivacySettings } from "./PrivacySettings";

interface MerchantDashboardProps {
 merchantId: string;
 shopId?: string;
 industry?: string | null;
 onIndustrySet?: (industry: string) => void;
 profile?: UserProfile;
}

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

const StatsCard = ({ label, value, isLight }: { label: string; value: number | string; isLight?: boolean }) => {
 return (
 <div className="flex flex-col items-center justify-center p-4 md:p-6 hover:bg-white/[0.02] text-center">
 <span className={`text-[11px] ${isLight ? "text-black" : "text-white"} uppercase tracking-widest mb-1`}>{label}</span>
 <span className={cn("text-2xl md:text-3xl font-black tracking-tight", isLight ? "text-black" : isLight ? "text-black" : "text-white")}>{value}</span>
 </div>
 );
};

/**
 * MerchantDashboard - 商家端管理看板
 * 采用 Admin Red (#FF2D55) 视觉规范
 */
import { useViewStack } from "@/hooks/useViewStack";
import { useSubscriptionTimer } from "@/hooks/useSubscriptionTimer";

export const MerchantDashboard = ({ shopId, industry, profile }: MerchantDashboardProps) => {
 const t = useTranslations('MerchantDashboard');
 const { settings } = useVisualSettings();
 const isLight = settings.frontendBgIndex !== 0;
 // const router = useRouter();
 const { activeShopId, setActiveShopId, availableShops, subscription, shopConfig, isShopConfigLoaded, updateShopConfig, refreshBookings, trackAction, globalBookings } = useShop();
 const { setActiveTab, pushOverlay } = useViewStack();
 const { remainingTime, remainingMilliseconds } = useSubscriptionTimer();
 const isGracePeriodActive = subscription.isGracePeriodActive;
 const gracePeriodActionsLeft = subscription.gracePeriodActionsLeft;
 const [bookings, setBookings] = useState<BookingDetails[]>([]);

 // 多门店全局下拉菜单状态
 const [isDropdownOpen, setIsDropdownOpen] = useState(false);
 const [searchQuery, setSearchQuery] = useState("");

 const registerBack = useHardwareBack(state => state.register);
 const unregisterBack = useHardwareBack(state => state.unregister);

 useEffect(() => {
 if (isDropdownOpen) {
 registerBack('merchant-dropdown', () => {
 setIsDropdownOpen(false);
 return true;
 }, 30);
 } else {
 unregisterBack('merchant-dropdown');
 }
 return () => unregisterBack('merchant-dropdown');
 }, [isDropdownOpen, registerBack, unregisterBack]);

 // 从 ShopContext 提取需要的数据
 const activeShopName = availableShops?.find(s => s.shopId === activeShopId)?.shopName || "等待物理坐标接入...";
 
 const filteredShops = availableShops?.filter(shop => 
 (shop.shopName || "未知门店").toLowerCase().includes(searchQuery.toLowerCase())
 ) || [];

 // 强制状态降维与路由踢回 (Auto-Downgrade Routing)
 useEffect(() => {
 if (availableShops && availableShops.length === 0) {
 if (typeof window !== 'undefined') {
 localStorage.removeItem('gx_view_role');
 }
 // 为了安全和 0 报错，触发一次全局 reload 来让 AppShell 重新根据数据库的真实 role 渲染
 window.location.reload();
 }
 }, [availableShops]);

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

 if (!availableShops || availableShops.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-in fade-in ">
 <div className={`w-10 h-10 border-2 ${isLight ? "border-black" : "border-white"} border-t-transparent rounded-full animate-spin`}></div>
 <p className={`text-sm ${isLight ? "text-black" : "text-white"} tracking-widest uppercase `}>RECALIBRATING MATRIX...</p>
 </div>
 );
 }

 return (
 <div className="flex flex-col w-full animate-in fade-in relative">
 <GracePeriodBanner 
 remainingTime={remainingTime} 
 remainingMilliseconds={remainingMilliseconds}
 isReadOnlyMode={remainingTime === "LIMIT_EXCEEDED" && !isGracePeriodActive} 
 isGracePeriodActive={isGracePeriodActive} 
 gracePeriodActionsLeft={gracePeriodActionsLeft || 0}
 />
 
 {/* 统一的连体全息结界 (Unified Holographic Canvas) */}
 <div className="w-full relative z-10 flex flex-col">
 {/* 动态背景特效 - 已清理光晕 */}
 <div className="absolute inset-0 overflow-hidden pointer-events-none">
 </div>

 {/* 第一层：数据统计区 */}
 <div className="w-full py-4 relative z-10">
 <div className="grid grid-cols-3 divide-x divide-white/5">
 <StatsCard 
 label={t('txt_f49d92')} 
 value={bookings.filter(b => b.status === "pending").length} 
 isLight={isLight}
 />
 <StatsCard 
 label={t('txt_733f4a')} 
 value={bookings.filter(b => b.status === "confirmed").length} 
 isLight={isLight}
 />
 <StatsCard 
 label={t('txt_5af2c6')} 
 value={0} 
 isLight={isLight}
 />
 </div>
 </div>

 {/* 分割线：极细的光线 */}
 <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

 {/* 第二层：核心控制台 */}
 <div className="w-full py-6 md:py-8 relative z-40 group">
 <div className="flex flex-row items-stretch w-full gap-4 md:gap-8">
 
 {/* 左侧控制中枢：店铺选择与状态开关 */}
 <div className={`flex flex-col items-center shrink-0 w-[140px] md:w-64 border-r ${isLight ? "border-black/5" : "border-white/5"} pr-4 md:pr-6 justify-center`}>
 {/* 门店统御区 */}
 <div className="flex flex-col relative items-center w-full">
 <h3 
 className={`text-sm md:text-lg tracking-tight ${isLight ? "text-black" : "text-white"} ${isLight ? "hover:text-black" : "hover:text-white"} flex items-center justify-center gap-2 cursor-pointer w-full`}
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 setIsDropdownOpen(!isDropdownOpen);
 }}
 >
 <div className="truncate max-w-[100px] md:max-w-[150px] text-center">{activeShopName}</div>
 <div className={cn(
 "text-[11px] md:text-[11px] flex items-center justify-center w-4 h-4 rounded-full shrink-0", isLight ? "text-black hover:bg-black/10 hover:text-black" : isLight ? "text-black" : "text-white", isLight ? "hover:bg-black/10" : "hover:bg-white/10", isLight ? "hover:text-black" : "hover:text-white",
 isDropdownOpen && "rotate-180", isLight ? "bg-black/10 text-black" : isLight ? "bg-black/10" : "bg-white/10", isLight ? "text-black" : "text-white"
 )}>▼</div>
 </h3>
 <div className={`${isLight ? "text-black" : "text-white"} text-[11px] md:text-[11px] uppercase tracking-widest ${isLight ? "group-hover:text-black" : "group-hover:text-white"} mt-0.5 text-center w-full truncate`}>
 <div>多门店切换</div>
 </div>

 {/* 悬浮下拉菜单 (Glassmorphism 赛博空间) */}
 {isDropdownOpen && (
 <div 
 className={`absolute top-full left-1/2 xl:left-0 -translate-x-1/2 xl:translate-x-0 mt-3 w-64 bg-black/80 border ${isLight ? "border-black/10" : "border-white/10"} rounded-xl z-50 overflow-hidden`}
 onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
 >
 {/* 模糊搜索框 (门店大于3家时自动浮现) */}
 {availableShops.length > 3 && (
 <div className={`p-3 border-b ${isLight ? "border-black/5" : "border-white/5"} relative`}>
 <Search className={`absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isLight ? "text-black" : "text-white"}`} />
 <input 
 type="text" 
 placeholder={t('txt_096cda')} 
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className={`w-full ${isLight ? "bg-black/5" : "bg-white/5"} border ${isLight ? "border-black/5" : "border-white/5"} rounded-lg py-1.5 pl-8 pr-3 text-xs ${isLight ? "text-black" : "text-white"} placeholder:text-white focus:outline-none ${isLight ? "focus:border-black/50" : "focus:border-white/50"} `}
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
 "px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between",
 shop.shopId === activeShopId 
 ? (isLight ? "bg-black/10 text-black " : "bg-white/10 text-white ")
 : (isLight ? "text-black hover:bg-black/5 hover:text-black" : "text-white hover:bg-white/5 hover:text-white")
 )}
 >
 <span className="truncate">{shop.shopName || "未知门店"}</span>
 {shop.shopId === activeShopId && (
 <div className={`w-1.5 h-1.5 rounded-full ${isLight ? "bg-black" : "bg-white"}`} />
 )}
 </div>
 ))
 ) : (
 <div className={`px-4 py-3 text-xs ${isLight ? "text-black" : "text-white"} text-center`}>
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
 className={`flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-full ${isLight ? "bg-black/5" : "bg-white/5"} border ${isLight ? "border-black/10" : "border-white/10"} ${isLight ? "hover:bg-black/10 hover:border-black/30 hover:text-black" : "hover:bg-white/10 hover:border-white/30 hover:text-white"} text-[11px] md:text-[11px] tracking-widest ${isLight ? "text-black" : "text-white"} w-full max-w-[120px]`}
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
 variant="minimal"
 fullConfig={fullConfig}
 />
 </div>
 </div>
 </div>

 {/* 分割线：极细的光线 */}
 <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

 {/* 第三层：功能入口区 (日历/星云) */}
 <div className="w-full py-4 relative z-10 grid grid-cols-2 divide-x divide-white/5">
 {/* 左侧：日历后台 */}
 {industry !== 'none' ? (
 <div onClick={handleNavigateToCalendar} className="block group">
 <div className="py-2 flex flex-col items-center justify-center gap-3 h-full cursor-pointer">
 <div className={`w-10 h-10 rounded-xl ${isLight ? "bg-black/10 border-black/20 text-black" : "bg-white/10 border-white/20 text-white"} border flex items-center justify-center `}>
 <Calendar className="w-5 h-5" />
 </div>
 <div className="text-center">
 <h3 className={`text-sm tracking-tight ${isLight ? "text-black" : "text-white"} `}>{t('txt_b170b6')}</h3>
 <p className={`${isLight ? "text-black" : "text-white"} text-[11px] uppercase tracking-widest mt-1 hidden sm:block`}>{t('txt_a75625')}</p>
 </div>
 </div>
 </div>
 ) : (
 <div className="py-2 flex flex-col items-center justify-center gap-3 cursor-not-allowed">
 <div className={`w-10 h-10 rounded-xl ${isLight ? "bg-black/5" : "bg-white/5"} border ${isLight ? "border-black/10" : "border-white/10"} flex items-center justify-center ${isLight ? "text-black" : "text-white"}`}>
 <Calendar className="w-5 h-5" />
 </div>
 <div className="text-center">
 <h3 className={`text-sm tracking-tight ${isLight ? "text-black" : "text-white"}`}>{t('txt_b170b6')}</h3>
 </div>
 </div>
 )}

 {/* 右侧：星云入口 */}
 <div onClick={handleNavigateToNebula} className="block group">
 <div className="py-2 flex flex-col items-center justify-center gap-3 h-full cursor-pointer">
 <div className={`w-10 h-10 rounded-xl ${isLight ? "bg-black/10 border-black/20 text-black" : "bg-white/10 border-white/20 text-white"} border flex items-center justify-center `}>
 <Sparkles className="w-5 h-5" />
 </div>
 <div className="text-center">
 <h3 className={`text-sm tracking-tight ${isLight ? "text-black" : "text-white"} `}>{t('txt_9f7256')}</h3>
 <p className={`${isLight ? "text-black" : "text-white"} text-[11px] uppercase tracking-widest mt-1 hidden sm:block`}>{t('txt_66cf43')}</p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* 数字印记 (Digital Footprints) - 0成本动态横滑列表 */}
 <div className="w-full space-y-3">
 <div className="flex items-center justify-between px-2">
 <div className={`flex items-center gap-2 text-[11px] uppercase tracking-widest ${isLight ? "text-black" : "text-white"}`}>
 <div className={`w-1.5 h-1.5 rounded-full ${isLight ? "bg-black/20" : "bg-white/20"}`} />
 <span>{t('txt_999d5c')}</span>
 </div>
 <button className={`text-[11px] uppercase tracking-widest ${isLight ? "text-black hover:text-black" : "text-white hover:text-white"} `}>
 {t('txt_0467cc')}</button>
 </div>

 {/* 滑动视口：极致阻尼与隐藏滚动条 */}
 <div className="w-full overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 -mx-2 px-2">
 <div className="flex gap-3 min-w-max">
 {mockFootprints.map((video) => (
 <div 
 key={video.id}
 className={`relative w-28 md:w-32 aspect-[9/16] shrink-0 snap-center rounded-xl overflow-hidden cursor-pointer group bg-black/20 border ${isLight ? "border-black/5 hover:border-black/20" : "border-white/5 hover:border-white/20"} `}
 >
 {/* 背景封面层：使用 img 标签模拟极低成本的 WebP 缩略图 */}
 <img 
 src={video.cover} 
 alt={video.title}
 className="absolute inset-0 w-full h-full object-cover "
 />
 
 {/* 底部信息遮罩层 */}
 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

 {/* 中央播放诱导元件 */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center border border-white/20 ">
 <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" />
 </div>

 {/* 数据锚点挂载区 */}
 <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-col gap-1.5 pointer-events-none">
 <span className="text-[11px] text-white leading-tight line-clamp-1">
 {video.title}
 </span>
 <div className="flex items-center justify-between text-[11px] text-white">
 <div className="flex items-center gap-1">
 <Eye className="w-2.5 h-2.5" />
 <span>{video.views}</span>
 </div>
 <span className="bg-black/50 px-1 rounded border border-white/20">
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
 {/* 前端专属壁纸切换器 */}
 <FrontendThemeSwitcher />

 <div className="flex flex-row items-center gap-4 w-full justify-center max-w-sm whitespace-nowrap">{/* 融合胶囊组件 */}
 <PhoneAuthBar 
 initialPhone={(profile as any)?.merchant_phone || ""} 
 className="max-w-none mx-0 w-auto" 
 mode="merchant"
 />
 </div>
 </div>
 </div>
 );
};
