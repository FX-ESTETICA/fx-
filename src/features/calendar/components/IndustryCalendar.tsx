"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { 
 Calendar as CalendarIcon, 
 ChevronLeft, 
 ChevronRight, 
 Scissors, 
 Utensils, 
 Hotel,
 Stethoscope,
 Briefcase,
 Dumbbell,
 LucideIcon
} from "lucide-react";
import { IndustryType, IndustryDNA, MatrixResource } from "../types";

// --- 矩阵子组件导入 ---
import { EliteResourceMatrix, type MatrixBooking } from "./matrices/EliteResourceMatrix";
import { EliteSpatialMatrix } from "./matrices/EliteSpatialMatrix";
import { TimelineMatrix } from "./matrices/TimelineMatrix";
import { CapacityFlow } from "./matrices/CapacityFlow";
import { EliteWeekMatrix } from "./matrices/EliteWeekMatrix";
import { EliteMonthMatrix } from "./matrices/EliteMonthMatrix";
import { NebulaConfigHub, CategoryItem as HubCategoryItem, ServiceItem as HubServiceItem, StaffItem } from './NebulaConfigHub';
import { Settings } from "lucide-react";
import { useVisualSettings, CYBER_COLOR_DICTIONARY } from "@/hooks/useVisualSettings";
import { createPortal } from "react-dom";
import { DualPaneBookingModal, type BookingEdit } from "@/features/booking/components/DualPaneBookingModal";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useShop } from "@/features/shop/ShopContext";
import { useSubscriptionTimer } from "@/hooks/useSubscriptionTimer";


import { OrbitalPossessionProfile } from "./OrbitalPossessionProfile";
import { Trash2 } from "lucide-react";
import { RecycleBinModal } from "./RecycleBinModal";
import { AiFinanceDashboardModal } from "./AiFinanceDashboardModal";
import { useTranslations } from "next-intl";
import { GracePeriodBanner } from "@/components/shared/GracePeriodBanner";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useViewStack } from "@/hooks/useViewStack";

export interface OperatingHour {
 id: string;
 start: number;
 end: number;
}

export interface SpecialDateHours {
 isClosed: boolean;
 hours: OperatingHour[];
}

export interface DailyOverride {
 date: string; // YYYY-MM-DD
 isClosed: boolean;
 hours: OperatingHour[];
}

export interface ShopOperatingConfig {
 regular: {
 monday: OperatingHour[];
 tuesday: OperatingHour[];
 wednesday: OperatingHour[];
 thursday: OperatingHour[];
 friday: OperatingHour[];
 saturday: OperatingHour[];
 sunday: OperatingHour[];
 };
 specialDates: Record<string, SpecialDateHours>;
 todayOverride?: DailyOverride | null;
}

// 默认营业时间配置 (兼容旧版与新版)
export const DEFAULT_OPERATING_CONFIG: ShopOperatingConfig = {
 regular: {
 monday: [{ id: '1', start: 9, end: 18 }],
 tuesday: [{ id: '1', start: 9, end: 18 }],
 wednesday: [{ id: '1', start: 9, end: 18 }],
 thursday: [{ id: '1', start: 9, end: 18 }],
 friday: [{ id: '1', start: 9, end: 18 }],
 saturday: [{ id: '1', start: 10, end: 18 }],
 sunday: [{ id: '1', start: 10, end: 18 }],
 },
 specialDates: {},
 todayOverride: null
};

// 【核心】：时间降维引擎 (Time Resolution Engine)
// 传入任意日期和商家配置，计算出当天最高优先级的营业时间
export const resolveOperatingHours = (date: Date, config?: ShopOperatingConfig | OperatingHour[] | null): { isClosed: boolean, hours: OperatingHour[] } => {
 if (!config) return { isClosed: false, hours: DEFAULT_OPERATING_CONFIG.regular.monday };
 
 // 兼容旧版的单薄数组格式
 if (Array.isArray(config)) {
 return { isClosed: config.length === 0, hours: config };
 }

 // 【防御性合并】：防止数据库里的 config 因为之前的错误导致残缺（比如只有 todayOverride 却没有 regular）
 const safeConfig: ShopOperatingConfig = {
 ...DEFAULT_OPERATING_CONFIG,
 ...config,
 regular: config.regular || DEFAULT_OPERATING_CONFIG.regular,
 specialDates: config.specialDates || {}
 };

 const dateString = date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
 
 // 1. 最高优先级：今日临时覆盖 (Today Override)
 if (safeConfig.todayOverride && safeConfig.todayOverride.date === dateString) {
 return { isClosed: safeConfig.todayOverride.isClosed, hours: safeConfig.todayOverride.hours };
 }

 // 2. 次高优先级：特殊节假日 (Special Dates)
 if (safeConfig.specialDates && safeConfig.specialDates[dateString]) {
 return { isClosed: safeConfig.specialDates[dateString].isClosed, hours: safeConfig.specialDates[dateString].hours };
 }

 // 3. 基础优先级：常规星期 (Regular)
 const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
 const dayName = days[date.getDay()];
 const regularHours = safeConfig.regular[dayName];
 return { isClosed: !regularHours || regularHours.length === 0, hours: regularHours || [] };
};

// 默认员工配置 (A, B, C, D, E)
const DEFAULT_STAFFS = [
 { id: 'A', name: 'A', role: '资深技师', color: '#00f0ff', status: 'active', commissionRate: 50 },
 { id: 'B', name: 'B', role: '资深技师', color: '#a855f7', status: 'active', commissionRate: 50 },
 { id: 'C', name: 'C', role: '高级技师', color: '#10b981', status: 'active', commissionRate: 40 },
 { id: 'D', name: 'D', role: '高级技师', color: '#f59e0b', status: 'active', commissionRate: 40 },
 { id: 'E', name: 'E', role: '见习技师', color: '#ec4899', status: 'active', commissionRate: 30 }
];

type StaffMember = {
 id: string;
 name: string;
 role?: string;
 color?: string;
 status?: string;
 commissionRate?: number;
 frontendId?: string;
 calendarView?: string;
 [key: string]: unknown;
};

type CategoryItem = {
 id: string;
 name?: string;
 [key: string]: unknown;
};

type ServiceItem = {
 id: string;
 name?: string;
 duration?: number;
 prices?: number[];
 assignedEmployeeId?: string | null;
 [key: string]: unknown;
};

type CalendarBooking = MatrixBooking;

interface AuroraSchedulerProps {
 initialIndustry?: IndustryType;
 mode?: "admin" | "immersive";
}

// 【量子时钟微组件】：彻底物理隔离时钟的每秒滴答，防止顶层渲染风暴
const CyberClock = () => {
 const [realTime, setRealTime] = useState(new Date());
 const { settings: visualSettings } = useVisualSettings();

 useEffect(() => {
 const timer = setInterval(() => setRealTime(new Date()), 1000);
 return () => clearInterval(timer);
 }, []);

 const isBlack = visualSettings.headerTitleColorTheme === 'coreblack';

 return (
 <>
 <div className="flex items-baseline gap-1">
 <span className={cn(
 "text-5xl tracking-tighter ",
 isBlack
 ? "text-black"
 : "bg-gradient-to-br from-white via-gray-300 to-gray-500 bg-clip-text text-transparent"
 )}>
 {realTime.getHours().toString().padStart(2, '0')}:
 {realTime.getMinutes().toString().padStart(2, '0')}
 </span>
 <span className={cn(
 "text-lg ",
 isBlack ? "text-black" : "text-white"
 )}>
 {realTime.getSeconds().toString().padStart(2, '0')}
 </span>
 </div>
 <span className={cn(
 "text-[11px] uppercase tracking-[0.3em] mt-3 ",
 isBlack ? "text-black " : "text-white"
 )}>
 System Time (Local)
 </span>
 </>
 );
};

