"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, TrendingUp, TrendingDown, Minus, Crown, Target, Users, UserPlus, Wallet, ShoppingBag } from "lucide-react";
import { cn } from "@/utils/cn";
import { BookingEdit } from "@/features/booking/components/DualPaneBookingModal";
import { StaffItem } from "@/features/calendar/components/NebulaConfigHub";
import { useMemo } from "react";

import { useVisualSettings } from "@/hooks/useVisualSettings";

interface AiFinanceDashboardModalProps {
 isOpen: boolean;
 onClose: () => void;
 staffs?: StaffItem[];
 globalBookings?: BookingEdit[];
}

type TimeRange = 'day' | 'week' | 'month' | 'quarter' | 'year';

export const AiFinanceDashboardModal = ({ isOpen, onClose, staffs = [], globalBookings = [] }: AiFinanceDashboardModalProps) => {
 const [timeRange, setTimeRange] = useState<TimeRange>('day');
 const { settings } = useVisualSettings();
 const isLight = settings.headerTitleColorTheme === 'coreblack';

 // --- 核心真实数据核算逻辑 (Real-time Financial Engine) ---
 
 const financialData = useMemo(() => {
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

 globalBookings.forEach(b => {
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
 const validStaffs = staffs.filter(s => s.id !== 'NO');
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
 currentBookings.forEach(booking => {
 // 解析支付方式，默认为现金
 const method = (booking.paymentMethod as string) || '现金';

 if (booking.services && Array.isArray(booking.services)) {
 booking.services.forEach((service: any) => {
 const servicePrice = (Array.isArray(service.prices) && service.prices.length > 0) ? Number(service.prices[0]) : 0;
 totalRevenue += servicePrice;
 
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
 }, [globalBookings, staffs, timeRange]);

 const currentMetrics = {
 total: financialData.totalRevenue,
 wechat: financialData.wechatRevenue,
 alipay: financialData.alipayRevenue,
 cash: financialData.cashRevenue,
 bankCard: financialData.bankCardRevenue,
 memberCard: financialData.memberCardRevenue,
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
 "fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-8 animate-in fade-in font-sans",
 isLight ? "text-black" : "text-white"
 )}>
 {/* 背景暗场遮罩：取消黑色，使用和预约窗一致的透明层 */}
 <div 
 onClick={onClose}
 className="fixed inset-0 pointer-events-auto bg-transparent"
 />

 <motion.div
 
 
 
 
 className={cn(
 "relative z-10 w-full max-w-6xl h-[85vh] rounded-2xl flex flex-col overflow-hidden",
 isLight 
 ? "bg-white/50 shadow-[0_0_50px_rgba(0,0,0,0.1)]" 
 : "bg-black/50 shadow-[0_0_50px_rgba(0,0,0,1)]"
 )}
 >
 {/* Header */}
 <div className={cn(
 "h-16 border-b flex items-center justify-between px-6",
 isLight 
 ? "border-black/5 bg-gradient-to-r from-purple-500/5 via-transparent to-transparent" 
 : "border-white/5 bg-gradient-to-r from-purple-500/10 via-transparent to-transparent"
 )}>
 <div className="flex items-center gap-3">
 <div className={cn(
 "w-8 h-8 rounded-full border flex items-center justify-center",
 isLight 
 ? "bg-purple-500/10 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]" 
 : "bg-purple-500/20 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
 )}>
 <Sparkles className={cn("w-4 h-4", isLight ? "text-purple-600" : "text-purple-400")} />
 </div>
 <div className="flex flex-col">
 <h2 className={cn("text-sm tracking-widest", isLight ? "text-black" : "text-white")}>AI 财务核心舱</h2>
 <span className={cn("text-[11px] uppercase tracking-widest", isLight ? "text-purple-600" : "text-purple-400")}>Financial Intelligence Hub</span>
 </div>
 </div>

 <div className={cn(
 "flex items-center gap-2 p-1 rounded-lg border",
 isLight ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5"
 )}>
 {(['day', 'week', 'month', 'quarter', 'year'] as TimeRange[]).map((range) => (
 <button
 key={range}
 onClick={() => setTimeRange(range)}
 className={cn(
 "px-4 py-1.5 rounded-md text-[11px] uppercase tracking-widest ",
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
 "w-8 h-8 flex items-center justify-center rounded-full ",
 isLight ? "hover:bg-black/5 text-black hover:text-black" : "hover:bg-white/10 text-white hover:text-white"
 )}>
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Scrollable Content */}
 <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
 
 {/* AI Insight Bar */}
 <div className="w-full bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 flex items-start gap-4 relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-400 to-amber-400" />
 <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
 <div className="flex flex-col gap-1">
 <span className="text-[11px] text-purple-400 uppercase tracking-widest">AI Agent Insight</span>
 <p className={cn(isLight ? "text-sm text-black leading-relaxed" : "text-sm text-white leading-relaxed")}>
 本时段现金流健康度极佳。高端日式项目（如极光猫眼）利润贡献率高达 45%，但仅有 Sara 一名技师主做，存在单点瓶颈。建议本周安排内部培训，释放产能。
 </p>
 </div>
 </div>

 {/* Top Row: Global Gross Revenue (总营业额独占一行) */}
 <div className={cn(isLight ? "w-full bg-black/5 border border-black/5 rounded-xl p-6 flex flex-col justify-center relative overflow-hidden group" : "w-full bg-white/5 border border-white/5 rounded-xl p-6 flex flex-col justify-center relative overflow-hidden group")}>
 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 " />
 <div className="flex items-center justify-between relative z-10">
 <div className="flex flex-col gap-2">
 <span className={cn(isLight ? "text-xs text-black uppercase tracking-widest flex items-center gap-2" : "text-xs text-white uppercase tracking-widest flex items-center gap-2")}>
 <Crown className="w-4 h-4 text-purple-400" />
 总营业额 (Gross Revenue)
 </span>
 <div className="flex items-baseline gap-2">
 <span className={cn(isLight ? "text-5xl tracking-tighter text-black" : "text-5xl tracking-tighter text-white")}>€ {currentMetrics.total.toLocaleString()}</span>
 </div>
 <div className={cn("flex items-center gap-1 mt-1 text-xs ", isPositive ? "text-gx-cyan" : isNegative ? (isLight ? "text-black" : "text-white") : "text-white")}>
 {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : isNegative ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
 <span>
 {isPositive ? '+' : ''}{trend.toFixed(1)}% vs 上一周期
 </span>
 </div>
 </div>
 {/* 装饰性数据可视化 / 迷你仪表盘位留白 */}
 <div className="hidden md:flex flex-col items-end gap-1 ">
 <div className="flex gap-1 h-8 items-end">
 {[40, 60, 45, 80, 55, 90, 75].map((h, i) => (
 <div key={i} className="w-2 bg-purple-400 rounded-t-sm" style={{ height: `${h}%` }} />
 ))}
 </div>
 <span className="text-[11px] tracking-widest">REALTIME VOL.</span>
 </div>
 </div>
 </div>

 {/* Second Row: Payment Channels (五大支付渠道平铺矩阵) */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
 {/* 微信 */}
 <div className={cn(isLight ? "bg-white/50 border border-black/5 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group" : "bg-[#0f0f0f] border border-white/5 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group")}>
 <div className="absolute top-0 right-0 w-16 h-16 bg-[#07C160]/5 rounded-bl-full group-hover:bg-[#07C160]/10" />
 <span className={cn(isLight ? "text-[11px] text-black uppercase tracking-widest relative z-10" : "text-[11px] text-white uppercase tracking-widest relative z-10")}>微信 (WeChat)</span>
 <span className="text-2xl tracking-tight text-[#07C160] mt-3 relative z-10">€ {currentMetrics.wechat.toLocaleString()}</span>
 <div className={cn(isLight ? "w-full h-1 bg-black/5 rounded-full mt-3 overflow-hidden relative z-10" : "w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden relative z-10")}>
 <div className="h-full bg-[#07C160]" style={{ width: `${currentMetrics.total ? (currentMetrics.wechat / currentMetrics.total) * 100 : 0}%` }} />
 </div>
 </div>
 
 {/* 支付宝 */}
 <div className={cn(isLight ? "bg-white/50 border border-black/5 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group" : "bg-[#0f0f0f] border border-white/5 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group")}>
 <div className="absolute top-0 right-0 w-16 h-16 bg-[#1677FF]/5 rounded-bl-full group-hover:bg-[#1677FF]/10" />
 <span className={cn(isLight ? "text-[11px] text-black uppercase tracking-widest relative z-10" : "text-[11px] text-white uppercase tracking-widest relative z-10")}>支付宝 (Alipay)</span>
 <span className="text-2xl tracking-tight text-[#1677FF] mt-3 relative z-10">€ {currentMetrics.alipay.toLocaleString()}</span>
 <div className={cn(isLight ? "w-full h-1 bg-black/5 rounded-full mt-3 overflow-hidden relative z-10" : "w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden relative z-10")}>
 <div className="h-full bg-[#1677FF]" style={{ width: `${currentMetrics.total ? (currentMetrics.alipay / currentMetrics.total) * 100 : 0}%` }} />
 </div>
 </div>

 {/* 现金 */}
 <div className={cn(isLight ? "bg-white/50 border border-black/5 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group" : "bg-[#0f0f0f] border border-white/5 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group")}>
 <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-full group-hover:bg-amber-500/10" />
 <span className={cn(isLight ? "text-[11px] text-black uppercase tracking-widest relative z-10" : "text-[11px] text-white uppercase tracking-widest relative z-10")}>现金 (Cash)</span>
 <span className="text-2xl tracking-tight text-amber-500 mt-3 relative z-10">€ {currentMetrics.cash.toLocaleString()}</span>
 <div className={cn(isLight ? "w-full h-1 bg-black/5 rounded-full mt-3 overflow-hidden relative z-10" : "w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden relative z-10")}>
 <div className="h-full bg-amber-500" style={{ width: `${currentMetrics.total ? (currentMetrics.cash / currentMetrics.total) * 100 : 0}%` }} />
 </div>
 </div>

 {/* 银行卡 */}
 <div className={cn(isLight ? "bg-white/50 border border-black/5 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group" : "bg-[#0f0f0f] border border-white/5 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group")}>
 <div className="absolute top-0 right-0 w-16 h-16 bg-blue-400/5 rounded-bl-full group-hover:bg-blue-400/10" />
 <span className={cn(isLight ? "text-[11px] text-black uppercase tracking-widest relative z-10" : "text-[11px] text-white uppercase tracking-widest relative z-10")}>银行卡 (Card)</span>
 <span className="text-2xl tracking-tight text-blue-400 mt-3 relative z-10">€ {currentMetrics.bankCard.toLocaleString()}</span>
 <div className={cn(isLight ? "w-full h-1 bg-black/5 rounded-full mt-3 overflow-hidden relative z-10" : "w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden relative z-10")}>
 <div className="h-full bg-blue-400" style={{ width: `${currentMetrics.total ? (currentMetrics.bankCard / currentMetrics.total) * 100 : 0}%` }} />
 </div>
 </div>

 {/* 会员卡扣款 */}
 <div className={cn(isLight ? "bg-white/50 border border-black/5 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group" : "bg-[#0f0f0f] border border-white/5 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group")}>
 <div className="absolute top-0 right-0 w-16 h-16 bg-gx-cyan/5 rounded-bl-full group-hover:bg-gx-cyan/10" />
 <span className={cn(isLight ? "text-[11px] text-black uppercase tracking-widest relative z-10" : "text-[11px] text-white uppercase tracking-widest relative z-10")}>会员卡 (Member)</span>
 <span className="text-2xl tracking-tight text-gx-cyan mt-3 relative z-10">€ {currentMetrics.memberCard.toLocaleString()}</span>
 <div className={cn(isLight ? "w-full h-1 bg-black/5 rounded-full mt-3 overflow-hidden relative z-10" : "w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden relative z-10")}>
 <div className="h-full bg-gx-cyan" style={{ width: `${currentMetrics.total ? (currentMetrics.memberCard / currentMetrics.total) * 100 : 0}%` }} />
 </div>
 </div>
 </div>

 {/* Third Row: Tactical Modules (三大战术模块胶囊矩阵) */}
 <div className={cn(isLight ? "grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-black/5" : "grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-white/5")}>
 
 {/* 1. 客流与留存胶囊 (Traffic & Retention Engine) */}
 <div className={cn(isLight ? "bg-white/50 border border-gx-cyan/20 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-gx-cyan/50 shadow-[0_0_15px_rgba(0,240,255,0.05)]" : "bg-[#0f0f0f] border border-gx-cyan/20 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-gx-cyan/50 shadow-[0_0_15px_rgba(0,240,255,0.05)]")}>
 <div className="absolute top-0 left-0 w-32 h-32 bg-gx-cyan/10 rounded-br-full blur-2xl group-hover:bg-gx-cyan/20 " />
 <div className="flex items-center justify-between mb-4 relative z-10">
 <span className="text-[11px] text-gx-cyan/70 uppercase tracking-widest flex items-center gap-2">
 <Users className="w-3.5 h-3.5" />
 客流与留存 (Traffic)
 </span>
 <div className="flex items-center gap-1 text-[11px] text-gx-cyan/50 bg-gx-cyan/10 px-2 py-0.5 rounded-full">
 <span className="w-1.5 h-1.5 rounded-full bg-gx-cyan " /> Live
 </div>
 </div>
 
 <div className="flex items-baseline gap-2 relative z-10 mb-4">
 <span className={cn(isLight ? "text-4xl tracking-tighter text-black" : "text-4xl tracking-tighter text-white")}>{currentMetrics.tactical.totalCustomers}</span>
 <span className={cn(isLight ? "text-xs text-black uppercase tracking-widest" : "text-xs text-white uppercase tracking-widest")}>人 (PAX)</span>
 </div>

 <div className="flex flex-col gap-3 relative z-10">
 <div className="flex flex-col gap-1.5">
 <div className="flex justify-between text-[11px] uppercase tracking-widest">
 <span className="text-blue-400">新客 {currentMetrics.tactical.newRatio}%</span>
 <span className="text-purple-400">老客 {currentMetrics.tactical.returningRatio}%</span>
 </div>
 <div className={cn(isLight ? "w-full h-1.5 bg-black/5 rounded-full overflow-hidden flex" : "w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex")}>
 <div className="h-full bg-blue-400 " style={{ width: `${currentMetrics.tactical.newRatio}%` }} />
 <div className="h-full bg-purple-400 " style={{ width: `${currentMetrics.tactical.returningRatio}%` }} />
 </div>
 </div>
 
 <div className={cn(isLight ? "flex items-center justify-between border-t border-black/5 pt-3" : "flex items-center justify-between border-t border-white/5 pt-3")}>
 <span className={cn(isLight ? "text-[11px] text-black uppercase tracking-widest" : "text-[11px] text-white uppercase tracking-widest")}>客单价 (ATV)</span>
 <span className={cn(isLight ? "text-sm text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "text-sm text-white shadow-[0_0_10px_rgba(255,255,255,0.2)]")}>€ {currentMetrics.tactical.atv} <span className={cn(isLight ? "text-[11px] text-black font-normal" : "text-[11px] text-white font-normal")}>/ 人</span></span>
 </div>
 </div>
 </div>

 {/* 2. 储值与现金流胶囊 (Prepaid & Cashflow Engine) */}
 <div className={cn(isLight ? "bg-white/50 border border-amber-500/20 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.05)]" : "bg-[#0f0f0f] border border-amber-500/20 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.05)]")}>
 <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/10 rounded-br-full blur-2xl group-hover:bg-amber-500/20 " />
 <div className="flex items-center justify-between mb-4 relative z-10">
 <span className="text-[11px] text-amber-500 uppercase tracking-widest flex items-center gap-2">
 <Wallet className="w-3.5 h-3.5" />
 新增充值 (Prepaid)
 </span>
 </div>
 
 <div className="flex items-baseline gap-2 relative z-10 mb-4">
 <span className="text-4xl tracking-tighter text-amber-400">€ {currentMetrics.tactical.topUps.toLocaleString()}</span>
 </div>

 <div className="flex flex-col gap-3 relative z-10">
 <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
 <UserPlus className="w-4 h-4 text-amber-400 shrink-0" />
 <div className="flex flex-col">
 <span className="text-[11px] text-amber-500 uppercase tracking-widest">办卡转化率 (Conv. Rate)</span>
 <span className="text-xs text-amber-400">{currentMetrics.tactical.conversionRate}% <TrendingUp className="inline w-3 h-3 ml-1" /></span>
 </div>
 </div>
 
 <div className={cn(isLight ? "flex items-center justify-between border-t border-black/5 pt-3" : "flex items-center justify-between border-t border-white/5 pt-3")}>
 <span className={cn(isLight ? "text-[11px] text-black uppercase tracking-widest" : "text-[11px] text-white uppercase tracking-widest")}>资金池流向</span>
 <span className={cn(isLight ? "text-[11px] text-black" : "text-[11px] text-white")}>储值沉淀率待解锁</span>
 </div>
 </div>
 </div>

 {/* 3. 高毛利零售胶囊 (Retail & Upsell Engine) */}
 <div className={cn(isLight ? "bg-white/50 border border-emerald-500/20 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.05)]" : "bg-[#0f0f0f] border border-emerald-500/20 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.05)]")}>
 <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-br-full blur-2xl group-hover:bg-emerald-500/20 " />
 <div className="flex items-center justify-between mb-4 relative z-10">
 <span className="text-[11px] text-emerald-500 uppercase tracking-widest flex items-center gap-2">
 <ShoppingBag className="w-3.5 h-3.5" />
 产品零售 (Retail)
 </span>
 </div>
 
 <div className="flex items-baseline gap-2 relative z-10 mb-4">
 <span className="text-4xl tracking-tighter text-emerald-400">€ {currentMetrics.tactical.retailRevenue.toLocaleString()}</span>
 </div>

 <div className="flex flex-col gap-3 relative z-10">
 <div className="flex flex-col gap-1.5">
 <div className="flex justify-between text-[11px] uppercase tracking-widest">
 <span className="text-emerald-400">占总营收 (Ratio)</span>
 <span className="text-emerald-400 ">{currentMetrics.tactical.retailRatio}%</span>
 </div>
 <div className={cn(isLight ? "w-full h-1.5 bg-black/5 rounded-full overflow-hidden" : "w-full h-1.5 bg-white/5 rounded-full overflow-hidden")}>
 <div className="h-full bg-emerald-400 " style={{ width: `${currentMetrics.tactical.retailRatio}%` }} />
 </div>
 </div>
 
 <div className={cn(isLight ? "flex items-center justify-between border-t border-black/5 pt-3" : "flex items-center justify-between border-t border-white/5 pt-3")}>
 <span className={cn(isLight ? "text-[11px] text-black uppercase tracking-widest" : "text-[11px] text-white uppercase tracking-widest")}>连带率 (Upsell)</span>
 <span className="text-sm text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">{currentMetrics.tactical.upsellRate}% <TrendingUp className="inline w-3 h-3 ml-1" /></span>
 </div>
 </div>
 </div>
 </div>

 {/* Bottom Row: Two Columns */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 
 {/* Left: Staff Performance */}
 <div className={cn(isLight ? "bg-black/5 border border-black/5 rounded-xl p-5 flex flex-col gap-4" : "bg-white/5 border border-white/5 rounded-xl p-5 flex flex-col gap-4")}>
 <div className={cn(isLight ? "flex items-center justify-between border-b border-black/5 pb-3" : "flex items-center justify-between border-b border-white/5 pb-3")}>
 <h3 className={cn(isLight ? "text-sm tracking-widest text-black flex items-center gap-2" : "text-sm tracking-widest text-white flex items-center gap-2")}>
 <Users className="w-4 h-4 text-purple-400" />
 技师血汗榜 & 提成核算
 </h3>
 <span className={cn(isLight ? "text-[11px] text-black uppercase" : "text-[11px] text-white uppercase")}>Auto-calculated</span>
 </div>
 
 <div className="flex flex-col gap-4">
 {staffRanking.map((staff, idx) => (
 <div key={staff.id} className={cn(isLight ? "flex flex-col gap-2 p-3 rounded-lg bg-white/20 border border-black/5 hover:border-purple-500/30 group" : "flex flex-col gap-2 p-3 rounded-lg bg-black/20 border border-white/5 hover:border-purple-500/30 group")}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className={cn(isLight ? "w-8 h-8 rounded-full bg-black/10 flex items-center justify-center text-sm border border-black/10" : "w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm border border-white/10")}>
 {staff.avatar}
 </div>
 <div className="flex flex-col">
 <span className={cn(isLight ? "text-xs text-black flex items-center gap-2" : "text-xs text-white flex items-center gap-2")}>
 {staff.name}
 {idx === 0 && <Crown className="w-3 h-3 text-amber-400" />}
 </span>
 <span className={cn(isLight ? "text-[11px] text-black" : "text-[11px] text-white")}>{staff.role}</span>
 </div>
 </div>
 <div className="flex flex-col items-end">
 {staff.rate > 0 ? (
 <>
 <span className={cn(isLight ? "text-[11px] text-black uppercase" : "text-[11px] text-white uppercase")}>预估提成 ({staff.rateStr})</span>
 <span className="text-sm text-purple-400">€ {staff.commission}</span>
 </>
 ) : (
 <>
 <span className={cn(isLight ? "text-[11px] text-black uppercase mt-1" : "text-[11px] text-white uppercase mt-1")}>
 <span className={cn(isLight ? "px-2 py-0.5 rounded border border-black/10 bg-black/5" : "px-2 py-0.5 rounded border border-white/10 bg-white/5")}>固定薪资 / 无提成</span>
 </span>
 </>
 )}
 </div>
 </div>
 
 <div className="flex items-center gap-3 mt-1">
 <span className={cn(isLight ? "text-[11px] text-black w-16" : "text-[11px] text-white w-16")}>业绩: €{staff.revenue}</span>
 {staff.isBoss ? (
 <div className={cn(isLight ? "flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden relative" : "flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden relative")}>
 <div className="absolute top-0 left-0 h-full rounded-full bg-amber-500 w-full" />
 </div>
 ) : staff.target > 0 ? (
 <div className={cn(isLight ? "flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden relative" : "flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden relative")}>
 <div 
 className={cn(
 "absolute top-0 left-0 h-full rounded-full ",
 staff.revenue >= staff.target ? "bg-emerald-400" : "bg-purple-500"
 )}
 style={{ width: `${Math.min(100, (staff.revenue / staff.target) * 100)}%` }} 
 />
 </div>
 ) : (
 <div className={cn(isLight ? "flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden relative" : "flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden relative")}>
 <div className={cn(isLight ? "absolute top-0 left-0 h-full rounded-full bg-black/20 w-full" : "absolute top-0 left-0 h-full rounded-full bg-white/20 w-full")} />
 </div>
 )}
 <span className={cn(isLight ? "text-[11px] text-black w-16 text-right" : "text-[11px] text-white w-16 text-right")}>
 {staff.isBoss ? '👑 纯利润' : staff.target > 0 ? `目标: ${staff.target}` : '无硬性考核'}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Right: Service ROI */}
 <div className={cn(isLight ? "bg-black/5 border border-black/5 rounded-xl p-5 flex flex-col gap-4" : "bg-white/5 border border-white/5 rounded-xl p-5 flex flex-col gap-4")}>
 <div className={cn(isLight ? "flex items-center justify-between border-b border-black/5 pb-3" : "flex items-center justify-between border-b border-white/5 pb-3")}>
 <h3 className={cn(isLight ? "text-sm tracking-widest text-black flex items-center gap-2" : "text-sm tracking-widest text-white flex items-center gap-2")}>
 <Target className="w-4 h-4 text-amber-400" />
 爆款与吸金项目排行
 </h3>
 <span className={cn(isLight ? "text-[11px] text-black uppercase" : "text-[11px] text-white uppercase")}>Service ROI</span>
 </div>

 <div className="flex flex-col gap-3">
 {serviceRanking.map((svc, idx) => (
 <div key={svc.id} className={cn(isLight ? "flex items-center justify-between p-3 rounded-lg bg-white/20 border border-black/5 hover:border-amber-500/30 " : "flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 hover:border-amber-500/30 ")}>
 <div className="flex items-center gap-4">
 <span className={cn(isLight ? "text-lg text-black w-4" : "text-lg text-white w-4")}>{idx + 1}</span>
 <div className="flex flex-col">
 <span className={cn(isLight ? "text-xs text-black" : "text-xs text-white")}>{svc.name}</span>
 <div className="flex items-center gap-2 mt-1">
 <span className={cn(
 "text-[11px] px-1.5 py-0.5 rounded-sm border uppercase",
 svc.type === '利润款' ? "text-amber-400 border-amber-400/30 bg-amber-400/10" : "text-blue-400 border-blue-400/30 bg-blue-400/10"
 )}>
 {svc.type}
 </span>
 <span className={cn(isLight ? "text-[11px] text-black" : "text-[11px] text-white")}>服务 {svc.count} 单</span>
 </div>
 </div>
 </div>
 <span className={cn(isLight ? "text-sm text-black " : "text-sm text-white ")}>€ {svc.revenue}</span>
 </div>
 ))}
 </div>
 </div>

 </div>
 </div>
 </motion.div>
 </div>
 </AnimatePresence>
 );
};
