"use client";

import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { 
  LayoutDashboard, 
  Calendar, 
  Clock,
  CheckCircle2,
  Filter,
  MoreVertical,
  Sparkles,
  ArrowRight,
  Settings,
  Scissors,
  Wand2,
  Droplets,
  Zap,
  Power,
  Play,
  Eye,
  X
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { BookingDetails } from "@/features/booking/types";
import { BookingService } from "@/features/booking/api/booking";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { Input } from "@/components/shared/Input";
import { Users } from "lucide-react";
import { PhoneAuthBar } from "./PhoneAuthBar";
import { IndustryType } from "@/features/calendar/types";
import { UserProfile } from "../types";

import { supabase } from "@/lib/supabase";
import { useShop } from "@/features/shop/ShopContext";
import { useTranslations } from "next-intl";

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
  icon: ReactNode;
  color: "red" | "cyan" | "gold";
};

type TabButtonProps = {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
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
  const { activeShopId } = useShop();
  const [bookings, setBookings] = useState<BookingDetails[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "confirmed" | "all">("pending");
  const [bindUserId, setBindUserId] = useState("");
  const [isBinding, setIsBinding] = useState(false);
  const [bindMessage, setBindMessage] = useState("");

  


  // 营业时间无极滑轨状态 (HUD 风格)
  const [openTime, setOpenTime] = useState(8); // 8:00
  const [closeTime, setCloseTime] = useState(22); // 22:00
  
  // 幽灵标签阵列状态 (Ghost Tags)
  const [activeServices, setActiveServices] = useState<string[]>(['haircut', 'color', 'spa']);
  const availableServices = [
    { id: 'haircut', label: '精密裁剪', icon: <Scissors className="w-3 h-3" /> },
    { id: 'color', label: '全息染色', icon: <Wand2 className="w-3 h-3" /> },
    { id: 'spa', label: '深层护理', icon: <Droplets className="w-3 h-3" /> },
    { id: 'perm', label: '结构重塑', icon: <Zap className="w-3 h-3" /> },
  ];

  const toggleService = (id: string) => {
    setActiveServices(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // MOCK 数据：数字印记 (Digital Footprints) 视频缩略图
  const mockFootprints = [
    { id: "1", title: "赛博空间漫游", views: "1.2W", duration: "00:15", cover: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=600&auto=format&fit=crop" },
    { id: "2", title: "霓虹下的美学", views: "8.5K", duration: "00:30", cover: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=600&auto=format&fit=crop" },
    { id: "3", title: "深渊咖啡馆打卡", views: "45K", duration: "01:05", cover: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=600&auto=format&fit=crop" },
    { id: "4", title: "未来医美体验", views: "3.2K", duration: "00:45", cover: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=600&auto=format&fit=crop" },
    { id: "5", title: "机械臂理疗", views: "900", duration: "00:20", cover: "https://images.unsplash.com/photo-1584820927498-cafe2c1c7669?q=80&w=600&auto=format&fit=crop" },
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

  const handleBindUser = async () => {
    if (!bindUserId.trim() || !shopId) return;
    setIsBinding(true);
    setBindMessage("");
    try {
      await BookingService.bindUserToShop(bindUserId.trim(), shopId);
      setBindMessage("绑定成功");
      setBindUserId("");
    } catch (err: any) {
      setBindMessage(`绑定失败: ${err.message}`);
    } finally {
      setIsBinding(false);
    }
  };





  const filteredBookings = bookings.filter(b => {
    if (activeTab === "all") return true;
    return b.status === activeTab;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative">
      


      {/* 顶部统计卡片与联邦集结舱 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard 
            label={t('txt_f49d92')} 
            value={bookings.filter(b => b.status === "pending").length} 
            icon={<Clock className="w-5 h-5" />}
            color="red"
          />
          <StatsCard 
            label={t('txt_733f4a')} 
            value={bookings.filter(b => b.status === "confirmed").length} 
            icon={<CheckCircle2 className="w-5 h-5" />}
            color="cyan"
          />
          <StatsCard 
            label={t('txt_5af2c6')} 
            value={0} 
            icon={<Calendar className="w-5 h-5" />}
            color="gold"
          />
        </div>


      </div>

      {/* 核心控制台 (全息驾驶舱风格) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 营业时间矩阵 (HUD 无极滑轨) */}
        <GlassCard className="p-6 border-white/5 relative overflow-hidden bg-transparent">
          {/* 绝对清透，无背景色，通过极细镂空流光边框界定 (这里用简单的发光代替复杂 mask) */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <Clock className="w-4 h-4 text-white/40" />
              <h3 className="text-xs font-bold tracking-widest uppercase">{t('txt_56374a')}</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div className="text-3xl font-mono tracking-tighter text-gx-cyan mix-blend-screen text-shadow-sm">
                  {openTime.toString().padStart(2, '0')}:00
                </div>
                <div className="text-[10px] text-white/20 uppercase tracking-widest pb-1">TO</div>
                <div className="text-3xl font-mono tracking-tighter text-gx-cyan mix-blend-screen text-shadow-sm">
                  {closeTime.toString().padStart(2, '0')}:00
                </div>
              </div>
              
              {/* 原生无极滑轨模拟 (此处为了快速验证，使用两个原生 range input 叠加) */}
              <div className="relative h-2 bg-white/5 rounded-full">
                <div 
                  className="absolute h-full bg-gx-cyan/30 rounded-full"
                  style={{ 
                    left: `${(openTime / 24) * 100}%`, 
                    right: `${100 - (closeTime / 24) * 100}%` 
                  }}
                />
                <input 
                  type="range" 
                  min="0" max="24" 
                  value={openTime} 
                  onChange={(e) => setOpenTime(Math.min(Number(e.target.value), closeTime - 1))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <input 
                  type="range" 
                  min="0" max="24" 
                  value={closeTime} 
                  onChange={(e) => setCloseTime(Math.max(Number(e.target.value), openTime + 1))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {/* 发光节点指示器 */}
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-gx-cyan rounded-full shadow-[0_0_10px_#00F0FF] pointer-events-none" style={{ left: `calc(${(openTime / 24) * 100}% - 6px)` }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-gx-cyan rounded-full shadow-[0_0_10px_#00F0FF] pointer-events-none" style={{ left: `calc(${(closeTime / 24) * 100}% - 6px)` }} />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* 服务节点阵列 (Ghost Tags) */}
        <GlassCard className="p-6 border-white/5 relative overflow-hidden bg-transparent">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-4 h-4 text-white/40" />
              <h3 className="text-xs font-bold tracking-widest uppercase">{t('txt_3697a3')}</h3>
            </div>
            
            <div className="flex flex-wrap gap-3 flex-1 content-start">
              {availableServices.map((service) => {
                const isActive = activeServices.includes(service.id);
                return (
                  <button
                    key={service.id}
                    onClick={() => toggleService(service.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono tracking-widest transition-all duration-300 border",
                      isActive 
                        ? "bg-gx-cyan/10 border-gx-cyan/30 text-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.15)]" 
                        : "bg-transparent border-white/5 text-white/20 hover:border-white/20 hover:text-white/40"
                    )}
                  >
                    {isActive ? <Power className="w-3 h-3 animate-pulse" /> : service.icon}
                    {service.label}
                  </button>
                );
              })}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 功能入口区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {industry !== 'none' && (
          <Link href={`/calendar/${industry || 'beauty'}?shopId=${activeShopId || shopId || 'default'}`} prefetch={false}>
            <GlassCard glowColor="cyan" className="p-6 group cursor-pointer hover:bg-white/5 transition-all relative overflow-hidden h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gx-cyan/5 blur-[60px] rounded-full group-hover:bg-gx-cyan/10 transition-all duration-500" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gx-cyan/10 border border-gx-cyan/20 flex items-center justify-center text-gx-cyan group-hover:scale-110 transition-transform duration-500">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">{t('txt_b170b6')}</h3>
                    <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono">{t('txt_a75625')}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-gx-cyan group-hover:translate-x-1 transition-all" />
              </div>
            </GlassCard>
          </Link>
        )}

        <Link href="/nebula" prefetch={false}>
          <GlassCard glowColor="purple" className="p-6 group cursor-pointer hover:bg-white/5 transition-all relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gx-purple/5 blur-[60px] rounded-full group-hover:bg-gx-purple/10 transition-all duration-500" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gx-purple/10 border border-gx-purple/20 flex items-center justify-center text-gx-purple group-hover:scale-110 transition-transform duration-500">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">{t('txt_9f7256')}</h3>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono">{t('txt_66cf43')}</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-gx-purple group-hover:translate-x-1 transition-all" />
            </div>
          </GlassCard>
        </Link>
      </div>

      {/* 实时列表区域 */}
      <GlassCard className="p-6 border-gx-admin-red/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gx-admin-red/10 border border-gx-admin-red/20 flex items-center justify-center text-gx-admin-red">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tighter uppercase">{t('txt_932519')}</h2>
              <p className="text-white/40 text-[10px] font-mono">GX-LIVE-SYNC: ACTIVE</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
            <TabButton active={activeTab === "pending"} onClick={() => setActiveTab("pending")}>{t('txt_047109')}</TabButton>
            <TabButton active={activeTab === "confirmed"} onClick={() => setActiveTab("confirmed")}>{t('txt_4113e7')}</TabButton>
            <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")}>{t('txt_a8b0c2')}</TabButton>
          </div>
        </div>

        {/* 订单列表 */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => (
                <BookingItem key={booking.id} booking={booking} />
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 text-center space-y-4"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center text-white/20">
                  <Filter className="w-8 h-8" />
                </div>
                <p className="text-white/40 text-sm font-light">{t('txt_afddef')}</p>
              </motion.div>
            )}
          </AnimatePresence>
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

      {/* 员工绑定管理区 */}
      <GlassCard className="p-6 border-gx-cyan/20">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gx-cyan/10 border border-gx-cyan/20 flex items-center justify-center text-gx-cyan">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tighter uppercase">{t('txt_2882c0')}</h2>
            <p className="text-white/40 text-[10px] font-mono">DYNAMIC_AUTH_SYSTEM</p>
          </div>
        </div>
        
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <label className="text-xs text-white/60 uppercase font-mono">{t('txt_ab459e')}</label>
            <Input 
              placeholder={t('txt_5cd6e4')} 
              value={bindUserId}
              onChange={(e) => setBindUserId(e.target.value)}
              className="font-mono"
            />
            <p className="text-[10px] text-white/40">{t('txt_c95928')}</p>
          </div>
          
          <Button 
            variant="cyan" 
            onClick={handleBindUser} 
            disabled={isBinding || !bindUserId.trim()}
            className="w-full md:w-auto"
          >
            {isBinding ? t('txt_e19eb4') : "建立系统关联"}
          </Button>
          
          {bindMessage && (
            <p className={cn("text-xs font-mono mt-2", bindMessage.includes("成功") ? "text-gx-cyan" : "text-gx-admin-red")}>
              {bindMessage.replace(/ \/ .*/, '')}
            </p>
          )}
        </div>
      </GlassCard>

      {/* 系统底层锚点 (System Anchor) - 融合胶囊 */}
      <div className="pt-6 pb-6 w-full flex items-center justify-center px-2">
        <PhoneAuthBar initialPhone={profile?.phone || ""} className="max-w-none mx-0 w-auto" />
      </div>
    </div>
  );
};

// --- 子组件 ---

const StatsCard = ({ label, value, icon, color }: StatsCardProps) => (
  <GlassCard 
    glowColor={color === "red" ? "danger" : color === "cyan" ? "cyan" : "purple"}
    className="p-6 group hover:bg-white/5 transition-all"
  >
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono">{label}</p>
        <p className="text-3xl font-bold tracking-tighter">{value}</p>
      </div>
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
        color === "red" ? "bg-gx-admin-red/10 text-gx-admin-red group-hover:bg-gx-admin-red/20" :
        color === "cyan" ? "bg-gx-cyan/10 text-gx-cyan group-hover:bg-gx-cyan/20" :
        "bg-gx-gold/10 text-gx-gold group-hover:bg-gx-gold/20"
      )}>
        {icon}
      </div>
    </div>
  </GlassCard>
);

const TabButton = ({ active, children, onClick }: TabButtonProps) => (
  <button 
    onClick={onClick}
    className={cn(
      "px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all",
      active ? "bg-gx-admin-red text-white shadow-[0_0_15px_rgba(255,45,85,0.4)]" : "text-white/40 hover:text-white/60"
    )}
  >
    {children}
  </button>
);

const BookingItem = ({ booking }: { booking: BookingDetails }) => (
  <motion.div
    layout
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="group relative"
  >
    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-12 bg-gx-admin-red opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow-[0_0_10px_#FF2D55]" />
    
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10 transition-all flex flex-col md:flex-row md:items-center gap-6">
      {/* 客户信息 */}
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-sm font-bold tracking-tight">{booking.customerName}</span>
          <span className="px-2 py-0.5 rounded text-[9px] bg-white/5 border border-white/10 text-white/40 font-mono">
            {booking.id?.slice(0, 8)}
          </span>
        </div>
        <p className="text-xs text-white/40 font-light">{booking.customerPhone}</p>
      </div>

      {/* 服务信息 */}
      <div className="flex-1">
        <p className="text-[10px] text-gx-gold uppercase tracking-widest font-bold mb-1">{booking.serviceName}</p>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Calendar className="w-3 h-3" />
          <span>{booking.date}</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <Clock className="w-3 h-3 ml-1" />
          <span>{booking.timeSlot}</span>
        </div>
      </div>

      {/* 状态与操作 */}
      <div className="flex items-center gap-4">
        <div className={cn(
          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter border",
          booking.status === "pending" ? "bg-gx-admin-red/10 border-gx-admin-red/20 text-gx-admin-red" :
          "bg-gx-cyan/10 border-gx-cyan/20 text-gx-cyan"
        )}>
          {booking.status === "pending" ? "待处理" : "已确认"}
        </div>
        
        <div className="flex items-center gap-2">
          {booking.status === "pending" && (
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-gx-cyan hover:bg-gx-cyan/10">
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-white/20 hover:text-white/40">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  </motion.div>
);