export const IndustryCalendar = ({ initialIndustry = "beauty", mode = "admin" }: AuroraSchedulerProps) => {
 const t = useTranslations('IndustryCalendar');

 const [industry] = useState<IndustryType>(initialIndustry);
 const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
 const [currentDate, setCurrentDate] = useState(new Date());
 // 新增：幻象投影日期，专门用于顶部标题显示，与底层逻辑脱钩
 const [phantomDate, setPhantomDate] = useState<Date>(new Date());
 const [isConfigOpen, setIsConfigOpen] = useState(false);
 const [configInitialTab, setConfigInitialTab] = useState<"hours" | "staff" | "services" | "visual">("hours");
 const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
 const [isFinanceDashboardOpen, setIsFinanceDashboardOpen] = useState(false); 
 const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
 const [bookingModalKey, setBookingModalKey] = useState(0);
 const [isMounted] = useState(() => typeof window !== "undefined");
 
 // 【世界顶端 0 冲突架构】：防反补锁 (Hydration Lock)
 // 必须等待云端数据拉取完毕，才允许前端发起任何保存请求，防止初始默认状态反杀数据库
 const [isCloudDataLoaded, setIsCloudDataLoaded] = useState(false);
 
 // 新增：世界顶端的“靶向雷达”信标，用于控制跨期野单的瞬间物理位移
 const [targetBookingId, setTargetBookingId] = useState<string | null>(null);

 // 注册物理返回键拦截（顶端架构：优先收起弹窗/侧边栏，而不后退页面）
 const registerBack = useHardwareBack(state => state.register);
 const unregisterBack = useHardwareBack(state => state.unregister);
 const setActiveTab = useViewStack(state => state.setActiveTab);

 useEffect(() => {
 if (isBookingModalOpen) {
 registerBack('calendar-booking-modal', () => { setIsBookingModalOpen(false); return true; }, 20);
 } else {
 unregisterBack('calendar-booking-modal');
 }
 
 if (isConfigOpen) {
 registerBack('calendar-config', () => { setIsConfigOpen(false); return true; }, 10);
 } else {
 unregisterBack('calendar-config');
 }
 
 if (isFinanceDashboardOpen) {
 registerBack('calendar-finance', () => { setIsFinanceDashboardOpen(false); return true; }, 15);
 } else {
 unregisterBack('calendar-finance');
 }
 
 if (isRecycleBinOpen) {
 registerBack('calendar-recycle', () => { setIsRecycleBinOpen(false); return true; }, 15);
 } else {
 unregisterBack('calendar-recycle');
 }

 return () => {
 unregisterBack('calendar-booking-modal');
 unregisterBack('calendar-config');
 unregisterBack('calendar-finance');
 unregisterBack('calendar-recycle');
 };
 }, [isBookingModalOpen, isConfigOpen, isFinanceDashboardOpen, isRecycleBinOpen, registerBack, unregisterBack]);

 // 新增背景控制 hook
 const { settings: visualSettings } = useVisualSettings();
 const searchParams = useSearchParams();
 
 // 共享的全局配置状态
 const [operatingHours, setOperatingHours] = useState<OperatingHour[] | ShopOperatingConfig>(DEFAULT_OPERATING_CONFIG);
 
 // 共享的人员列表状态
 const [staffs, setStaffs] = useState<StaffMember[]>(DEFAULT_STAFFS);
 const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

 // 默认服务配置
 const [categories, setCategories] = useState<CategoryItem[]>([]);
 const [services, setServices] = useState<ServiceItem[]>([]);
 
 // 核心：全局营业状态
 const [storeStatus, setStoreStatus] = useState<'open' | 'closed_today' | 'holiday'>('open');

 const { user } = useAuth();
  const globalUserRole = user && 'role' in user ? user.role : 'user';
  
  // 【世界顶端架构】：在顶层日历组件中，统一查询当前登录用户的真实业务档案 (Profile Avatar)
 // 这确保了无论是左侧的轨道面板，还是右上角的雷达面板，都使用同一个来源的高清真实头像
 const [trueBusinessAvatar, setTrueBusinessAvatar] = useState<string | undefined>(
 (user && typeof user === 'object' && 'avatar' in user) ? user.avatar as string : undefined
 );
 const [trueBusinessName, setTrueBusinessName] = useState<string | undefined>(undefined);
 const [staffAvatars, setStaffAvatars] = useState<Record<string, string>>({});

 useEffect(() => {
 if (!user || typeof user !== 'object' || !('id' in user)) return;

 const fetchTrueProfile = async () => {
 try {
 const { data, error } = await supabase
 .from('profiles')
 .select('name, avatar_url')
 .eq('id', user.id)
 .maybeSingle();
 
 if (!error && data) {
 if (data.avatar_url) setTrueBusinessAvatar(data.avatar_url);
 if (data.name) setTrueBusinessName(data.name);
 }
 } catch (e) {
 console.error("[IndustryCalendar] Failed to fetch true business profile", e);
 }
 };
 
 fetchTrueProfile();
 }, [user]);

 // 获取员工绑定的真实头像
 useEffect(() => {
 const boundFrontendIds = staffs.map(s => s.frontendId).filter(Boolean) as string[];
 if (boundFrontendIds.length === 0) return;

 const fetchStaffAvatars = async () => {
 try {
 const { data, error } = await supabase
 .from('profiles')
 .select('gx_id, avatar_url')
 .in('gx_id', boundFrontendIds);
 
 if (!error && data) {
 const map: Record<string, string> = {};
 data.forEach(p => {
 if (p.avatar_url && p.gx_id) {
 map[p.gx_id] = p.avatar_url;
 }
 });
 setStaffAvatars(map);
 }
 } catch (e) {
 console.error("[IndustryCalendar] Failed to fetch staff avatars", e);
 }
 };

 fetchStaffAvatars();
 }, [JSON.stringify(staffs.map(s => s.frontendId))]);

 const userMetadata = user && typeof user === "object"
 ? (user as { user_metadata?: Record<string, unknown> }).user_metadata
 : undefined;
 
 // 名字的优先级：真实数据库 Profile > 账号 Metadata > Auth Name
 const userName = trueBusinessName || (user && typeof user === "object" && "name" in user && typeof user.name === "string"
 ? user.name
 : (typeof userMetadata?.full_name === "string" ? userMetadata.full_name : ""));
 const userInitial = userName ? userName[0]?.toUpperCase() : "";
 const userGxId = user && typeof user === "object" && "gxId" in user
 ? (user as { gxId?: string }).gxId
 : (typeof userMetadata?.gx_id === "string"
 ? userMetadata.gx_id
 : typeof userMetadata?.gxId === "string"
 ? userMetadata.gxId
 : undefined);
 
 const userBaseGxId = user && typeof user === "object" && "base_gx_id" in user
 ? (user as { base_gx_id?: string }).base_gx_id
 : undefined;
 
 const userMerchantGxId = user && typeof user === "object" && "merchant_gx_id" in user
 ? (user as { merchant_gx_id?: string }).merchant_gx_id
 : undefined;

  // 获取当前商户的专属 shopId，实现多租户数据物理隔离
  // 【完美 0 冲突法则】：URL 物理参数拥有绝对最高优先级
  const { activeShopId, availableShops, shopConfig, isShopConfigLoaded, updateFullShopConfig, globalBookings, trackAction } = useShop();
  const urlShopId = searchParams.get('shopId');
  const shopId = urlShopId || activeShopId || 'default';

  // ==========================================
  // 【核心修改】：动态推导有效角色 (Effective Role)
  // ==========================================
  // 解决兼职员工保留 Boss 权限的越权漏洞
  const effectiveUserRole = useMemo(() => {
    let role = 'user';
    if (availableShops && availableShops.length > 0) {
      const currentShopBinding = availableShops.find((s: any) => s.shopId === shopId);
      if (currentShopBinding) {
        role = currentShopBinding.role === 'OWNER' ? 'boss' : 'user';
      }
    }
    // 如果全局角色连老板都不是，肯定是 user
    if (globalUserRole !== 'boss' && globalUserRole !== 'merchant') {
      role = 'user';
    }
    return role;
  }, [availableShops, shopId, globalUserRole]);

  // 【物理权限隔离】：如果是普通员工（非 boss），判断其操作权限
  const myStaffProfile = useMemo(() => {
    const extractDigits = (id: string | undefined | null) => id ? id.replace(/\D/g, '') : null;
    const numericUserGxId = extractDigits(userGxId);
    const numericBaseGxId = extractDigits(userBaseGxId);
    const numericMerchantGxId = extractDigits(userMerchantGxId);

    return staffs.find(s => {
      const numericStaffId = extractDigits(s.frontendId);
      if (!numericStaffId) return false;
      return (numericUserGxId && numericStaffId === numericUserGxId) || 
             (numericBaseGxId && numericStaffId === numericBaseGxId) || 
             (numericMerchantGxId && numericStaffId === numericMerchantGxId);
    });
  }, [staffs, userGxId, userBaseGxId, userMerchantGxId]);
  
  const isPermissionReadOnly = effectiveUserRole === 'user' && myStaffProfile?.operationRights === 'view';
 const isPermissionEditSelf = effectiveUserRole === 'user' && myStaffProfile?.operationRights === 'edit_self';
 const isPhoneMasked = effectiveUserRole === 'user' && myStaffProfile?.operationRights !== 'manager';
 const isManager = effectiveUserRole === 'admin' || effectiveUserRole === 'boss' || effectiveUserRole === 'merchant' || (effectiveUserRole === 'user' && myStaffProfile?.operationRights === 'manager');


 const openBookingModal = useCallback(() => {
 setBookingModalKey((k) => k + 1);
 setIsBookingModalOpen(true);
 }, []);

 // 获取当前监视的真实店铺名称 (基于绝对物理 ID)
 const activeShopName = availableShops?.find((s) => s.shopId === shopId)?.shopName || "未知节点";

 // ==========================================
 // 【核心修改】：全面消费全局 ShopContext，废弃内部拉取和监听
 // ==========================================
 useEffect(() => {
 if (!isShopConfigLoaded || !shopConfig) return;
 
 // 从全局 shopConfig 中提取数据
 const activeStaffs = (shopConfig.staffs as unknown as { id: string, status?: string }[] || []).filter(s => s.status !== 'resigned');
 if (shopConfig.staffs && activeStaffs.length > 0) {
 setStaffs(shopConfig.staffs as unknown as StaffMember[]);
 setSelectedStaffIds(activeStaffs.map((s) => s.id));
 } else {
 setStaffs(DEFAULT_STAFFS);
 setSelectedStaffIds(DEFAULT_STAFFS.map(s => s.id));
 }
 
 if (shopConfig.hours) {
 const rawHours = shopConfig.hours;
 if (!Array.isArray(rawHours)) {
 setOperatingHours({
 ...DEFAULT_OPERATING_CONFIG,
 ...(rawHours as ShopOperatingConfig),
 regular: (rawHours as ShopOperatingConfig).regular || DEFAULT_OPERATING_CONFIG.regular,
 specialDates: (rawHours as ShopOperatingConfig).specialDates || {}
 });
 } else {
 setOperatingHours(rawHours as OperatingHour[]);
 }
 } else {
 setOperatingHours(DEFAULT_OPERATING_CONFIG);
 }
 
 // 【强制拦截幽灵覆盖】：
 // 当 ShopContext 发生微小变动推送过来时，如果它携带了有效的 categories 和 services，我们才覆盖本地。
 // 如果它传过来的是空，且本地已经有数据（说明店长刚在 NebulaConfigHub 里建好），【绝对拒绝覆盖为空】！
 // 修复：删除服务时，合法的空数组也会被当成“幽灵空数据”拦截掉。
 // 我们必须区分“初始化未加载”的空，和“用户主动删除后”的空。
 // 如果 isCloudDataLoaded 为 true，说明已经过了初始加载阶段，此时推过来的 [] 就是真实的删除动作！
 if (shopConfig.categories !== undefined) {
 setCategories(prev => {
 if (!isCloudDataLoaded) {
 // 初始阶段：如果云端是空，且本地有数据，拒绝覆盖
 return (shopConfig.categories?.length || 0) > 0 ? (shopConfig.categories as CategoryItem[]) : prev;
 }
 // 已加载阶段：绝对信任云端推送，哪怕是空数组（代表删除了最后一个分类）
 return (shopConfig.categories as CategoryItem[]) || [];
 });
 }
 
 if (shopConfig.services !== undefined) {
 setServices(prev => {
 if (!isCloudDataLoaded) {
 // 初始阶段：如果云端是空，且本地有数据，拒绝覆盖
 return (shopConfig.services?.length || 0) > 0 ? (shopConfig.services as ServiceItem[]) : prev;
 }
 // 已加载阶段：绝对信任云端推送，哪怕是空数组（代表删除了最后一个服务）
 return (shopConfig.services as ServiceItem[]) || [];
 });
 }
 
 if (shopConfig.storeStatus) {
 setStoreStatus(shopConfig.storeStatus as any);
 } else {
 setStoreStatus('open');
 }
 
 setIsCloudDataLoaded(true);
 }, [shopConfig, isShopConfigLoaded]);

 // 全局订单拉取逻辑已被移除，完全由 ShopContext 的 globalBookings 接管

 // ==========================================
 // 试用期水印雷达 (Watermark Radar) 从 ShopContext 同步
 // ==========================================
 const { subscription } = useShop();
 const { remainingTime, remainingMilliseconds } = useSubscriptionTimer();
 const [isReadOnlyMode, setIsReadOnlyMode] = useState<boolean>(false);

 useEffect(() => {
 // 【强制拦截】只读状态判定全部交给全局中枢 ShopContext 接管，防止退出重置
 // 从全局上下文中直接映射 isReadOnlyMode，废弃日历内部自算的倒计时！
 if ((remainingTime === "LIMIT_EXCEEDED" || remainingTime === "ACTIONS_EXHAUSTED") && !subscription.isGracePeriodActive) {
 setIsReadOnlyMode(true);
 } else {
 setIsReadOnlyMode(false);
 }
 }, [remainingTime, subscription.isGracePeriodActive]);

 const isGracePeriodActive = subscription.isGracePeriodActive;
 const { subscriptionTier, trialStartedAt, empireId, gracePeriodActionsLeft } = subscription;
 const { openSubscriptionModal } = useShop();

 // ==========================================
 // 【世界顶端 0 冲突架构】：显式全局保存机制 (替换隐式 useEffect 监听)
 // ==========================================
 const handleSaveConfigs = useCallback(async (
 newHours: ShopOperatingConfig | OperatingHour[],
 newStaffs: StaffItem[],
 newCategories: HubCategoryItem[],
 newServices: HubServiceItem[]
 ) => {
 if (isReadOnlyMode) return;
 
 // 解析 newHours 看看是否触发了今日关门或节假日
 // 根据用户的操作（例如从 NebulaConfigHub 传过来的 newHours）自动同步 storeStatus
 let nextStoreStatus: 'open' | 'closed_today' | 'holiday' = 'open';
 const today = new Date();
 const todayStr = today.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
 
 if (newHours && !Array.isArray(newHours)) {
 // 1. 优先判断今日临时覆盖 (Today Override)
 if (newHours.todayOverride && newHours.todayOverride.date === todayStr && newHours.todayOverride.isClosed) {
 nextStoreStatus = 'closed_today';
 } 
 // 2. 其次判断特殊节假日 (Special Dates)
 else if (newHours.specialDates && newHours.specialDates[todayStr] && newHours.specialDates[todayStr].isClosed) {
 nextStoreStatus = 'holiday';
 }
 // 3. 最后判断常规星期几 (Regular)
 else if (newHours.regular) {
 const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
 const dayName = days[today.getDay()];
 const regularHours = newHours.regular[dayName];
 if (!regularHours || regularHours.length === 0) {
 // 常规的某天不营业，虽然不算 holiday，但也是今天不营业
 nextStoreStatus = 'closed_today';
 }
 }
 }
 
 // 【世界顶端架构】：直接通过 ShopContext 的 patch API 将数据写入云端
 // 乐观更新已经在 Context 内部处理完毕，日历和智控页会瞬间拿到新数据
 await updateFullShopConfig({
 hours: newHours,
 staffs: newStaffs,
 categories: newCategories,
 services: newServices,
 storeStatus: nextStoreStatus // 确保 status 联动更新
 });
 
 // 触发动作记录，扣减运力
 trackAction();
 }, [isReadOnlyMode, updateFullShopConfig, trackAction]);

 // 控制左侧边栏显示状态
 const [isSidebarOpen, setIsSidebarOpen] = useState(true);

 // 注册侧边栏的物理返回拦截
 useEffect(() => {
 if (isSidebarOpen && window.innerWidth < 1024) { // 仅在移动端/小屏幕下拦截侧边栏
 registerBack('calendar-sidebar', () => { setIsSidebarOpen(false); return true; }, 5);
 } else {
 unregisterBack('calendar-sidebar');
 }
 return () => unregisterBack('calendar-sidebar');
 }, [isSidebarOpen, registerBack, unregisterBack]);

 // 【智能折叠协议】: 监听屏幕宽度，实现 PC 端常驻、移动端自动折叠
 useEffect(() => {
 const handleResize = () => {
 if (window.innerWidth < 1024) {
 setIsSidebarOpen(false); // 手机/小尺寸平板竖屏：让出宝贵空间
 } else {
 setIsSidebarOpen(true); // PC/大尺寸平板横屏：指挥舱全开
 }
 };

 // 初始挂载时执行一次扫描
 handleResize();

 // 挂载监听器
 window.addEventListener('resize', handleResize);
 return () => window.removeEventListener('resize', handleResize);
 }, []);

 // 【世界级靶向雷达】：监听 targetBookingId 信标
 // 只要信标存在，我们就不断扫描 DOM 树，一旦找到目标元素，瞬间击发物理位移并销毁信标
 useEffect(() => {
 if (!targetBookingId) return;

 // 因为 React 的渲染和 DOM 更新有微小延迟，我们设置一个极短的高频雷达轮询 (最多找 10 次，每次 50ms)
 let attempts = 0;
 const radarInterval = setInterval(() => {
 const targetElement = document.getElementById(`booking-block-${targetBookingId}`);
 if (targetElement) {
 // 锁定目标！瞬间瞬移，没有任何中间动画，直接把色块钉死在屏幕中央！
 targetElement.scrollIntoView({ behavior: 'instant', block: 'center' });
 // 瞬间销毁信标
 setTargetBookingId(null);
 clearInterval(radarInterval);
 } else {
 attempts++;
 if (attempts >= 10) {
 // 找了半秒还没找到，可能目标在未渲染的视图里，放弃寻迹以防死循环
 setTargetBookingId(null);
 clearInterval(radarInterval);
 }
 }
 }, 50);

 return () => clearInterval(radarInterval);
 }, [targetBookingId]); // 移除了 currentDate, globalBookings，防止它们高频更新导致 setInterval 被不断重置和死循环

 // 翻页逻辑：每页 5 个员工
 const [currentStaffPage, setCurrentStaffPage] = useState(0);
 const STAFFS_PER_PAGE = 5;

 // --- 预约编辑状态 ---
 const [editingBooking, setEditingBooking] = useState<BookingEdit | null>(null);
 
 // 新增：战术准星传来的精确时间和人员
 const [crosshairTime, setCrosshairTime] = useState<string | undefined>();
 const [crosshairResourceId, setCrosshairResourceId] = useState<string | undefined>();
 
 // 新增：跨天点击传来的特定日期（为了不污染全局 currentDate，单向传递给预约弹窗）
 const [crosshairDate, setCrosshairDate] = useState<Date | undefined>();

 // 使用 Ref 暂存 globalBookings，防止它作为依赖导致 handleBookingClick 等 useCallback 被击穿
 const globalBookingsRef = useRef(globalBookings);
 useEffect(() => {
 globalBookingsRef.current = globalBookings;
 }, [globalBookings]);

 const handleBookingClick = useCallback((booking: CalendarBooking) => {
 // 防闪电战拦截：如果订阅状态还没加载回来，直接拦截，防止手速卡Bug
 if (!subscription.isLoaded) return;

 // 拦截只读模式，直接呼出全端统一订阅弹窗
 if (isReadOnlyMode) {
 openSubscriptionModal('EXPIRED_WARNING');
 return;
 }

 // 权限拦截：只读员工禁止操作任何订单
 if (isPermissionReadOnly) {
 console.log('Permission Denied: View Only');
 return;
 }

 // 权限拦截：只能修改自己的员工，禁止操作别人的订单
 if (isPermissionEditSelf && booking.resourceId !== myStaffProfile?.id && booking.resourceId !== myStaffProfile?.frontendId) {
 console.log('Permission Denied: Can only edit self');
 return;
 }

 // 【连单全域打捞协议】：
 // 日历矩阵在点击时，传过来的 booking 可能只是一个子订单的切片。
 // 如果它是连单（有 masterOrderId），我们必须从全局订单池 globalBookings 中，
 // 把所有跟它拥有相同 masterOrderId 的兄弟订单全部打捞出来，
 // 组装成一个带有完整 relatedBookings 数组的超级订单（SuperBooking），然后 再传给结账面板！
 let superBooking: BookingEdit = { ...booking };

 if (booking.masterOrderId) {
 // 在全局池中寻找所有同宗同源的兄弟
 const related = globalBookingsRef.current.filter(b => b.masterOrderId === booking.masterOrderId);
 if (related.length > 1) {
 superBooking = {
 ...booking,
 isSuperBooking: true,
 relatedBookings: related.map(rb => ({
 ...rb,
 date: rb.date || "",
 startTime: rb.startTime || "00:00",
 duration: rb.duration ?? 0,
 services: rb.services || []
 }))
 };
 console.log(`[IndustryCalendar] 触发连单打捞协议: 找到 ${related.length} 个兄弟订单`);
 }
 }

 setEditingBooking(superBooking);
 openBookingModal();
 }, [subscription.isLoaded, isReadOnlyMode, isPermissionReadOnly, isPermissionEditSelf, myStaffProfile?.id, myStaffProfile?.frontendId, openSubscriptionModal, openBookingModal]);

 const handleCreateBookingClick = useCallback(async () => {
 // --- 新增：空状态防御机制（结界） ---
 // 根据最新法则：只要没有配置项目(services)，就触发拦截；员工(staffs)不再是强制前置条件
 if (services.length === 0) {
 setConfigInitialTab('services');
 setIsConfigOpen(true);
 return;
 }

 // 防闪电战拦截：如果订阅状态还没加载回来，直接拦截，防止手速卡Bug
 if (!subscription.isLoaded) return;

 // 权限拦截：只读员工禁止开单
 if (isPermissionReadOnly) {
 console.log('Permission Denied: View Only');
 return;
 }

 // 权限拦截：只能修改自己的员工，禁止在别人的排期上开单
 if (isPermissionEditSelf && crosshairResourceId && crosshairResourceId !== myStaffProfile?.id && crosshairResourceId !== myStaffProfile?.frontendId) {
 console.log('Permission Denied: Can only edit self');
 return;
 }

 // 拦截只读模式，直接呼出全端统一订阅弹窗
 if (isReadOnlyMode) {
 openSubscriptionModal('EXPIRED_WARNING');
 return;
 }

 // 触碰即激活：如果是免费试用且尚未激活，立即激活试用期
 if (subscriptionTier === 'FREE' && !trialStartedAt && empireId) {
 try {
 const now = new Date().toISOString();
 if (typeof window !== "undefined") {
 localStorage.setItem(`gx_trial_empire_${empireId}`, now);
 }
 await supabase.from('profiles').update({ trial_started_at: now }).eq('id', empireId);
 } catch (e) {
 console.error("Failed to activate trial period:", e);
 }
 }

 // 不在这里拦截，直接打开窗口，在窗口内渲染悬浮续命遮罩
 openBookingModal();
 }, [services.length, subscription.isLoaded, isReadOnlyMode, isPermissionReadOnly, isPermissionEditSelf, myStaffProfile?.id, myStaffProfile?.frontendId, crosshairResourceId, openSubscriptionModal, subscriptionTier, trialStartedAt, empireId, openBookingModal]);

 const handleGridClick = useCallback(async (resourceId?: string, time?: string, dateStr?: string) => {
 // --- 新增：空状态防御机制（结界） ---
 // 根据最新法则：只要没有配置项目(services)，就触发拦截；员工(staffs)不再是强制前置条件
 if (services.length === 0) {
 setConfigInitialTab('services');
 setIsConfigOpen(true);
 return;
 }

 // 防闪电战拦截：如果订阅状态还没加载回来，直接拦截，防止手速卡Bug
 if (!subscription.isLoaded) return;

 // 权限拦截：只读员工禁止开单
 if (isPermissionReadOnly) {
 console.log('Permission Denied: View Only');
 return;
 }

 // 拦截只读模式，直接呼出全端统一订阅弹窗
 if (isReadOnlyMode) {
 openSubscriptionModal('EXPIRED_WARNING');
 return;
 }

 // 触碰即激活：如果是免费试用且尚未激活，立即激活试用期
 if (subscriptionTier === 'FREE' && !trialStartedAt && empireId) {
 try {
 const now = new Date().toISOString();
 if (typeof window !== "undefined") {
 localStorage.setItem(`gx_trial_empire_${empireId}`, now);
 }
 await supabase.from('profiles').update({ trial_started_at: now }).eq('id', empireId);
 } catch (e) {
 console.error("Failed to activate trial period:", e);
 }
 }

 // 不在这里拦截，直接打开窗口，在窗口内渲染悬浮续命遮罩

 setEditingBooking(null);
 setCrosshairTime(time);
 setCrosshairResourceId(resourceId);
 
 // 完美方案：只将点击的日期存入独立的 crosshairDate 状态，绝不修改全局 currentDate！
 // 这样弹窗能拿到正确的日期，而底层的瀑布流锚点依然稳如泰山。
 if (dateStr) {
 const parts = dateStr.split('-');
 if (parts.length === 3) {
 const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
 if (!isNaN(d.getTime())) {
 setCrosshairDate(d);
 }
 }
 } else {
 setCrosshairDate(undefined);
 }
 
 openBookingModal();
 }, [services.length, subscription.isLoaded, isReadOnlyMode, isPermissionReadOnly, isPermissionEditSelf, myStaffProfile?.id, myStaffProfile?.frontendId, openSubscriptionModal, subscriptionTier, trialStartedAt, empireId, openBookingModal]);

 // 用于同步表头与矩阵的横向滚动
 const headerScrollRef = useRef<HTMLDivElement>(null);
 const matrixScrollRef = useRef<HTMLDivElement>(null); // Add ref for matrix to sync from header
 const horizontalScrollRafRef = useRef<number | null>(null);
 
 const handleMatrixHorizontalScroll = useCallback((scrollLeft: number) => {
 if (horizontalScrollRafRef.current) return;
 
 horizontalScrollRafRef.current = requestAnimationFrame(() => {
 if (headerScrollRef.current) {
 headerScrollRef.current.scrollLeft = scrollLeft;
 }
 horizontalScrollRafRef.current = null;
 });
 }, []);

 // 如果预约弹窗或财务舱打开，我们需要隐藏日历主体，仅保留星空背景
 const isMainContentVisible = !isBookingModalOpen && !isFinanceDashboardOpen && !isConfigOpen;

 const handleNavigate = useCallback((direction: 'prev' | 'next') => {
 setCurrentDate(prev => {
 const next = new Date(prev);
 const step = direction === 'prev' ? -1 : 1;
 
 if (viewMode === 'day') {
 next.setDate(prev.getDate() + step);
 } else if (viewMode === 'week') {
 next.setDate(prev.getDate() + (step * 7));
 } else if (viewMode === 'month') {
 next.setMonth(prev.getMonth() + step);
 }
 // 同步幻象日期以防跳跃
 setPhantomDate(next);
 return next;
 });
 }, [viewMode]);

 const getTodayLabel = () => {
 switch (viewMode) {
 case 'week': return '本周';
 case 'month': return '本月';
 default: return '今天';
 }
 };

 // 强化 Admin 判定：优先读取组件传入的 mode，同时作为兜底，同步读取本地通行证，防止刷新时的时序闪烁隐藏
 // 核心业务法则：只要能进这个日历并且身份是老板（boss/merchant），就绝对拥有 Admin 权限！
 const isAdmin = mode === "admin" || effectiveUserRole === 'boss' || effectiveUserRole === 'merchant';

 const handleDateSwipe = useCallback((direction: 'prev' | 'next') => {
 handleNavigate(direction);
 }, [handleNavigate]);

 const handleReadOnlyIntercept = useCallback(() => {
 if (isReadOnlyMode) {
 openSubscriptionModal('EXPIRED_WARNING');
 } else if (isPermissionReadOnly) {
 console.log('Permission Denied: View Only');
 }
 }, [isReadOnlyMode, isPermissionReadOnly, openSubscriptionModal]);

 const handlePhantomDateChange = useCallback((dateStr: string) => {
 const newDate = new Date(dateStr);
 if (!isNaN(newDate.getTime())) {
 setPhantomDate(newDate);
 }
 }, []);

 const handleWeekDateClick = useCallback((date: Date) => {
 setCurrentDate(date);
 setViewMode("day");
 }, []);


 // 行业 DNA 配置中心 - 升级版
 const industryDNAs = useMemo((): Record<IndustryType, IndustryDNA & { iconComp: LucideIcon }> => ({
 beauty: {
 type: "beauty",
 pivot: "resource",
 label: "美业",
 themeColor: "text-gx-purple",
 accent: "purple",
 icon: "Scissors",
 iconComp: Scissors,
 slotUnit: 30,
 features: ["stylist_queue", "service_tags", "liquid_track"],
 metadata: { 
 specializationLabel: "资深技师",
 columnHeader: "服务技师",
 rowHeader: "预约时间",
 matrixStyle: "audio_track"
 }
 },
 medical: {
 type: "medical",
 pivot: "resource",
 label: "医疗",
 themeColor: "text-white",
 accent: "none",
 icon: "Stethoscope",
 iconComp: Stethoscope,
 slotUnit: 15,
 features: ["teeth_map", "doctor_shift", "expert_matrix"],
 metadata: { 
 specializationLabel: "主任医师",
 columnHeader: "诊疗专家",
 rowHeader: "诊疗时段",
 matrixStyle: "clinical_grid"
 }
 },
 dining: {
 type: "dining",
 pivot: "spatial",
 label: "餐饮",
 themeColor: "text-orange-500",
 accent: "gold",
 icon: "Utensils",
 iconComp: Utensils,
 slotUnit: 60,
 features: ["table_radar", "bill_summary", "spatial_mapping"],
 metadata: { 
 spatialDensity: 0.85,
 columnHeader: "座席编号",
 rowHeader: "用餐时段",
 matrixStyle: "radar_array"
 }
 },
 hotel: {
 type: "hotel",
 pivot: "timeline",
 label: "住宿",
 themeColor: `${visualSettings?.timelineColorTheme === 'coreblack' ? "text-[#8B7355]" : "text-[#FDF5E6]"}`,
 accent: "cyan",
 icon: "Hotel",
 iconComp: Hotel,
 slotUnit: 1440,
 features: ["room_status", "stay_duration"],
 metadata: {
 columnHeader: "日期",
 rowHeader: "房号"
 }
 },
 expert: {
 type: "expert",
 pivot: "resource",
 label: "专家",
 themeColor: "text-blue-400",
 accent: "none",
 icon: "Briefcase",
 iconComp: Briefcase,
 slotUnit: 45,
 features: ["case_notes", "meeting_link"],
 metadata: { 
 specializationLabel: "资深专家",
 columnHeader: "咨询专家",
 rowHeader: "咨询时间"
 }
 },
 fitness: {
 type: "fitness",
 pivot: "capacity",
 label: "健身",
 themeColor: "text-green-400",
 accent: "none",
 icon: "Dumbbell",
 iconComp: Dumbbell,
 slotUnit: 60,
 features: ["workout_plan", "body_stats", "flow_tide"],
 metadata: { 
 flowThreshold: 45,
 columnHeader: "入场记录",
 rowHeader: "时间流"
 }
 },
 other: {
 type: "other",
 pivot: "resource",
 label: "常规",
 themeColor: "text-white",
 accent: "none",
 icon: "CalendarIcon",
 iconComp: CalendarIcon,
 slotUnit: 60,
 features: []
 }
 }), []);

 const dna = useMemo(() => industryDNAs[industry], [industry, industryDNAs]);

 const resources: MatrixResource[] = useMemo(() => {
 // 确保在客户端挂载前返回空，避免服务端渲染不一致
 if (!isMounted) return [];

 let baseResources: MatrixResource[] = [];

 if (industry === 'medical' || industry === 'expert') {
 baseResources = [
 { id: '1', name: '张医生', role: '主任医师', avatar: '👨‍⚕️', themeColor: '#3b82f6' },
 { id: '2', name: '李医生', role: '副主任', avatar: '👩‍⚕️', themeColor: '#10b981' },
 { id: '3', name: '王专家', role: '资深专家', avatar: '👨‍🔬', themeColor: '#8b5cf6' },
 { id: '4', name: '赵医生', role: '主治医师', avatar: '👩‍🔬', themeColor: '#f59e0b' },
 ];
 } else {
 // 使用全局 staffs 状态，过滤掉离职员工
 let validStaffs = staffs.filter(s => s.status !== 'resigned');

 // 【物理权限隔离】：如果是普通员工（非 boss/merchant），且他在系统中有绑定记录
      if (effectiveUserRole === 'user' && (userGxId || userBaseGxId || userMerchantGxId)) {
        // 【纯数字匹配法则】：提取 ID 中的纯数字部分进行物理匹配，无视前缀字母 (如 GX-UR- 或 GX-MC-)
        const extractDigits = (id: string | undefined | null) => id ? id.replace(/\D/g, '') : null;
        
        const numericUserGxId = extractDigits(userGxId);
        const numericBaseGxId = extractDigits(userBaseGxId);
        const numericMerchantGxId = extractDigits(userMerchantGxId);
        
        // 找到当前登录员工在门店中的身份档案
        const staffProfile = validStaffs.find(s => {
          const numericStaffId = extractDigits(s.frontendId);
          if (!numericStaffId) return false;
          
          return (numericUserGxId && numericStaffId === numericUserGxId) || 
                 (numericBaseGxId && numericStaffId === numericBaseGxId) || 
                 (numericMerchantGxId && numericStaffId === numericMerchantGxId);
        });
        
        // 🚨 Fail-Closed 兜底阻断：找不到档案，或者档案没写明 calendarView === 'all'，一律不给看全店
        if (!staffProfile) {
          // 透明人：没档案就啥也看不见
          validStaffs = [];
        } else if (staffProfile.calendarView !== 'all') {
          // 只要不是明确的 'all' (例如 'self' 或未设置)，就强制只看自己
          validStaffs = [staffProfile];
        }
      }

 baseResources = validStaffs
 .map(s => ({
 id: s.id,
 name: s.name,
 role: s.role,
 avatar: s.frontendId && staffAvatars[s.frontendId] ? staffAvatars[s.frontendId] : undefined,
 themeColor: s.color,
 status: (s.status === 'on_leave' ? 'away' : 'available') as "away" | "available" | "busy",
 metadata: {
 originalStatus: s.status,
 frontendId: s.frontendId
 }
 }));
 }

 // 动态 NEXUS 网络预约列逻辑：
 // 查询云端数据，如果今天存在 originalUnassigned 或 status: PENDING 的野单，则在最左侧强行挂载 NEXUS 列
 let hasPendingToday = false;
 
 // 【物理隔离衍生】：如果当前员工仅限查看自己（或档案缺失），则不显示 NEXUS 和 NO 列
  let isSelfViewOnly = false;
  if (effectiveUserRole === 'user') {
    const extractDigits = (id: string | undefined | null) => id ? id.replace(/\D/g, '') : null;
    const numericUserGxId = extractDigits(userGxId);
    const numericBaseGxId = extractDigits(userBaseGxId);
    const numericMerchantGxId = extractDigits(userMerchantGxId);

    const staffProfile = staffs.find(s => {
      const numericStaffId = extractDigits(s.frontendId);
      if (!numericStaffId) return false;
      return (numericUserGxId && numericStaffId === numericUserGxId) || 
             (numericBaseGxId && numericStaffId === numericBaseGxId) || 
             (numericMerchantGxId && numericStaffId === numericMerchantGxId);
    });
    // 如果没有档案，或者档案没明确配置看 'all'，那就是“受限视图”
    isSelfViewOnly = !staffProfile || staffProfile.calendarView !== 'all';
  }

 try {
 if (globalBookings && globalBookings.length > 0 && !isSelfViewOnly) {
 // 【核心修复】：使用 YYYY-MM-DD 格式进行安全比对，避免时区偏差
 const year = currentDate.getFullYear();
 const month = String(currentDate.getMonth() + 1).padStart(2, '0');
 const day = String(currentDate.getDate()).padStart(2, '0');
 const currentDateStr = `${year}-${month}-${day}`;
 
 const shopId = searchParams.get('shopId');
 
 hasPendingToday = globalBookings.some((b) => {
 // 容错：如果 date 包含 T，只取前半部分
 const bDate = b.date?.split('T')[0];
 return bDate === currentDateStr && 
 b.status === 'PENDING' && 
 (!shopId || b.shopId === shopId);
 });
 }
 } catch (e) {
 console.error("Failed to check NEXUS bookings:", e);
 }

 // 分页截取逻辑 (Pagination)
 const startIndex = currentStaffPage * STAFFS_PER_PAGE;
 const paginatedResources = baseResources.slice(startIndex, startIndex + STAFFS_PER_PAGE);

 // 强行挂载门神列 (在分页之后，保证始终在最左侧且不影响分页数学逻辑)
 if (hasPendingToday) {
 paginatedResources.unshift({
 id: 'NEXUS',
 name: 'NEXUS',
 role: '网络枢纽',
 themeColor: '#00f0ff',
 status: 'available',
 metadata: {
 isPhantomColumn: true,
 originalStatus: 'available'
 }
 });
 }

 // 动态 No-Show 爽约列逻辑：
 // 查询云端数据，如果今天存在 resourceId 为 'NO' 的订单，则在末尾挂载 NO 列
 try {
 if (globalBookings && globalBookings.length > 0 && !isSelfViewOnly) {
 // 【核心修复】：使用 YYYY-MM-DD 格式进行安全比对，与 NEXUS 列保持一致
 const year = currentDate.getFullYear();
 const month = String(currentDate.getMonth() + 1).padStart(2, '0');
 const day = String(currentDate.getDate()).padStart(2, '0');
 const currentDateStr = `${year}-${month}-${day}`;
 
 const shopId = searchParams.get('shopId');
 
 const hasNoShowToday = globalBookings.some((b) => {
 // 容错：如果 date 包含 T，只取前半部分
 const bDate = b.date?.split('T')[0];
 return bDate === currentDateStr && 
 b.resourceId === 'NO' && 
 (!shopId || b.shopId === shopId);
 });
 
 if (hasNoShowToday) {
 paginatedResources.push({
 id: 'NO',
 name: 'NO',
 role: '爽约名单',
 themeColor: '#ef4444',
 status: 'busy',
 metadata: {
 isNoShowColumn: true,
 originalStatus: 'busy'
 }
 });
 }
 }
 } catch (e) {
 console.error("Failed to check NO show bookings:", e);
 }

 return paginatedResources;
 }, [industry, staffs, isMounted, currentStaffPage, currentDate, globalBookings, searchParams, effectiveUserRole, userGxId, userBaseGxId, userMerchantGxId, staffAvatars, industryDNAs]);

 // 表头翻页手势处理
 const handleHeaderPanEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
 const swipeThreshold = 50;
 if (info.offset.x < -swipeThreshold) {
 // 向左滑，下一页
 setCurrentStaffPage(prev => prev + 1);
 } else if (info.offset.x > swipeThreshold) {
 // 向右滑，上一页
 setCurrentStaffPage(prev => Math.max(0, prev - 1));
 }
 };

 return (
 <div className={cn("flex h-full w-full bg-transparent overflow-hidden relative calendar-full-area", `theme-${visualSettings.headerTitleColorTheme}`)}>
 {/* 紧急运力续命横幅 */}
 <GracePeriodBanner 
 remainingTime={remainingTime} 
 remainingMilliseconds={remainingMilliseconds}
 isReadOnlyMode={isReadOnlyMode} 
 isGracePeriodActive={isGracePeriodActive} 
 gracePeriodActionsLeft={gracePeriodActionsLeft}
 />

 {/* 幽灵隐匿结界 (Phantom Fade Protocol) - 极致硬核版：零延迟瞬切 */}
 <div 
 className={cn(
 "flex h-full w-full flex-col md:flex-row relative",
 !isMainContentVisible && "hidden" // 直接使用 hidden，完全阻断渲染树计算，0延迟硬切
 )}
 // 撤销最外层遮罩的手势监听，点击遮罩关闭的逻辑通过 onClick 实现
 onClick={() => {
 if (isSidebarOpen) setIsSidebarOpen(false);
 }}
 >
 {/* [SIDEBAR] 左侧控制中心 (Side Control Hub) - App Shell 固定宽度 */}
 <AnimatePresence initial={false}>
 {isSidebarOpen && (
 <motion.aside 
 
 
 
 
 // 恢复并将手势监听绑定在侧边栏容器本身，且设置 touch-none 确保手势不被内部元素或浏览器吞噬
 onPanEnd={(_e, info) => {
 if (info.offset.x < -30 || info.velocity.x < -300) {
 setIsSidebarOpen(false);
 }
 }}
 // onClick 阻止冒泡，防止点击侧边栏内部时触发外层遮罩的关闭
 onClick={(e) => e.stopPropagation()}
 className="bg-transparent flex flex-col relative z-20 shrink-0 overflow-hidden whitespace-nowrap absolute md:relative top-0 left-0 h-full md:bg-transparent backdrop-blur-xl md:backdrop-blur-none touch-none"
 >
 <div className="w-[260px] h-full flex flex-col">
 {/* --- 联邦制权限指挥链 (Chain of Command) --- */}
 <div className="px-8 pb-6 pt-8 flex flex-col gap-3">
 {(effectiveUserRole === 'boss' || effectiveUserRole === 'merchant') && (
 <OrbitalPossessionProfile 
 bossName={userName || 'BOSS'}
 bossId={userGxId || 'GX88888888'}
 bossAvatar={trueBusinessAvatar}
 shopName={activeShopName}
 shopId={shopId}
 onNavigateHome={() => {
 // 顶端架构：不仅派发事件，且必须同时修改 activeTab 以彻底断绝后顾之忧
 const event = new CustomEvent('gx-set-tab', { detail: 'me' });
 window.dispatchEvent(event);
 // 使用软路由实现与物理键同等的“秒切”，消除硬刷新闪烁
 setActiveTab('me');
 }} 
 />
 )}

 {effectiveUserRole === 'user' && (
 <div className="space-y-1 relative">
 <div className={cn("flex flex-col gap-1 text-[11px] uppercase tracking-widest ml-4 mb-2 ", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black" : "text-white")}>
 <div className="flex items-center gap-2"><div className={cn("w-1 h-1 rounded-full ", visualSettings.headerTitleColorTheme === 'coreblack' ? "bg-black/20" : "bg-white/20")}/>{t('txt_c145c6')}</div>
 <div className="flex items-center gap-2"><div className={cn("w-1 h-1 rounded-full ", visualSettings.headerTitleColorTheme === 'coreblack' ? "bg-black/20" : "bg-white/20")}/>{t('txt_b08822')}</div>
 </div>
 <div className={cn("absolute left-4 top-2 bottom-6 w-px ", visualSettings.headerTitleColorTheme === 'coreblack' ? "bg-black/10" : "bg-white/10")} />
 <div 
 onClick={() => {
 const event = new CustomEvent('gx-set-tab', { detail: 'me' });
 window.dispatchEvent(event);
 setActiveTab('me');
 }}
 className={cn(
 "flex items-center gap-3 p-3 rounded-xl bg-transparent border ml-6 relative cursor-pointer group",
 visualSettings.headerTitleColorTheme === 'coreblack' ? "border-black/10 " : "border-white/10 "
 )}
 title={t('txt_5bcc6c')}
 >
 <div className={cn("absolute -left-2.5 top-1/2 w-2.5 h-px ", visualSettings.headerTitleColorTheme === 'coreblack' ? "bg-black/10" : "bg-white/10")} />
 <div className={cn(
 "w-8 h-8 rounded-full border flex items-center justify-center text-xs overflow-hidden",
 visualSettings.headerTitleColorTheme === 'coreblack' ? "bg-black/5 border-black/10 text-black" : "bg-white/5 border-white/10 text-white"
 )}>
 {user && typeof user === 'object' && 'avatar' in user && user.avatar ? (
 // eslint-disable-next-line @next/next/no-img-element
 <img src={user.avatar as string} alt="avatar" className="w-full h-full object-cover" />
 ) : (
 userInitial || 'S'
 )}
 </div>
 <div>
 <div className={cn("text-xs uppercase ", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black" : "text-white")}>{userName || 'STAFF'}</div>
 <div className={cn("text-[11px] tracking-widest ", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black" : "text-white")}>EXECUTIVE_UNIT</div>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* 行业切换区 (已移除，移至底部时钟下方) */}
 <div className="px-8 space-y-6 pt-0">
 {/* 核心统计 (Dynamic) */}
 <div className="grid grid-cols-3 gap-2 pt-8 pointer-events-auto relative z-50">
 {(() => {
 const shopIdStr = searchParams.get('shopId');
 
 const year = new Date().getFullYear();
 const month = String(new Date().getMonth() + 1).padStart(2, '0');
 const day = String(new Date().getDate()).padStart(2, '0');
 const realTodayStr = `${year}-${month}-${day}`;

 // 1. 今日预约数 (排除 PENDING 和 NO 的真实订单，连单按 1 单计 算)
 const todayBookings = globalBookings.filter(b => {
 const bDate = b.date?.split('T')[0];
 return bDate === realTodayStr && b.status !== 'PENDING' && b.resourceId !== 'NO' && (!shopIdStr || b.shopId === shopIdStr);
 });

 const uniqueTodayOrders = new Set<string>();
 let todayBookingsCount = 0;
 todayBookings.forEach(b => {
 if (b.masterOrderId) {
 if (!uniqueTodayOrders.has(b.masterOrderId)) {
 uniqueTodayOrders.add(b.masterOrderId);
 todayBookingsCount++;
 }
 } else {
 todayBookingsCount++;
 }
 });

 // 2. 原生今日待处理数 (未完成的真实订单，连单按 1 单计算) 
 const todayPendingBookings = globalBookings.filter(b => { 
 const bDate = b.date?.split('T')[0];
 const status = b.status?.toUpperCase();
 return bDate === realTodayStr && status !== 'PENDING' && status !== 'COMPLETED' && status !== 'CHECKED_OUT' && b.resourceId !== 'NO' && (!shopIdStr || b.shopId === shopIdStr);
 });

 const uniquePendingOrders = new Set<string>();
 let todayPendingCount = 0;
 todayPendingBookings.forEach(b => {
 if (b.masterOrderId) {
 if (!uniquePendingOrders.has(b.masterOrderId)) {
 uniquePendingOrders.add(b.masterOrderId);
 todayPendingCount++;
 }
 } else {
 todayPendingCount++;
 }
 });

 // 3. 今日已结账数
 const todayCompletedBookings = globalBookings.filter(b => { 
 const bDate = b.date?.split('T')[0];
 const status = b.status?.toUpperCase();
 return bDate === realTodayStr && (status === 'COMPLETED' || status === 'CHECKED_OUT') && b.resourceId !== 'NO' && (!shopIdStr || b.shopId === shopIdStr);
 });

 const uniqueCompletedOrders = new Set<string>();
 let todayCompletedCount = 0;
 todayCompletedBookings.forEach(b => {
 if (b.masterOrderId) {
 if (!uniqueCompletedOrders.has(b.masterOrderId)) {
 uniqueCompletedOrders.add(b.masterOrderId);
 todayCompletedCount++;
 }
 } else {
 todayCompletedCount++;
 }
 });

 // 4. AI 跨期野单总数 (NEXUS ALERT) - 终极纯净版：仅捕获 PENDING 待确认订单
 const allNexusBookings = globalBookings.filter(b => {
 return b.status === 'PENDING' && (!shopIdStr || b.shopId === shopIdStr);
 }).sort((a, b) => {
 const dateA = a.date?.split('T')[0] || "";
 const dateB = b.date?.split('T')[0] || "";
 if (dateA !== dateB) return dateA.localeCompare(dateB);
 return (a.startTime || "").localeCompare(b.startTime || "");
 });

 const nexusCount = allNexusBookings.length;

 return (
 <>
 {/* 原生卡片 1：今日预约 */}
 <div className="p-3 bg-transparent flex flex-col items-center">
 <span className={cn("text-[11px] uppercase text-center", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black" : "text-white")}>{t('txt_3353f0') || '今日预约'}</span>
 <div className="flex items-center justify-center mt-1">
 <span className={cn("text-xl tracking-tighter text-center", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black" : `${visualSettings?.timelineColorTheme === 'blackgold' ? "text-[#8B7355]" : "text-[#FDF5E6]"}`)}>{todayBookingsCount.toString().padStart(2, '0')}</span>
 </div>
 </div>

 {/* 原生卡片 2：今日待处理 (业务待服务) */}
 <div className="p-3 bg-transparent flex flex-col items-center">
 <span className={cn("text-[11px] uppercase text-center", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black" : "text-white")}>{t('txt_047109') || '待处理'}</span>
 <div className="flex items-center justify-center mt-1">
 <span className={cn("text-xl tracking-tighter text-center", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black " : "text-white")}>{todayPendingCount.toString().padStart(2, '0')}</span>
 </div>
 </div>

 {/* 原生卡片 3：今日已结账 */}
 <div className="p-3 bg-transparent flex flex-col items-center">
 <span className={cn("text-[11px] uppercase text-center", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black" : "text-white")}>已结账</span>
 <div className="flex items-center justify-center mt-1">
 <span className={cn("text-xl tracking-tighter text-center", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black" : "text-[#39FF14]")}>{todayCompletedCount.toString().padStart(2, '0')}</span>
 </div>
 </div>

 {/* 专属卡片 4：新预约提醒 (NEXUS ALERT) - 占据整行 */}
 {nexusCount > 0 && (
 <div 
 onClick={() => {
 const nextPending = allNexusBookings[0];
 if (nextPending.date) {
 const targetDate = new Date(nextPending.date.split('T')[0]);
 setCurrentDate(targetDate);
 setPhantomDate(targetDate);
 // 【时空穿梭引擎启动】：发射靶向信标
 setTargetBookingId(nextPending.id);
 // 移除画蛇添足的侧边栏强制关闭逻辑，保持大屏工作流连贯
 }
 }}
 className={cn(
 "col-span-3 p-3 mt-2 relative cursor-pointer bg-transparent",
 visualSettings.headerTitleColorTheme === 'coreblack' 
 ? "hover:opacity-80" 
 : "hover:opacity-80"
 )}
 >
 <div className="relative z-10 flex items-center justify-between">
 <div className="flex flex-col">
 <span className={cn(
 "text-[11px] uppercase tracking-[0.2em] flex items-center gap-2 ",
 visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black" : `${visualSettings?.timelineColorTheme === 'blackgold' ? "text-[#8B7355]" : "text-[#FDF5E6]"}`
 )}>
 <span className={cn("w-1.5 h-1.5 rounded-full animate-ping ", visualSettings.headerTitleColorTheme === 'coreblack' ? "bg-black" : `${visualSettings?.timelineColorTheme === 'blackgold' ? "bg-[#8B7355]" : "bg-[#FDF5E6]"}`)} />
 {t('txt_7708f1')}</span>
 <span className={cn("text-[11px] mt-0.5 ", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black" : `${visualSettings?.timelineColorTheme === 'blackgold' ? "text-[#8B7355]" : "text-[#FDF5E6]"}`)}>{t('txt_9874b3')}</span>
 </div>
 <div className="flex items-end gap-2">
 <span className={cn(
 "text-2xl tracking-tighter ",
 visualSettings.headerTitleColorTheme === 'coreblack' 
 ? "text-black" 
 : `${visualSettings?.timelineColorTheme === 'blackgold' ? "text-[#8B7355]" : "text-[#FDF5E6]"} drop-`
 )}>
 {nexusCount.toString().padStart(2, '0')}
 </span>
 </div>
 </div>
 </div>
 )}
 </>
 );
 })()}
 </div>
 </div>

 {/* 极速开单 (Walk-in Quick Booking) */}
 <div className="px-8 mt-4 pointer-events-auto relative z-50">
 <button
 onClick={() => {
 const now = new Date();
 
 // 向下取整到最近的 5 分钟 (如 14:34 -> 14:30, 14:38 -> 14:35)
 const minutes = now.getMinutes();
 const snappedMinutes = Math.floor(minutes / 5) * 5;
 now.setMinutes(snappedMinutes);
 now.setSeconds(0);
 now.setMilliseconds(0);

 const hh = String(now.getHours()).padStart(2, '0');
 const mm = String(now.getMinutes()).padStart(2, '0');
 const timeString = `${hh}:${mm}`;

 // 设置日期为今天
 setCurrentDate(now);
 setPhantomDate(now);

 // 触发双窗预约界面并传递参数
 setCrosshairDate(now);
 setCrosshairTime(timeString);
 setCrosshairResourceId(undefined); // 不分配技师，默认为散客池 
 setEditingBooking(null); // 确保是新建而不是编辑
 handleCreateBookingClick();
 }}
 className={cn(
 "w-full flex items-center justify-center py-3.5 group relative bg-transparent",
 visualSettings.headerTitleColorTheme === 'coreblack'
 ? ""
 : ""
 )}
 >
 <span className={cn(" tracking-widest text-xs uppercase ", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black" : `${visualSettings?.timelineColorTheme === 'blackgold' ? "text-[#8B7355]" : "text-[#FDF5E6]"}`)}>
 极速入店
 </span>
 </button>
 </div>

 {/* AI 财务核算 (AI Finance Dashboard) - 顶级 B 端全息入口 */} 
 <div className="px-8 mt-4 pointer-events-auto relative z-50"> 
 <button
 onClick={() => setIsFinanceDashboardOpen(true)}
 className={cn(
 "w-full flex items-center justify-center gap-3 px-4 py-3 group relative bg-transparent"
 )}
 >
 <div className="flex items-center gap-3 relative z-10">
 <span className={cn("text-xs tracking-widest ", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black" : "text-white")}>AI 财务核算</span>
 </div>
 <div className="flex items-center gap-1 relative z-10">
 <div className={cn("w-0.5 h-3 rounded-full animate-[pulse_1s_ease-in-out_infinite]", visualSettings.headerTitleColorTheme === 'coreblack' ? "bg-purple-600" : "bg-purple-400")} />
 <div className={cn("w-0.5 h-4 rounded-full animate-[pulse_1.2s_ease-in-out_infinite_0.2s]", visualSettings.headerTitleColorTheme === 'coreblack' ? "bg-purple-600" : "bg-purple-400")} />
 <div className={cn("w-0.5 h-2 rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.4s]", visualSettings.headerTitleColorTheme === 'coreblack' ? "bg-purple-600" : "bg-purple-400")} />
 </div>
 </button>
 </div>

 {/* 动态当前时间显示区 (居中置底) */}
 <div className="mt-auto p-8 flex flex-col items-center justify-center relative w-full">
 {isMounted ? (
 <CyberClock />
 ) : (
 <div className="h-[88px] flex items-center justify-center">
 <span className={cn("text-xs ", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black" : "text-white")}>SYNCING...</span>
 </div>
 )}
 </div>
 </div>
 </motion.aside>
 )}
 </AnimatePresence>

 {/* [MAIN CONTENT] 主内容区 */}
 <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden h-full pointer-events-auto">
 {/* [CONTAINER GROUP] 置顶贴合容器组 (Triple-Axe Sticky Hub) */}
 <div className="shrink-0 z-40 flex flex-col gap-0 bg-transparent pointer-events-auto">
 <AnimatePresence mode="wait">
 <motion.div
 key={industry + viewMode}
 // 移除切换时的渐变延迟，秒切
 
 
 
 className="flex flex-col gap-0"
 >
 {/* [CONTAINER 2] 日期与视图控制栏 (Date & Navigation Bar) */}
 <div className="px-3 md:px-6 py-2 md:py-3 flex items-center justify-between bg-transparent">
 <div className="flex items-center gap-2 md:gap-6 shrink">
 <div 
 className="flex items-baseline gap-1.5 md:gap-4 cursor-pointer group shrink"
 onClick={() => setIsSidebarOpen(!isSidebarOpen)}
 title={t('txt_84e0cd')}
 >
 <h3 
 suppressHydrationWarning 
 className={cn(
 "text-2xl md:text-4xl tracking-[0.02em] md:tracking-[0.15em] leading-none truncate", 
 // 如果是今天且不是黑白极简主题，应用全息流光渐变；否则使用用户设置的单色
 phantomDate.toDateString() === new Date().toDateString() && !['coreblack', 'purewhite'].includes(visualSettings.headerTitleColorTheme)
 ? `bg-gradient-to-r ${visualSettings?.timelineColorTheme === 'blackgold' ? "from-[#8B7355]" : "from-[#FDF5E6]"} via-gx-purple to-gx-gold bg-[length:200%_auto] animate-[shimmer_8s_linear_infinite] text-transparent bg-clip-text drop-`
 : CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].className
 )} 
 style={
 phantomDate.toDateString() === new Date().toDateString() && !['coreblack', 'purewhite'].includes(visualSettings.headerTitleColorTheme)
 ? {}
 : visualSettings.headerTitleColorTheme === 'purewhite' || visualSettings.headerTitleColorTheme === 'coreblack'
 ? {} // 极简白和极简黑不要任何光晕
 : { textShadow: `0 0 15px ${(CYBER_COLOR_DICTIONARY as any)[visualSettings.headerTitleColorTheme]?.hex || '#fff'}b3` }
 }
 >
 {phantomDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} {phantomDate.getDate()}
 </h3>
 <div className="flex flex-col shrink-0">
 <span 
 suppressHydrationWarning 
 className={cn(
 "text-[11px] md:text-sm tracking-[0.1em] md:tracking-[0.4em] uppercase ", 
 phantomDate.toDateString() === new Date().toDateString() && !['coreblack', 'purewhite'].includes(visualSettings.headerTitleColorTheme)
 ? `bg-gradient-to-r ${visualSettings?.timelineColorTheme === 'blackgold' ? "from-[#8B7355]" : "from-[#FDF5E6]"} via-gx-purple to-gx-gold bg-[length:200%_auto] animate-[shimmer_8s_linear_infinite] text-transparent bg-clip-text drop-`
 : CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].className
 )} 
 style={
 phantomDate.toDateString() === new Date().toDateString() && !['coreblack', 'purewhite'].includes(visualSettings.headerTitleColorTheme)
 ? {}
 : visualSettings.headerTitleColorTheme === 'purewhite' || visualSettings.headerTitleColorTheme === 'coreblack'
 ? {}
 : { textShadow: `0 0 10px ${(CYBER_COLOR_DICTIONARY as any)[visualSettings.headerTitleColorTheme]?.hex || '#fff'}66` }
 }
 >
 {phantomDate.getFullYear()}
 </span>
 </div>
 </div>
 </div>

 {/* 响应式控制中枢 (Unified Cyber Controls) */}
 <div className="flex items-center gap-1 md:gap-4 shrink-0">
 <div className="flex bg-transparent p-0.5 md:p-1 ">
 <button
 onClick={() => {
 const modes = ['day', 'week', 'month'] as const;
 const currentIndex = modes.indexOf(viewMode);
 setViewMode(modes[(currentIndex + 1) % modes.length]);
 }}
 className={cn(
 "px-2 md:px-6 py-1 md:py-1.5 text-[11px] md:text-[11px] uppercase min-w-[32px] md:w-20 text-center",
 CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].className
 )}
 >
 <span className="md:hidden">{viewMode.charAt(0)}</span>
 <span className="hidden md:inline">{viewMode}</span>
 </button>
 </div>

 <div className="flex items-center gap-0.5 md:gap-2">
 <button 
 onClick={() => handleNavigate('prev')}
 className="p-1 md:p-2 rounded-lg"
 style={{ color: CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex }}
 >
 <ChevronLeft className="w-4 h-4 md:w-4 md:h-4" />
 </button>
 <button 
 onClick={() => {
 const now = new Date();
 setCurrentDate(now);
 setPhantomDate(now);
 }}
 className="px-1.5 md:px-4 py-1 md:py-2 text-[11px] rounded-lg tracking-widest flex items-center justify-center"
 style={{ 
 color: CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex,
 textShadow: visualSettings.headerTitleColorTheme === 'purewhite' || visualSettings.headerTitleColorTheme === 'coreblack' ? 'none' : `0 0 10px ${(CYBER_COLOR_DICTIONARY as any)[visualSettings.headerTitleColorTheme]?.hex || '#fff'}80` 
 }}
 >
 <span className="md:hidden text-[11px] leading-none tracking-normal">今</span>
 <span className="hidden md:inline">{getTodayLabel()}</span>
 </button>
 <button 
 onClick={() => handleNavigate('next')}
 className="p-1 md:p-2 rounded-lg"
 style={{ color: CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex }}
 >
 <ChevronRight className="w-4 h-4 md:w-4 md:h-4" />
 </button>

 {/* 设置按钮与回收站 */}
 {isAdmin && (
 <div className="flex items-center ml-0.5 md:ml-2 gap-0.5 md:gap-1">
 <button 
 onClick={() => setIsRecycleBinOpen(true)}
 className={cn("p-1.5 md:p-2 rounded-lg group flex items-center justify-center", visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black" : "text-white")}
 title={t('txt_6508a1')}
 >
 <Trash2 className="w-4 h-4 md:w-5 md:h-5 " />
 </button>
 {isManager && (
 <button
 onClick={() => setIsConfigOpen(true)}
 className="p-1.5 md:p-2 rounded-lg group flex items-center justify-center"
 style={{ color: CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex }}
 title={t('txt_677a64')}
 >
 <Settings className="w-4 h-4 md:w-5 md:h-5 " />
 </button>
 )}
 </div>
 )}
 </div>
 </div>
 </div>

 {/* [CONTAINER 3] 服务人员列 (Resource Column Header) / 员工筛选器 */}
 {viewMode === 'day' && dna.pivot === 'resource' && (
 <div className="flex bg-transparent h-14 overflow-hidden">
 {/* 左侧固定：空位占位符，与下方时间轴对齐 */}
 <div className="w-[60px] md:w-20 shrink-0 flex items-center justify-center z-10 bg-transparent">
 </div>
 
 {/* 右侧滚动：员工卡片横向滚动区 (采用 flex 完美对齐) */}
 <motion.div 
 ref={headerScrollRef}
 className="flex-1 overflow-hidden no-scrollbar touch-none"
 onPanEnd={handleHeaderPanEnd}
 >
 <div 
 className="flex h-full w-full"
 >
 {resources.map(res => (
 <div key={res.id} className={cn("flex-1 min-w-0 h-full flex items-center justify-center relative group", res.metadata?.originalStatus === 'on_leave' ? '' : '')}>
 <div className="flex flex-col items-center justify-center leading-none bg-transparent w-full px-1 gap-1">
 <div 
 className={cn(
 "relative w-6 h-6 md:w-7 md:h-7 rounded-full overflow-hidden shrink-0 border flex items-center justify-center shadow-inner",
 visualSettings.staffNameColorTheme === 'coreblack' ? "border-black/10" : "border-white/10"
 )}
 style={{ 
 backgroundColor: res.themeColor ? `${res.themeColor}20` : 'transparent',
 borderColor: res.themeColor ? `${res.themeColor}40` : undefined
 }}
 >
 {res.avatar ? (
 // eslint-disable-next-line @next/next/no-img-element
 <img src={res.avatar} alt={res.name} className="w-full h-full object-cover" />
 ) : (
 <span className="text-[11px] " style={{ color: res.themeColor || (visualSettings.staffNameColorTheme === 'coreblack' ? '#000' : '#fff') }}>
 {res.name.charAt(0)}
 </span>
 )}
 </div>
           <span className={cn(
             "text-[11px] md:text-[11px] tracking-widest truncate uppercase w-full text-center",
             visualSettings.staffNameColorTheme !== 'purewhite' && visualSettings.staffNameColorTheme !== 'coreblack' && "mix-blend-screen",
             res.metadata?.isNoShowColumn 
               ? (visualSettings.headerTitleColorTheme === 'coreblack' ? "text-black" : "text-white") 
               : CYBER_COLOR_DICTIONARY[visualSettings.staffNameColorTheme].className
           )}>
             {res.name}
           </span>
 {res.metadata?.originalStatus === 'on_leave' && (
 <span className="absolute -top-1 right-1 px-1 py-0.5 rounded text-[11px] bg-yellow-500/20 text-yellow-500 leading-none shadow-[0_0_10px_rgba(234,179,8,0.3)] hidden md:inline-block">{t('txt_62a8cf')}</span>
 )}
 </div>
 </div>
 ))}
 </div>
 </motion.div>
 </div>
 )}
 {viewMode !== 'day' && dna.pivot === 'resource' && (
 <div className="flex bg-transparent px-6 py-4 items-center gap-4 overflow-x-auto no-scrollbar">
 <span className="text-[11px] text-white uppercase tracking-widest shrink-0">{t('txt_8b62d9')}</span>
 {resources.map(res => (
 <button
 key={res.id}
 onClick={() => {
 setSelectedStaffIds(prev => 
 prev.includes(res.id) 
 ? prev.filter(id => id !== res.id)
 : [...prev, res.id]
 );
 }}
 className={cn(
 "px-3 py-1.5 rounded-full text-[11px] tracking-widest shrink-0 flex items-center gap-2",
 selectedStaffIds.includes(res.id) 
 ? "text-white" 
 : "text-white "
 )}
 >
 <div 
 className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]"
 style={{ backgroundColor: res.themeColor || '#fff', color: res.themeColor || '#fff' }}
 />
 {res.name}
 </button>
 ))}
 </div>
 )}
 </motion.div>
 </AnimatePresence>
 </div>

 <AnimatePresence mode="wait">
 <motion.div
 key={industry + viewMode + "content"}
 
 
 
 
 className="flex-1 relative overflow-hidden"
 >
 {/* 交互式矩阵渲染层 */}
 <div className="h-full relative overflow-hidden z-10">
 
 {/* 全局物理锁定已被移除，改由底层矩阵幽灵卡片接管 (Phantom Holiday Cards) */}

 {dna.pivot === "resource" && viewMode === "day" && (
 <EliteResourceMatrix 
 industry={industry} 
 dna={dna} 
 resources={resources} 
 operatingHours={operatingHours} 
 currentDate={currentDate}
 bookings={globalBookings}
 onHorizontalScroll={handleMatrixHorizontalScroll}
 matrixScrollRef={matrixScrollRef}
 onGridClick={handleGridClick}
 onBookingClick={handleBookingClick}
 onDateSwipe={handleDateSwipe}
 storeStatus={storeStatus}
 isReadOnly={isReadOnlyMode || isPermissionReadOnly}
 onReadOnlyIntercept={handleReadOnlyIntercept}
 onPhantomDateChange={handlePhantomDateChange}
 />
 )}
 {dna.pivot === "resource" && viewMode === "week" && (
 <EliteWeekMatrix 
 industry={industry} 
 dna={dna} 
 resources={resources}
 selectedStaffIds={selectedStaffIds}
 operatingHours={operatingHours} 
 currentDate={currentDate}
 onGridClick={handleGridClick}
 onDateClick={handleWeekDateClick}
 />
 )}
 {dna.pivot === "resource" && viewMode === "month" && (
 <EliteMonthMatrix 
 industry={industry} 
 dna={dna} 
 resources={resources}
 selectedStaffIds={selectedStaffIds}
 currentDate={currentDate}
 sandboxBookings={globalBookings}
 onGridClick={handleGridClick}
 onDateClick={(date) => {
 setCurrentDate(date);
 setViewMode('day');
 }}
 />
 )}
 {dna.pivot === "spatial" && viewMode === "day" && (
 <EliteSpatialMatrix industry={industry} dna={dna} />
 )}
 {dna.pivot === "timeline" && (
 <TimelineMatrix />
 )}
 {dna.pivot === "capacity" && (
 <CapacityFlow />
 )}
 
 {/* 非日视图且非资源类型时回退到网格 */}
 {viewMode !== "day" && dna.pivot !== "timeline" && dna.pivot !== "resource" && (
 <div className="p-12 h-full flex items-center justify-center text-white text-4xl uppercase tracking-[1em] relative z-20">
 {t('txt_0aece4')}</div>
 )}
 </div>
 </motion.div>
 </AnimatePresence>

 </div>
 </div>
 
 {/* 注入星云配置中枢抽屉及其他全局弹窗 (需在结界之外，不受透明度及transform影响) */}
 {isMounted && document.body && createPortal(
 <>
 <NebulaConfigHub 
 isOpen={isConfigOpen} 
 onClose={() => setIsConfigOpen(false)}
 shopId={shopId}
 industryLabel={industryDNAs[industry].label}
 operatingHours={operatingHours}
 staffs={staffs as unknown as StaffItem[]}
 categories={categories as unknown as HubCategoryItem[]}
 services={services as unknown as HubServiceItem[]}
 onGlobalSave={handleSaveConfigs}
 isCloudDataLoaded={isCloudDataLoaded}
 businessName={userName || 'BOSS'}
 businessAvatar={trueBusinessAvatar}
 initialTab={configInitialTab}
 />

 <AiFinanceDashboardModal
 isOpen={isFinanceDashboardOpen}
 onClose={() => setIsFinanceDashboardOpen(false)}
 staffs={staffs as any}
 globalBookings={globalBookings}
 isFinanceSelfOnly={effectiveUserRole === 'user' && myStaffProfile?.financialVisibility === 'self'}
 currentUserId={myStaffProfile?.id || myStaffProfile?.frontendId}
 />
 
 <RecycleBinModal 
 isOpen={isRecycleBinOpen}
 onClose={() => setIsRecycleBinOpen(false)}
 shopId={shopId}
 />

 <DualPaneBookingModal
 key={bookingModalKey}
 isOpen={isBookingModalOpen}
 onClose={() => setIsBookingModalOpen(false)}
 initialDate={crosshairDate || currentDate}
 initialTime={crosshairTime}
 initialResourceId={crosshairResourceId}
 editingBooking={editingBooking || undefined}
 staffs={staffs}
 categories={categories}
 services={services}
 isReadOnly={isReadOnlyMode || isPermissionReadOnly}
 isPhoneMasked={isPhoneMasked}
 />
 </>,
 document.body
 )}
 </div>
 );
};
