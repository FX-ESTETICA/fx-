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
  ArrowRight
} from "lucide-react";
import { useState, useEffect } from "react";
import { BookingDetails } from "@/features/booking/types";
import { BookingService } from "@/features/booking/api/booking";
import { MerchantBookingAdapter } from "@/features/booking/utils/adapter";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { Input } from "@/components/shared/Input";
import { Users } from "lucide-react";

interface MerchantDashboardProps {
  merchantId: string;
  shopId?: string;
  industry?: string | null;
  onIndustrySet?: (industry: string) => void;
}

/**
 * MerchantDashboard - 商家端管理看板
 * 采用 Admin Red (#FF2D55) 视觉规范
 */
export const MerchantDashboard = ({ merchantId, shopId, industry, onIndustrySet }: MerchantDashboardProps) => {
  const [bookings, setBookings] = useState<BookingDetails[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "confirmed" | "all">("pending");
  const [bindUserId, setBindUserId] = useState("");
  const [isBinding, setIsBinding] = useState(false);
  const [bindMessage, setBindMessage] = useState("");
  const [showIndustryModal, setShowIndustryModal] = useState(false);
  const [isSavingIndustry, setIsSavingIndustry] = useState(false);

  // 1. 初始化数据加载
  useEffect(() => {
    // 强制行业选择 Onboarding
    if (!industry) {
      setShowIndustryModal(true);
    } else {
      setShowIndustryModal(false);
    }
  }, [industry]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        // 此处在实际项目中应调用针对商家的 API，目前暂用全量订阅模拟
        // TODO: 替换为具体的商家订单查询 API
        console.log(`[MerchantDashboard] Initializing for merchant: ${merchantId}`);
      } catch (error) {
        console.error("Failed to fetch merchant bookings:", error);
      }
    };

    fetchBookings();
  }, [merchantId]);

  // 2. 实时状态监听
  useEffect(() => {
    // 订阅所有预约变更（模拟商家端实时看板）
    const channel = BookingService.subscribeToAllBookings((payload: any) => {
      console.log("[MerchantDashboard] New event received:", payload);
      
      if (payload.eventType === "INSERT") {
        const newBooking = MerchantBookingAdapter.fromDBList([payload.new])[0];
        setBookings(prev => [newBooking, ...prev]);
        // 触发一个全局通知（逻辑占位）
      } else if (payload.eventType === "UPDATE") {
        const updatedBooking = MerchantBookingAdapter.fromDBList([payload.new])[0];
        setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
      }
    });

    return () => {
      if (channel) BookingService.unsubscribe(channel);
    };
  }, []);

  const handleBindUser = async () => {
    if (!bindUserId.trim() || !shopId) return;
    setIsBinding(true);
    setBindMessage("");
    try {
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_bindings",
          payload: { userId: bindUserId.trim(), shopId }
        })
      });
      if (res.ok) {
        setBindMessage("绑定成功 / Bound successfully!");
        setBindUserId("");
      } else {
        setBindMessage("绑定失败 / Binding failed");
      }
    } catch (e) {
      setBindMessage("网络错误 / Network error");
    } finally {
      setIsBinding(false);
    }
  };

  const handleSetIndustry = async (selectedIndustry: string) => {
    if (!shopId) return;
    setIsSavingIndustry(true);
    try {
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_shop_config",
          payload: { shopId, industry: selectedIndustry }
        })
      });
      if (res.ok) {
        setShowIndustryModal(false);
        if (onIndustrySet) onIndustrySet(selectedIndustry);
      }
    } catch (e) {
      console.error("Failed to set industry:", e);
    } finally {
      setIsSavingIndustry(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (activeTab === "all") return true;
    return b.status === activeTab;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative">
      
      {/* 行业选择强制弹窗 (Onboarding) */}
      <AnimatePresence>
        {showIndustryModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-3xl"
          >
            <GlassCard className="p-8 max-w-md w-full border-gx-admin-red/30 shadow-[0_0_50px_rgba(255,45,85,0.2)]">
              <h2 className="text-2xl font-bold mb-2 tracking-tighter">请选择您的经营行业</h2>
              <p className="text-white/40 text-xs mb-8">Select your industry. This will determine your calendar features.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="ghost" 
                  className="h-24 flex flex-col items-center justify-center gap-2 border border-white/10 hover:border-gx-cyan/50 hover:bg-gx-cyan/10"
                  onClick={() => handleSetIndustry('beauty')}
                  disabled={isSavingIndustry}
                >
                  <span className="text-xl">💅</span>
                  <span className="text-xs tracking-widest uppercase">美业 / Beauty</span>
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="h-24 flex flex-col items-center justify-center gap-2 border border-white/10 hover:border-gx-purple/50 hover:bg-gx-purple/10"
                  onClick={() => handleSetIndustry('expert')}
                  disabled={isSavingIndustry}
                >
                  <span className="text-xl">💆</span>
                  <span className="text-xs tracking-widest uppercase">专家 / Expert</span>
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard 
          label="待处理 / Pending" 
          value={bookings.filter(b => b.status === "pending").length} 
          icon={<Clock className="w-5 h-5" />}
          color="red"
        />
        <StatsCard 
          label="已确认 / Confirmed" 
          value={bookings.filter(b => b.status === "confirmed").length} 
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="cyan"
        />
        <StatsCard 
          label="今日预约 / Today" 
          value={0} 
          icon={<Calendar className="w-5 h-5" />}
          color="gold"
        />
      </div>

      {/* 功能入口区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href={`/calendar/${industry || 'beauty'}?shopId=${shopId || 'default'}`}>
          <GlassCard glowColor="cyan" className="p-6 group cursor-pointer hover:bg-white/5 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gx-cyan/5 blur-[60px] rounded-full group-hover:bg-gx-cyan/10 transition-all duration-500" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gx-cyan/10 border border-gx-cyan/20 flex items-center justify-center text-gx-cyan group-hover:scale-110 transition-transform duration-500">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">日历后台 / Calendar</h3>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono">Manage Bookings & Slots</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-gx-cyan group-hover:translate-x-1 transition-all" />
            </div>
          </GlassCard>
        </Link>

        <Link href="/nebula">
          <GlassCard glowColor="purple" className="p-6 group cursor-pointer hover:bg-white/5 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gx-purple/5 blur-[60px] rounded-full group-hover:bg-gx-purple/10 transition-all duration-500" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gx-purple/10 border border-gx-purple/20 flex items-center justify-center text-gx-purple group-hover:scale-110 transition-transform duration-500">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">星云入口 / Nebula</h3>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono">WebGL Visual Engine</p>
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
              <h2 className="text-xl font-bold tracking-tighter uppercase">预约看板 / Live Feed</h2>
              <p className="text-white/40 text-[10px] font-mono">GX-LIVE-SYNC: ACTIVE</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
            <TabButton active={activeTab === "pending"} onClick={() => setActiveTab("pending")}>待处理</TabButton>
            <TabButton active={activeTab === "confirmed"} onClick={() => setActiveTab("confirmed")}>已确认</TabButton>
            <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")}>全部</TabButton>
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
                <p className="text-white/40 text-sm font-light">暂无相关预约记录 / No bookings found</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>

      {/* 员工绑定管理区 */}
      <GlassCard className="p-6 border-gx-cyan/20">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gx-cyan/10 border border-gx-cyan/20 flex items-center justify-center text-gx-cyan">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tighter uppercase">人员绑定 / Staff Binding</h2>
            <p className="text-white/40 text-[10px] font-mono">DYNAMIC_AUTH_SYSTEM</p>
          </div>
        </div>
        
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <label className="text-xs text-white/60 uppercase font-mono">前端绑定 ID / Frontend ID</label>
            <Input 
              placeholder="例如: GX_USR_1001" 
              value={bindUserId}
              onChange={(e) => setBindUserId(e.target.value)}
              className="font-mono"
            />
            <p className="text-[10px] text-white/40">绑定后该用户可直接在其「我的」界面进入专属管理日历。</p>
          </div>
          
          <Button 
            variant="cyan" 
            onClick={handleBindUser} 
            disabled={isBinding || !bindUserId.trim()}
            className="w-full md:w-auto"
          >
            {isBinding ? "绑定中..." : "建立系统关联 / Link"}
          </Button>
          
          {bindMessage && (
            <p className={cn("text-xs font-mono mt-2", bindMessage.includes("成功") ? "text-gx-cyan" : "text-gx-admin-red")}>
              {bindMessage}
            </p>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

// --- 子组件 ---

const StatsCard = ({ label, value, icon, color }: any) => (
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

const TabButton = ({ active, children, onClick }: any) => (
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
          {booking.status === "pending" ? "待处理 / Pending" : "已确认 / Confirmed"}
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
