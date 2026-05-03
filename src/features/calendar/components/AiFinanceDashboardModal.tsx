"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, TrendingUp, TrendingDown, Minus, Crown, Target, Users, UserPlus, Wallet, ShoppingBag } from "lucide-react";
import { cn } from "@/utils/cn";
import { BookingEdit } from "@/features/booking/components/DualPaneBookingModal";
import { StaffItem } from "@/features/calendar/components/NebulaConfigHub";
import { useMemo } from "react";

import { useVisualSettings } from "@/hooks/useVisualSettings";

// --- 顶级可视化图表组件 (Bento Box Graphical Assets) ---

const SmoothAreaChart = ({ data, color, className }: { data: number[], color: string, className?: string }) => {
  // 如果全是 0，给个极小值维持线形
  const safeData = data.every(d => d === 0) ? data.map(() => 1) : data;
  const max = Math.max(...safeData);
  const min = Math.min(...safeData);
  const range = max - min || 1;
  
  const points = safeData.map((d, i) => ({
    x: (i / (safeData.length - 1)) * 100,
    y: 100 - ((d - min) / range) * 80 - 10 // 预留上下 10% 边距
  }));

  if (points.length === 0) return null;

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cx = (curr.x + next.x) / 2;
    d += ` C ${cx},${curr.y} ${cx},${next.y} ${next.x},${next.y}`;
  }
  
  const areaPath = `${d} L 100,100 L 0,100 Z`;

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("w-full h-full", className)}>
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#gradient-${color.replace('#', '')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
    </svg>
  );
};

const DonutChart = ({ data, className }: { data: { value: number, color: string, label: string }[], className?: string }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentOffset = 0;
  const radius = 35; // Reduce radius to leave room for stroke width
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 drop-shadow-[0_0_10px_rgba(0,0,0,0.2)]">
        {total === 0 ? (
           <circle cx="50" cy="50" r={radius} fill="transparent" stroke="rgba(150,150,150,0.1)" strokeWidth="12" />
        ) : (
          data.map((d, i) => {
            if (d.value === 0) return null;
            const percentage = d.value / total;
            const dash = percentage * circumference;
            const gap = circumference - dash;
            const offset = -(currentOffset / total) * circumference;
            currentOffset += d.value;

            return (
              <circle
                key={i}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={d.color}
                strokeWidth="12"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                className="transition-all duration-1000 ease-out"
              />
            );
          })
        )}
      </svg>
      {/* 中间留白区可放置动态信息 */}
    </div>
  );
};

interface AiFinanceDashboardModalProps {
 isOpen: boolean;
 onClose: () => void;
 staffs?: StaffItem[];
 globalBookings?: BookingEdit[];
 isFinanceSelfOnly?: boolean;
 currentUserId?: string;
}

type TimeRange = 'day' | 'week' | 'month' | 'quarter' | 'year';

export const AiFinanceDashboardModal = ({ isOpen, onClose, staffs = [], globalBookings = [], isFinanceSelfOnly, currentUserId }: AiFinanceDashboardModalProps) => {
 const [timeRange, setTimeRange] = useState<TimeRange>('day');
 const { settings } = useVisualSettings();
 const isLight = settings.headerTitleColorTheme === 'coreblack';

 // --- 核心真实数据核算逻辑 (Real-time Financial Engine) ---
 
 const financialData = useMemo(() => {
 // 权限隔离过滤
 const filteredBookings = isFinanceSelfOnly 
 ? globalBookings.filter(b => b.resourceId === currentUserId || (b as any).assignedEmployeeId === currentUserId) 
 : globalBookings;
 const filteredStaffs = isFinanceSelfOnly 
 ? staffs.filter(s => s.id === currentUserId || s.frontendId === currentUserId) 
 : staffs;

 // 动态时间窗引擎
 const now = new Date();
 now.setHours(0, 0, 0, 0);

 let currStart = new Date(now);
 let currEnd = new Date(now);
 let prevStart = new Date(now);
 let prevEnd = new Date(now);

 if (timeRange === 'day') {
 currStart = new Date(now);
 currEnd = new Date(now);
 prevStart = new Date(now);
 prevStart.setDate(prevStart.getDate() - 1);
 prevEnd = new Date(prevStart);
 } else if (timeRange === 'week') {
 const day = now.getDay();
 const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
 currStart = new Date(now.setDate(diffToMonday));
 currEnd = new Date(currStart);
 currEnd.setDate(currEnd.getDate() + 6);

 prevStart = new Date(currStart);
 prevStart.setDate(prevStart.getDate() - 7);
 prevEnd = new Date(currEnd);
 prevEnd.setDate(prevEnd.getDate() - 7);
 } else if (timeRange === 'month') {
 currStart = new Date(now.getFullYear(), now.getMonth(), 1);
 currEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

 prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
 prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
 } else if (timeRange === 'quarter') {
 const quarter = Math.floor(now.getMonth() / 3);
 currStart = new Date(now.getFullYear(), quarter * 3, 1);
 currEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0);

 prevStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
 prevEnd = new Date(now.getFullYear(), (quarter - 1) * 3 + 3, 0);
 } else if (timeRange === 'year') {
 currStart = new Date(now.getFullYear(), 0, 1);
 currEnd = new Date(now.getFullYear(), 11, 31);

 prevStart = new Date(now.getFullYear() - 1, 0, 1);
 prevEnd = new Date(now.getFullYear() - 1, 11, 31);
 }

 const currentBookings: BookingEdit[] = [];
 const prevBookings: BookingEdit[] = [];

 filteredBookings.forEach(b => {
 if (!b.date) return;
 const isCompleted = (b.status as string)?.toUpperCase() === 'COMPLETED' || (b.status as string)?.toUpperCase() === 'CHECKED_OUT';
 if (!isCompleted) return;

 const bDate = new Date(b.date.replace(/-/g, '/'));
 bDate.setHours(0, 0, 0, 0);

 if (bDate >= currStart && bDate <= currEnd) {
 currentBookings.push(b);
 } else if (bDate >= prevStart && bDate <= prevEnd) {
 prevBookings.push(b);
 }
 });

 let totalRevenue = 0;
 // 重构：与收银台支付渠道完全一致 (1:1 同构)
 let wechatRevenue = 0;
 let alipayRevenue = 0;
 let cashRevenue = 0;
 let bankCardRevenue = 0;
 let memberCardRevenue = 0;

 // 初始化所有员工的业绩桶 (即使业绩为 0 也要展示在榜单上)
 const staffPerformance: Record<string, { revenue: number, commissionRate: number, baseSalary: number, guarantee: number, daysOff: number, name: string, role: string, avatar: string }> = {};
 
 // 只展示有效员工（排除了假员工比如 "散客池 NO"）
 const validStaffs = filteredStaffs.filter(s => s.id !== 'NO');
 validStaffs.forEach(staff => {
 const s = staff as any;
 staffPerformance[staff.id] = {
 revenue: 0,
 commissionRate: s.commissionRate !== undefined && s.commissionRate !== null ? s.commissionRate : 20, // 严格读取真实配置，默认为 20
 baseSalary: s.baseSalary || 0,
 guarantee: s.guarantee || 0,
 daysOff: s.daysOff ?? 4,
 name: s.name,
 role: s.role || '技师',
 avatar: s.avatar || '👩‍🎨', // 忽略 avatar 类型报错
 };
 });

 // 2. 深入每个已结账订单，拆解其服务项目，分配业绩给对应的技师
 
 // --- 新增：真实时间轴趋势数据 (Timeline Data for Sparkline) ---
 const timelinePoints = timeRange === 'day' ? 12 : timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 12;
 const timelineData = Array(timelinePoints).fill(0);

 currentBookings.forEach(booking => {
 // 解析支付方式，默认为现金
 const method = (booking.paymentMethod as string) || '现金';
 
 // --- 时间轴分配逻辑 ---
 let pointIndex = 0;
 const bDate = new Date(booking.date!.replace(/-/g, '/'));
 if (timeRange === 'day') {
 const hour = booking.startTime ? parseInt(booking.startTime.split(':')[0]) : 12;
 pointIndex = Math.max(0, Math.min(11, hour - 9)); // 9:00 - 20:00 (12 slots)
 } else if (timeRange === 'week') {
 pointIndex = bDate.getDay() === 0 ? 6 : bDate.getDay() - 1; // 0-6 (Mon-Sun)
 } else if (timeRange === 'month') {
 pointIndex = Math.max(0, Math.min(29, bDate.getDate() - 1));
 } else {
 pointIndex = Math.max(0, Math.min(11, bDate.getMonth()));
 }

 if (booking.services && Array.isArray(booking.services)) {
 booking.services.forEach((service: any) => {
 const servicePrice = (Array.isArray(service.prices) && service.prices.length > 0) ? Number(service.prices[0]) : 0;
 totalRevenue += servicePrice;
 timelineData[pointIndex] += servicePrice; // 累加到时间轴
 
 // 精准渠道分流 (与 DualPaneBookingModal 的 PAYMENT_METHODS 对齐)
 if (method === '微信') wechatRevenue += servicePrice;
 else if (method === '支付宝') alipayRevenue += servicePrice;
 else if (method === '现金') cashRevenue += servicePrice;
 else if (method === '银行卡') bankCardRevenue += servicePrice;
 else if (method === '会员卡扣款') memberCardRevenue += servicePrice;
 else cashRevenue += servicePrice; // 兜底算现金
 
 // 查找业绩归属技师：优先看服务项有没有指定，没有就看整个订单挂在谁身上
 const empId = service.assignedEmployeeId || booking.resourceId;
 if (empId && staffPerformance[empId]) {
 staffPerformance[empId].revenue += servicePrice;
 }
 });
 }
 });

 // 3. 计算上一周期营业额增幅
 let prevTotal = 0;
 prevBookings.forEach(booking => {
 if (booking.services && Array.isArray(booking.services)) {
 booking.services.forEach((service: any) => {
 const servicePrice = (Array.isArray(service.prices) && service.prices.length > 0) ? Number(service.prices[0]) : 0;
 prevTotal += servicePrice;
 });
 }
 });

 let trendPercentage = 0;
 if (prevTotal === 0) {
 trendPercentage = totalRevenue > 0 ? 100 : 0;
 } else {
 trendPercentage = ((totalRevenue - prevTotal) / prevTotal) * 100;
 }

 const staffRanking = Object.values(staffPerformance)
 .map(sp => {
 // AI 动态目标推演算法
 const b = sp.baseSalary;
 const g = sp.guarantee;
 const r = sp.commissionRate;
 const d = sp.daysOff;
 
 const todayDate = new Date();
 const daysInMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
 const workDays = Math.max(1, daysInMonth - d);
 
 let target = 0;
 let isBoss = false;

 if (b === 0 && g === 0 && r === 0) {
 isBoss = true; // 老板模式
 } else if (g > 0 && r > 0) {
 const monthTarget = Math.round(g / (r / 100));
 const dailyTarget = Math.round(monthTarget / workDays);
 
 // 根据不同的时间窗口放大目标金额
 if (timeRange === 'day') target = dailyTarget;
 else if (timeRange === 'week') target = dailyTarget * Math.max(1, (7 - Math.round((d/daysInMonth)*7))); // 粗略估算每周工作天数
 else if (timeRange === 'month') target = monthTarget;
 else if (timeRange === 'quarter') target = monthTarget * 3;
 else if (timeRange === 'year') target = monthTarget * 12;
 
 target = Math.round(target);
 } else {
 // 纯底薪或纯提成暂无强制硬性日考核
 target = 0;
 }

 return {
 id: sp.name, // 用于 key
 name: sp.name,
 role: sp.role,
 avatar: sp.avatar,
 revenue: sp.revenue,
 target: target,
 isBoss: isBoss,
 commission: Math.round(sp.revenue * (sp.commissionRate / 100)),
 rate: sp.commissionRate, // 传递原始数字
 rateStr: `${sp.commissionRate}%`
 };
 })
 .sort((a, b) => b.revenue - a.revenue);

 // 4. 动态计算爆款服务排行 (Service ROI)
 const servicePerformance: Record<string, { revenue: number, count: number, name: string }> = {};
 currentBookings.forEach(booking => {
 if (booking.services && Array.isArray(booking.services)) {
 booking.services.forEach((service: any) => {
 const servicePrice = (Array.isArray(service.prices) && service.prices.length > 0) ? Number(service.prices[0]) : 0;
 const sName = service.name || '未知项目';
 if (!servicePerformance[sName]) {
 servicePerformance[sName] = { revenue: 0, count: 0, name: sName };
 }
 servicePerformance[sName].revenue += servicePrice;
 servicePerformance[sName].count += 1;
 });
 }
 });
 
 const serviceRanking = Object.values(servicePerformance)
 .map((sp, idx) => ({
 id: String(idx),
 name: sp.name,
 type: sp.revenue / sp.count >= 100 ? '利润款' : '走量款', // 智能打标签：客单价大于100定为利润款
 revenue: sp.revenue,
 count: sp.count
 }))
 .sort((a, b) => b.revenue - a.revenue)
 .slice(0, 5); // 仅展示 Top 5

 // 5. 战术模块指标计算 (Tactical Metrics Engine)
 const totalCustomers = currentBookings.length;
 let newCustomerCount = 0;
 let returningCustomerCount = 0;
 
 currentBookings.forEach(booking => {
 // 这里简易模拟新老客判定（如果有真实标签可替换）
 if (booking.customerId) {
 returningCustomerCount++;
 } else {
 newCustomerCount++;
 }
 });

 const newRatio = totalCustomers > 0 ? Math.round((newCustomerCount / totalCustomers) * 100) : 0;
 const returningRatio = totalCustomers > 0 ? 100 - newRatio : 0;
 const atv = totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0;

 // 储值与零售数据（目前无真实表，暂时模拟为0或演示数据）
 const topUps = 0; 
 const conversionRate = 0;
 const retailRevenue = 0; 
 const upsellRate = 0;
 const retailRatio = totalRevenue > 0 ? Math.round((retailRevenue / totalRevenue) * 100) : 0;

 return {
 totalRevenue,
 wechatRevenue,
 alipayRevenue,
 cashRevenue,
 bankCardRevenue,
 memberCardRevenue,
 timelineData, // <-- 新增
 trendPercentage,
 staffRanking,
 serviceRanking,
 tacticalMetrics: {
 totalCustomers,
 newRatio,
 returningRatio,
 atv,
 topUps,
 conversionRate,
 retailRevenue,
 upsellRate,
 retailRatio
 }
 };
 }, [globalBookings, staffs, timeRange, isFinanceSelfOnly, currentUserId]);

 const currentMetrics = {
 total: financialData.totalRevenue,
 wechat: financialData.wechatRevenue,
 alipay: financialData.alipayRevenue,
 cash: financialData.cashRevenue,
 bankCard: financialData.bankCardRevenue,
 memberCard: financialData.memberCardRevenue,
 timeline: financialData.timelineData, // <-- 新增
 trend: financialData.trendPercentage,
 tactical: financialData.tacticalMetrics
 };

 const trend = currentMetrics.trend || 0;
 const isPositive = trend > 0;
 const isNegative = trend < 0;

 const staffRanking = financialData.staffRanking;
 const serviceRanking = financialData.serviceRanking;

 if (!isOpen) return null;

 return (
 <AnimatePresence>
 <div className={cn(
 "fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-8 animate-in fade-in",
 isLight ? "text-black" : "text-white"
 )}>
 {/* 背景暗场遮罩：取消黑色，使用和预约窗一致的透明层 */}
 <div 
 onClick={onClose}
 className="fixed inset-0 pointer-events-auto bg-transparent"
 />

 <motion.div
 
 
 
 
 className={cn(
 "relative z-10 w-full max-w-6xl h-[85vh] rounded-2xl flex flex-col overflow-hidden pointer-events-none",
 )}
 >
 {/* Header */}
 <div className={cn(
 "h-16 flex items-center justify-between px-6 pointer-events-auto rounded-t-2xl",
 )}>
 <div className="flex items-center gap-3">
 <div className={cn(
 "w-8 h-8 rounded-full border flex items-center justify-center",
 isLight 
 ? "bg-purple-500/10 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)] backdrop-blur-md" 
 : "bg-purple-500/20 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] backdrop-blur-md"
 )}>
 <Sparkles className={cn("w-4 h-4", isLight ? "text-purple-600" : "text-purple-400")} />
 </div>
 <div className="flex flex-col drop-shadow-sm">
 <h2 className={cn("text-sm tracking-widest", isLight ? "text-black font-semibold" : "text-white font-semibold")}>AI 财务核心舱</h2>
 <span className={cn("text-[13px] uppercase tracking-widest", isLight ? "text-purple-600 font-medium" : "text-purple-400 font-medium")}>Financial Intelligence Hub</span>
 </div>
 </div>

 <div className={cn(
 "flex items-center gap-2 p-1 rounded-lg border pointer-events-auto backdrop-blur-md",
 isLight ? "bg-black/5 border-black/10 shadow-sm" : "bg-white/5 border-white/10 shadow-sm"
 )}>
 {(['day', 'week', 'month', 'quarter', 'year'] as TimeRange[]).map((range) => (
 <button
 key={range}
 onClick={() => setTimeRange(range)}
 className={cn(
 "px-4 py-1.5 rounded-md text-[13px] uppercase tracking-widest ",
 timeRange === range 
 ? (isLight ? "bg-purple-500/10 text-purple-700 border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]" : "bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]")
 : (isLight ? "text-black hover:text-black hover:bg-black/5 border border-transparent" : "text-white hover:text-white hover:bg-white/5 border border-transparent")
 )}
 >
 {range === 'day' ? '今日' : range === 'week' ? '本周' : range === 'month' ? '本月' : range === 'quarter' ? '季度' : '年度'}
 </button>
 ))}
 </div>

 <button onClick={onClose} className={cn(
 "w-8 h-8 flex items-center justify-center rounded-full pointer-events-auto backdrop-blur-md",
 isLight ? "hover:bg-black/10 text-black hover:text-black bg-black/5" : "hover:bg-white/20 text-white hover:text-white bg-white/10"
 )}>
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Scrollable Content */}
 <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide pointer-events-auto">
 
 {/* Bento Box Top Section */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
   
   {/* Col 1 & 2: Revenue Area Chart (Bento Large Block) */}
     <div className={cn(
        "lg:col-span-2 lg:row-span-3 rounded-2xl p-8 flex flex-col relative overflow-hidden group border",
         isLight ? "bg-transparent border-black/10 shadow-[0_2px_10px_rgba(0,0,0,0.05)]" : "bg-transparent border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
       )}>

      {/* Super Block: Gross Revenue + Traffic */}
       <div className="flex relative z-10 mb-10 items-stretch">
         
         {/* Left: Giant Money */}
         <div className="flex-1 flex flex-col justify-center">
           <span className={cn("text-[13px] uppercase tracking-widest flex items-center gap-2 mb-2", isLight ? "text-black/50" : "text-white/50")}>
             <Crown className="w-3.5 h-3.5" />
             总营业额 (Gross Revenue)
           </span>
           <span className={cn("text-7xl  tracking-tighter drop-shadow-sm leading-none", isLight ? "text-black" : "text-white")}>
             €{currentMetrics.total.toLocaleString()}
           </span>
           <div className="mt-4 flex items-center gap-2">
             <div className={cn("inline-flex items-center gap-1 text-sm  px-3 py-1.5 rounded border", isPositive ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : isNegative ? "text-rose-500 bg-rose-500/10 border-rose-500/20" : (isLight ? "text-black/60 bg-black/5 border-black/10" : "text-white/60 bg-white/5 border-white/10"))}>
               {isPositive ? <TrendingUp className="w-4 h-4" /> : isNegative ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
               <span>{isPositive ? '+' : ''}{trend.toFixed(1)}% vs Prev</span>
             </div>
           </div>
         </div>
 
         {/* Divider Vertical */}
         <div className={cn("w-[1px] mx-8", isLight ? "bg-black/10" : "bg-white/10")} />
 
         {/* Right: People & ATV (Stacked vertically) */}
         <div className="w-56 flex flex-col justify-between">
           
           {/* Top: Traffic */}
           <div className="flex flex-col gap-1">
             <span className={cn("text-[13px] uppercase tracking-widest flex items-center gap-2", isLight ? "text-gx-cyan/70" : "text-gx-cyan/70")}>
               <Users className="w-3.5 h-3.5" />
               客流 (Traffic)
             </span>
             <div className="flex items-baseline gap-2 mt-1">
               <span className={cn("text-4xl  tracking-tighter leading-none", isLight ? "text-black" : "text-white")}>{currentMetrics.tactical.totalCustomers}</span>
               <span className={cn("text-[13px] uppercase tracking-widest", isLight ? "text-black/50" : "text-white/50")}>PAX</span>
             </div>
             
             {/* New/Returning Ratio Bar */}
             <div className="flex flex-col gap-1 mt-2">
               <div className="flex justify-between text-[13px]  uppercase tracking-widest">
                 <span className="text-blue-400">New {currentMetrics.tactical.newRatio}%</span>
                 <span className="text-purple-400">Ret {currentMetrics.tactical.returningRatio}%</span>
               </div>
               <div className={cn("w-full h-1 rounded-full overflow-hidden flex", isLight ? "bg-black/5" : "bg-white/5")}>
                 <div className="h-full bg-blue-400" style={{ width: `${currentMetrics.tactical.newRatio}%` }} />
                 <div className="h-full bg-purple-400" style={{ width: `${currentMetrics.tactical.returningRatio}%` }} />
               </div>
             </div>
           </div>
 
           {/* Bottom: ATV */}
           <div className="flex flex-col gap-1 mt-5">
             <span className={cn("text-[13px] uppercase tracking-widest flex items-center gap-2", isLight ? "text-black/50" : "text-white/50")}>
               <Target className="w-3.5 h-3.5" />
               客单价 (ATV)
             </span>
             <div className="flex items-baseline gap-2 mt-1">
               <span className={cn("text-3xl  tracking-tighter leading-none", isLight ? "text-black" : "text-white")}>€{currentMetrics.tactical.atv}</span>
               <span className={cn("text-[13px] uppercase tracking-widest", isLight ? "text-black/50" : "text-white/50")}>/ PAX</span>
             </div>
           </div>
 
         </div>
       </div>

      {/* Smooth Area Chart */}
      <div className="absolute bottom-0 left-0 w-full h-[45%] z-0 mix-blend-screen pointer-events-none">
        <SmoothAreaChart data={currentMetrics.timeline} color={isLight ? "#A855F7" : "#A855F7"} className="opacity-60" />
      </div>
    </div>

   {/* Col 3: Tactical Stack (Donut Chart + Prepaid + Retail) */}
     <div className="flex flex-col gap-6">
       {/* 1. Payment Breakdown */}
       <div className={cn(
          "rounded-2xl p-6 flex flex-col relative border",
          isLight ? "bg-transparent border-black/10 shadow-[0_2px_10px_rgba(0,0,0,0.05)]" : "bg-transparent border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
        )}>
          <div className="flex items-center justify-between mb-4">
            <span className={cn("text-[13px] uppercase tracking-widest flex items-center gap-2", isLight ? "text-black/50" : "text-white/50")}>
              <Wallet className="w-3.5 h-3.5" />
              支付构成 (Structure)
            </span>
          </div>
  
          <div className="flex-1 flex items-center justify-between gap-4">
            <div className="w-32 h-32 relative shrink-0">
              <DonutChart 
                data={[
                  { label: 'WeChat', value: currentMetrics.wechat, color: '#07C160' },
                  { label: 'Alipay', value: currentMetrics.alipay, color: '#1677FF' },
                  { label: 'Cash', value: currentMetrics.cash, color: '#F59E0B' },
                  { label: 'Card', value: currentMetrics.bankCard, color: '#60A5FA' },
                  { label: 'Member', value: currentMetrics.memberCard, color: '#06B6D4' }
                ]} 
              />
            </div>
            
            {/* Aligned List */}
            <div className="flex-1 flex flex-col gap-2  text-[13px]">
              {[
                { label: '微信 (WECHAT)', value: currentMetrics.wechat, color: '#07C160' },
                { label: '支付宝 (ALIPAY)', value: currentMetrics.alipay, color: '#1677FF' },
                { label: '银行卡 (CARD)', value: currentMetrics.bankCard, color: '#60A5FA' },
                { label: '现金 (CASH)', value: currentMetrics.cash, color: '#F59E0B' },
                { label: '会员卡 (MEMBER)', value: currentMetrics.memberCard, color: '#06B6D4' }
              ].sort((a, b) => b.value - a.value).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className={cn(isLight ? "text-black/60" : "text-white/60")}>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(isLight ? "text-black/40" : "text-white/40")}>
                      {currentMetrics.total > 0 ? ((item.value / currentMetrics.total) * 100).toFixed(0) : 0}%
                    </span>
                    <span className={cn("w-14 text-right", isLight ? "text-black" : "text-white")}>
                      €{item.value.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

       {/* 2. Prepaid Engine */}
       <div className={cn(
        "rounded-2xl p-6 flex flex-col relative overflow-hidden group border",
         isLight ? "bg-transparent border-black/10 shadow-[0_2px_10px_rgba(0,0,0,0.05)]" : "bg-transparent border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
       )}>
         <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/10 rounded-br-full blur-2xl group-hover:bg-amber-500/20" />
         <div className="flex items-center justify-between mb-4 relative z-10">
           <span className="text-[13px] text-amber-500 uppercase tracking-widest flex items-center gap-2">
             <Wallet className="w-3.5 h-3.5" />
             新增充值 (Prepaid)
           </span>
         </div>
         
         <div className="flex items-baseline gap-2 relative z-10 mb-4">
           <span className="text-4xl  tracking-tighter text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
             €{currentMetrics.tactical.topUps.toLocaleString()}
           </span>
         </div>

         <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 relative z-10">
           <UserPlus className="w-4 h-4 text-amber-500 shrink-0" />
           <div className="flex flex-col">
             <span className="text-[13px]  text-amber-500/70 uppercase tracking-widest">Conv. Rate</span>
             <span className="text-[13px]  text-amber-500">{currentMetrics.tactical.conversionRate}% <TrendingUp className="inline w-3 h-3 ml-1" /></span>
           </div>
         </div>
       </div>

       {/* 3. Retail Engine */}
       <div className={cn(
        "rounded-2xl p-6 flex flex-col relative overflow-hidden group border",
         isLight ? "bg-transparent border-black/10 shadow-[0_2px_10px_rgba(0,0,0,0.05)]" : "bg-transparent border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
       )}>
         <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-br-full blur-2xl group-hover:bg-emerald-500/20" />
         <div className="flex items-center justify-between mb-4 relative z-10">
           <span className="text-[13px] text-emerald-500 uppercase tracking-widest flex items-center gap-2">
             <ShoppingBag className="w-3.5 h-3.5" />
             产品零售 (Retail)
           </span>
         </div>
         
         <div className="flex items-baseline gap-2 relative z-10 mb-4">
           <span className="text-4xl  tracking-tighter text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
             €{currentMetrics.tactical.retailRevenue.toLocaleString()}
           </span>
         </div>

         <div className="flex flex-col gap-1.5 relative z-10">
           <div className="flex justify-between text-[13px]  uppercase tracking-widest text-emerald-500/70">
             <span>Ratio</span>
             <span>{currentMetrics.tactical.retailRatio}%</span>
           </div>
           <div className={cn("w-full h-1 bg-emerald-500/20 rounded-full overflow-hidden")}>
             <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" style={{ width: `${currentMetrics.tactical.retailRatio}%` }} />
           </div>
         </div>
       </div>
     </div>
 </div>

 {/* Removed old Tactical Modules Section as it is now integrated into Bento Box */}
 
 {/* Bottom Row: Two Columns (Dual Horizontal Data Bars) */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 
 {/* Left: Staff Performance (Horizontal Bar Chart) */}
 <div className={cn(
    "rounded-2xl p-6 flex flex-col relative overflow-hidden group border",
    isLight ? "bg-transparent border-black/10 shadow-[0_2px_10px_rgba(0,0,0,0.05)]" : "bg-transparent border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
  )}>
   <div className={cn(isLight ? "flex items-center justify-between border-b border-black/5 pb-4 mb-6" : "flex items-center justify-between border-b border-white/5 pb-4 mb-6")}>
     <h3 className={cn(isLight ? "text-sm tracking-widest text-black flex items-center gap-2 uppercase" : "text-sm tracking-widest text-white flex items-center gap-2 uppercase")}>
       <Users className="w-4 h-4 text-blue-500" />
       技师血汗榜 (Staff Leaderboard)
     </h3>
     <span className={cn(isLight ? "text-[13px]  text-black/50" : "text-[13px]  text-white/50")}>Auto-calculated</span>
   </div>
 
   <div className="flex flex-col gap-5 relative">
     {staffRanking.map((staff, idx) => {
       const maxRevenue = Math.max(...staffRanking.map(s => s.revenue), 1);
       const percent = (staff.revenue / maxRevenue) * 100;
       
       return (
         <div key={staff.id} className="flex items-center gap-4 relative z-10 group">
           {/* Left: Avatar & Name (Fixed width) */}
           <div className="flex items-center gap-2 w-[100px] shrink-0">
             <div className={cn(
               "w-6 h-6 rounded-full flex items-center justify-center text-[13px] border",
               isLight ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10"
             )}>
               {staff.avatar}
             </div>
             <span className={cn("text-[13px]  truncate", isLight ? "text-black" : "text-white")}>
               {staff.name}
             </span>
             {idx === 0 && staff.revenue > 0 && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
           </div>
           
           {/* Middle: Horizontal Bar */}
           <div className="flex-1 h-2 relative rounded-full overflow-hidden bg-black/5 dark:bg-white/5">
             <div 
               className={cn(
                 "absolute top-0 left-0 h-full rounded-full transition-all duration-1000",
                 idx === 0 ? "bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-blue-500/50"
               )}
               style={{ width: `${Math.max(2, percent)}%` }}
             />
           </div>
           
           {/* Right: Exact Numbers (Fixed width) */}
           <div className="flex flex-col items-end w-[80px] shrink-0">
             <span className={cn("text-[13px]  tracking-tighter leading-none", isLight ? "text-black" : "text-white")}>€{staff.revenue}</span>
             {staff.rate > 0 && (
               <span className="text-[13px]  text-blue-500/70 mt-1 leading-none">提成 €{staff.commission}</span>
             )}
           </div>
         </div>
       );
     })}
   </div>
 </div>

 {/* Right: Service ROI (Horizontal Bar Chart) */}
 <div className={cn(
    "rounded-2xl p-6 flex flex-col relative overflow-hidden group border",
    isLight ? "bg-transparent border-black/10 shadow-[0_2px_10px_rgba(0,0,0,0.05)]" : "bg-transparent border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
  )}>
   <div className={cn(isLight ? "flex items-center justify-between border-b border-black/5 pb-4 mb-6" : "flex items-center justify-between border-b border-white/5 pb-4 mb-6")}>
     <h3 className={cn(isLight ? "text-sm tracking-widest text-black flex items-center gap-2 uppercase" : "text-sm tracking-widest text-white flex items-center gap-2 uppercase")}>
       <Target className="w-4 h-4 text-amber-500" />
       爆款项目排行 (Service ROI)
     </h3>
     <span className={cn(isLight ? "text-[13px]  text-black/50" : "text-[13px]  text-white/50")}>Top 5</span>
   </div>

   <div className="flex flex-col gap-5">
     {serviceRanking.map((svc, idx) => {
       const maxRevenue = Math.max(...serviceRanking.map(s => s.revenue), 1);
       const percent = (svc.revenue / maxRevenue) * 100;

       return (
         <div key={svc.id} className="flex items-center gap-4 relative z-10 group">
           {/* Left: Rank & Name (Fixed width) */}
           <div className="flex items-center gap-3 w-[120px] shrink-0">
             <span className={cn(
               "w-4 text-center  text-[13px]", 
               idx === 0 ? "text-amber-500" : (isLight ? "text-black/40" : "text-white/40")
             )}>
               {idx + 1}
             </span>
             <div className="flex flex-col">
               <span className={cn("text-[13px]  truncate max-w-[90px]", isLight ? "text-black" : "text-white")}>
                 {svc.name}
               </span>
               <span className={cn(
                 "text-[13px] uppercase tracking-widest", 
                 svc.type === '利润款' ? "text-amber-500" : "text-blue-400"
               )}>
                 {svc.type} · {svc.count}单
               </span>
             </div>
           </div>

           {/* Middle: Horizontal Bar */}
           <div className="flex-1 h-2 relative rounded-full overflow-hidden bg-black/5 dark:bg-white/5">
             <div 
               className={cn(
                 "absolute top-0 left-0 h-full rounded-full transition-all duration-1000",
                 idx === 0 ? "bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-amber-500/50"
               )}
               style={{ width: `${Math.max(2, percent)}%` }}
             />
           </div>

           {/* Right: Exact Numbers (Fixed width) */}
           <div className="flex flex-col items-end w-[60px] shrink-0">
             <span className={cn("text-[13px]  tracking-tighter leading-none", isLight ? "text-black" : "text-white")}>€{svc.revenue}</span>
           </div>
         </div>
       );
     })}
   </div>
 </div>

 </div>
 </div>
 </motion.div>
 </div>
 </AnimatePresence>
 );
};
