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
import { DualPaneBookingModal, type BookingEdit } from "@/features/booking/components/DualPaneBookingModal";
import { BookingService, type BookingRealtimePayload, type ShopConfig } from "@/features/booking/api/booking";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useShop } from "@/features/shop/ShopContext";

import { NexusSwitcher } from "@/features/shop/NexusSwitcher";
import { OrbitalPossessionProfile } from "./OrbitalPossessionProfile";
import { Trash2 } from "lucide-react";
import { RecycleBinModal } from "./RecycleBinModal";
import { AiFinanceDashboardModal } from "./AiFinanceDashboardModal";
import { useTranslations } from "next-intl";
import { GracePeriodBanner } from "@/components/shared/GracePeriodBanner";

export interface OperatingHour {
  id: string;
  start: number;
  end: number;
}

// 默认营业时间配置 (修改为24小时)
const DEFAULT_HOURS: OperatingHour[] = [
  { id: '1', start: 0, end: 24 }
];

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

type CloudConfig = Pick<ShopConfig, "staffs" | "hours" | "categories" | "services" | "storeStatus">;

interface AuroraSchedulerProps {
  initialIndustry?: IndustryType;
  mode?: "admin" | "immersive";
}

// 【量子时钟微组件】：彻底物理隔离时钟的每秒滴答，防止顶层渲染风暴
const CyberClock = () => {
  const [realTime, setRealTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setRealTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <div className="flex items-baseline gap-1">
        <span className="text-5xl font-mono font-black tracking-tighter bg-gradient-to-br from-white via-gray-300 to-gray-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          {realTime.getHours().toString().padStart(2, '0')}:
          {realTime.getMinutes().toString().padStart(2, '0')}
        </span>
        <span className="text-lg font-mono text-gray-400 animate-pulse">
          {realTime.getSeconds().toString().padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mt-3">
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

  // 新增背景控制 hook
  const { settings: visualSettings } = useVisualSettings();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 共享的全局配置状态
  const [operatingHours, setOperatingHours] = useState<OperatingHour[]>(DEFAULT_HOURS);
  
  // 共享的人员列表状态
  const [staffs, setStaffs] = useState<StaffMember[]>(DEFAULT_STAFFS);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  // 默认服务配置
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [globalBookings, setGlobalBookings] = useState<CalendarBooking[]>([]);
  
  // 核心：全局营业状态
  const [storeStatus, setStoreStatus] = useState<'open' | 'closed_today' | 'holiday'>('open');

  const { user } = useAuth();
  const currentUserRole = user && 'role' in user ? user.role : 'user';
  
  // 【世界顶端架构】：在顶层日历组件中，统一查询当前登录用户的真实业务档案 (Profile Avatar)
  // 这确保了无论是左侧的轨道面板，还是右上角的雷达面板，都使用同一个来源的高清真实头像
  const [trueBusinessAvatar, setTrueBusinessAvatar] = useState<string | undefined>(
    (user && typeof user === 'object' && 'avatar' in user) ? user.avatar as string : undefined
  );
  const [trueBusinessName, setTrueBusinessName] = useState<string | undefined>(undefined);

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

  // 获取当前商户的专属 shopId，实现多租户数据物理隔离
  // 【完美 0 冲突法则】：URL 物理参数拥有绝对最高优先级
  const { activeShopId, availableShops } = useShop();
  const urlShopId = searchParams.get('shopId');
  const shopId = urlShopId || activeShopId || 'default';

  const openBookingModal = useCallback(() => {
    setBookingModalKey((k) => k + 1);
    setIsBookingModalOpen(true);
  }, []);

  // 获取当前监视的真实店铺名称 (基于绝对物理 ID)
  const activeShopName = availableShops?.find((s) => s.shopId === shopId)?.shopName || "未知节点";

  // 初始化：从云端 读取沙盒数据 (带 shopId 隔离)
  useEffect(() => {
    // 【完美 0 冲突架构】：防脏读取消令牌 (Anti-Stale-Closure Token)
    let isSubscribed = true;

    // 异步加载云端订单及云端配置 (配置接管)
    const loadCloudData = async () => {
      try {
        // 直接从 Supabase 获取配置
        const { data: configs } = await BookingService.getConfigs(shopId);
        // 直接从 Supabase 获取订单
        const { data: bookings } = await BookingService.getBookings(shopId);
        
        // 致命拦截：如果当前组件的 shopId 已经改变，或者组件已卸载，直接抛弃数据，禁止污染当前状态
        if (!isSubscribed) return;

        // 1. 加载云端订单
        setGlobalBookings((bookings || []).map((booking) => ({
          ...booking,
          resourceId: booking.resourceId ?? null,
          date: booking.date || "",
          startTime: booking.startTime || "00:00",
          duration: booking.duration ?? 0
        })));
        
        // 2. 接管配置
        const cloudConfig = configs as CloudConfig | null;
        
        if (cloudConfig) {
          if (cloudConfig.storeStatus) {
            setStoreStatus(cloudConfig.storeStatus as any);
          } else {
            setStoreStatus('open');
          }
          
          // 【方案A 强行注入】：无论云端如何，只要没有有效的（非离职）员工，就强行塞入 DEFAULT_STAFFS
          const activeStaffs = (cloudConfig.staffs as unknown as { id: string, status?: string }[] || []).filter(s => s.status !== 'resigned');
          if (cloudConfig.staffs && activeStaffs.length > 0) {
            setStaffs(cloudConfig.staffs as unknown as StaffMember[]);
            setSelectedStaffIds(activeStaffs.map((s) => s.id));
          } else {
            // 云端确实没有员工配置，或所有员工都离职了，使用兜底以防空旷
            setStaffs(DEFAULT_STAFFS);
            setSelectedStaffIds(DEFAULT_STAFFS.map(s => s.id));
          }
          
          if (cloudConfig.hours) setOperatingHours(cloudConfig.hours as OperatingHour[]);
          if (cloudConfig.categories) setCategories(cloudConfig.categories as CategoryItem[]);
          if (cloudConfig.services) setServices(cloudConfig.services as ServiceItem[]);
        } else {
          // 【产品诉求兼容】：如果彻底没有云端配置（新店），使用默认数据兜底，不让客户觉得空旷
          setSelectedStaffIds(DEFAULT_STAFFS.map(s => s.id));
          setStaffs(DEFAULT_STAFFS);
        }
        
        // 数据拉取并处理完毕，解除防反补锁，允许前端状态自由流动和保存
        setIsCloudDataLoaded(true);
      } catch (e) {
        console.error("Failed to load cloud data:", e);
        if (!isSubscribed) return;
        // 即便报错也应该解锁，避免系统彻底死锁
        setIsCloudDataLoaded(true);
      }
    };
    
    loadCloudData();
    
    // 监听本地跨组件事件 (兼容保留)
    window.addEventListener('gx-sandbox-bookings-updated', loadCloudData);

    // 🌟 激活 Supabase Realtime 引擎 (基于 shopId 的物理隔离)
    const realtimeChannel = BookingService.subscribeToShopBookings(shopId, (payload: BookingRealtimePayload) => {
      console.log(`[IndustryCalendar] Realtime DB change received for shop ${shopId}:`, payload);
      // 当当前店铺的数据库发生变化时，重新拉取最新数据以刷新日历
      // 避免 React 批处理导致的延迟，强制使用 setTimeout 放到下一个事件循环   
      setTimeout(() => {
        loadCloudData();
      }, 50);
    });

    // 🌟 挂载门店配置实时雷达 (Shop Config Radar)
    const configChannel = BookingService.subscribeToShopConfig(shopId, (payload) => {
      console.log(`[IndustryCalendar] Realtime Config change received for shop ${shopId}:`, payload);
      const newConfig = payload.new?.config as any;
      if (newConfig) {
        if (newConfig.storeStatus) {
          setStoreStatus(newConfig.storeStatus);
        }
        if (newConfig.hours && Array.isArray(newConfig.hours) && newConfig.hours.length > 0) {
          setOperatingHours(newConfig.hours);
        }
        
        // 【方案A 强行注入】：实时同步配置时，如果员工为空，也必须强塞假数据兜底
        const newStaffs = newConfig.staffs as unknown as { id: string, status?: string }[] || [];
        const activeNewStaffs = newStaffs.filter(s => s.status !== 'resigned');
        
        if (newStaffs.length > 0 && activeNewStaffs.length > 0) {
          setStaffs(newStaffs as unknown as StaffMember[]);
          setSelectedStaffIds(activeNewStaffs.map((s) => s.id));
        } else {
          setStaffs(DEFAULT_STAFFS);
          setSelectedStaffIds(DEFAULT_STAFFS.map((s) => s.id));
        }
        
        if (newConfig.categories && Array.isArray(newConfig.categories)) {
          setCategories(newConfig.categories as CategoryItem[]);
        }
        if (newConfig.services && Array.isArray(newConfig.services)) {
          setServices(newConfig.services as ServiceItem[]);
        }
      }
    });

    return () => {
      // 核心：当 shopId 发生变化时，绞杀上一回合的令牌。前面的慢请求即使回来了也会被物理丢弃
      isSubscribed = false;
      
      window.removeEventListener('gx-sandbox-bookings-updated', loadCloudData);
      if (realtimeChannel) {
        BookingService.unsubscribe(realtimeChannel);
      }
      if (configChannel) {
        BookingService.unsubscribe(configChannel);
      }
    };
  }, [shopId]);

  // ==========================================
  // 试用期水印雷达 (Watermark Radar) 从 ShopContext 同步
  // ==========================================
  const { subscription } = useShop();
  const [isReadOnlyMode, setIsReadOnlyMode] = useState<boolean>(false);

  useEffect(() => {
    // 【强制拦截】只读状态判定全部交给全局中枢 ShopContext 接管，防止退出重置
    // 从全局上下文中直接映射 isReadOnlyMode，废弃日历内部自算的倒计时！
    if ((subscription.remainingTime === "LIMIT_EXCEEDED" || subscription.remainingTime === "ACTIONS_EXHAUSTED") && !subscription.isGracePeriodActive) {
      setIsReadOnlyMode(true);
    } else {
      setIsReadOnlyMode(false);
    }
  }, [subscription.remainingTime, subscription.isGracePeriodActive]);

  const remainingTime = subscription.remainingTime;
  const isGracePeriodActive = subscription.isGracePeriodActive;
  const { subscriptionTier, trialStartedAt, empireId, gracePeriodActionsLeft } = subscription;
  const { openSubscriptionModal } = useShop();

  // --- 紧急运力续命逻辑：监听任意修改动作并扣减 ---
  useEffect(() => {
    if (!isGracePeriodActive || gracePeriodActionsLeft === null || !empireId) return;

    const handleAction = async () => {
      try {
        const newActionsLeft = Math.max(0, gracePeriodActionsLeft - 1);
        await supabase.from('profiles').update({ grace_period_actions_left: newActionsLeft }).eq('id', empireId);
        // Realtime 会自动把新的次数同步到所有端
      } catch (e) {
        console.error("Failed to deduct grace period action:", e);
      }
    };

    window.addEventListener('gx-sandbox-bookings-updated', handleAction);
    return () => {
      window.removeEventListener('gx-sandbox-bookings-updated', handleAction);
    };
  }, [isGracePeriodActive, gracePeriodActionsLeft, empireId]);

  // ==========================================
  // 【世界顶端 0 冲突架构】：显式全局保存机制 (替换隐式 useEffect 监听)
  // ==========================================
  const handleSaveConfigs = async (
    newHours: OperatingHour[],
    newStaffs: StaffItem[],
    newCategories: HubCategoryItem[],
    newServices: HubServiceItem[]
  ) => {
    try {
      if (!isCloudDataLoaded) {
        console.warn("Cloud data not fully loaded yet, rejecting save to prevent two-way sync storm.");
        return;
      }
      
      // 处理员工绑定：如果填写了 Frontend ID，触发云端绑定授权
      const bindPromises = newStaffs
        .filter(staff => staff.frontendId && staff.frontendId.trim() !== '')
        .map(staff => 
          BookingService.bindUserToShop(staff.frontendId!.trim(), shopId).catch(e => {
            console.error("[IndustryCalendar] Failed to link frontend ID to shop:", e);
          })
        );

      // 【终极防并发写灾难】：一次性合并写入数据库
      // 绝不能使用 Promise.all 去并发 updateConfigs 同一个 shops.config JSON 字段，否则会导致脏读相互覆盖！
      await Promise.all([
        BookingService.updateFullConfig(shopId, {
          hours: newHours,
          staffs: newStaffs,
          categories: newCategories,
          services: newServices,
          storeStatus: 'open'
        }),
        ...bindPromises
      ]);
      
      // 本地状态更新
      setOperatingHours(newHours);
      setStoreStatus('open');
      setStaffs(newStaffs as unknown as StaffMember[]);
      setCategories(newCategories as unknown as CategoryItem[]);
      setServices(newServices as unknown as ServiceItem[]);
      
      console.log("[IndustryCalendar] Explicit save successful.");
    } catch (e) {
      console.error("[IndustryCalendar] Explicit save failed:", e);
      throw e; // 抛给 Auto-Save 引擎捕获
    }
  };

  // 控制左侧边栏显示状态
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 【智能折叠协议】: 监听屏幕宽度，实现 PC 端常驻、移动端自动折叠
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false); // 手机/小尺寸平板竖屏：让出宝贵空间
      } else {
        setIsSidebarOpen(true);  // PC/大尺寸平板横屏：指挥舱全开
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
  }, [targetBookingId, currentDate, globalBookings]); // 依赖项改为 globalBookings，修复 ReferenceError

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

  const handleBookingClick = (booking: CalendarBooking) => {
    // 防闪电战拦截：如果订阅状态还没加载回来，直接拦截，防止手速卡Bug
    if (!subscription.isLoaded) return;

    // 拦截只读模式，直接呼出全端统一订阅弹窗
    if (isReadOnlyMode) {
      openSubscriptionModal('EXPIRED_WARNING');
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
      const related = globalBookings.filter(b => b.masterOrderId === booking.masterOrderId);
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
  };

  const handleCreateBookingClick = async () => {
    // 防闪电战拦截：如果订阅状态还没加载回来，直接拦截，防止手速卡Bug
    if (!subscription.isLoaded) return;

    // 拦截只读模式，直接呼出全端统一订阅弹窗
    if (isReadOnlyMode) {
      openSubscriptionModal('EXPIRED_WARNING');
      return;
    }

    // 触碰即激活：如果是免费试用且尚未激活，立即激活试用期
    if (subscriptionTier === 'FREE' && !trialStartedAt && empireId) {
      try {
        // 【核心修复】：不要使用前端本地时间，而是依赖数据库。这里暂时先传本地时间，但理想情况应该是让 DB 处理。
        // 为了兼容性，使用 supabase server 的时间戳（通过特殊方式或容忍少量误差）
        // 既然不能修改 DB，这里先保持。
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
  };

  const handleGridClick = async (resourceId?: string, time?: string, dateStr?: string) => {
    // 防闪电战拦截：如果订阅状态还没加载回来，直接拦截，防止手速卡Bug
    if (!subscription.isLoaded) return;

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
  };

  // 用于同步表头与矩阵的横向滚动
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const matrixScrollRef = useRef<HTMLDivElement>(null); // Add ref for matrix to sync from header
  
  const handleMatrixHorizontalScroll = (scrollLeft: number) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollLeft;
    }
  };

  // 如果预约弹窗打开，我们需要隐藏日历主体，仅保留星空背景
  const isMainContentVisible = !isBookingModalOpen;

  const handleNavigate = (direction: 'prev' | 'next') => {
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
  };

  const getTodayLabel = () => {
    switch (viewMode) {
      case 'week': return '本周';
      case 'month': return '本月';
      default: return '今天';
    }
  };

  // 强化 Admin 判定：优先读取组件传入的 mode，同时作为兜底，同步读取本地通行证，防止刷新时的时序闪烁隐藏
  // 核心业务法则：只要能进这个日历并且身份是老板（boss/merchant），就绝对拥有 Admin 权限！
  const isAdmin = mode === "admin" || currentUserRole === 'boss' || currentUserRole === 'merchant';


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
      themeColor: "text-gx-cyan",
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
      themeColor: "text-white/60",
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
      baseResources = staffs
        .filter(s => s.status !== 'resigned')
        .map(s => ({
          id: s.id,
          name: s.name,
          role: s.role,
          avatar: s.frontendId ? '🔗' : '✂️',
          themeColor: s.color,
          status: (s.status === 'on_leave' ? 'away' : 'available') as "away" | "available" | "busy",
          metadata: {
            originalStatus: s.status
          }
        }));
    }

    // 动态 NEXUS 网络预约列逻辑：
    // 查询云端数据，如果今天存在 originalUnassigned 或 status: PENDING 的野单，则在最左侧强行挂载 NEXUS 列
    let hasPendingToday = false;
    try {
      if (globalBookings && globalBookings.length > 0) {
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
      if (globalBookings && globalBookings.length > 0) {
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
  }, [industry, staffs, isMounted, currentStaffPage, currentDate, globalBookings, searchParams]);

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
      <div className="flex h-full w-full bg-transparent overflow-hidden relative">
        {/* 紧急运力续命横幅 */}
        <GracePeriodBanner 
          remainingTime={remainingTime} 
          isReadOnlyMode={isReadOnlyMode} 
          isGracePeriodActive={isGracePeriodActive} 
          gracePeriodActionsLeft={gracePeriodActionsLeft}
        />

        {/* 幽灵隐匿结界 (Phantom Fade Protocol) - 极致硬核版：零延迟瞬切 */}
      <div 
        className={cn(
          "flex h-full w-full flex-col md:flex-row absolute inset-0",
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
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
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
            {(currentUserRole === 'boss' || currentUserRole === 'merchant') && (
              <OrbitalPossessionProfile 
                bossName={userName || 'BOSS'}
                bossId={userGxId || 'GX88888888'}
                bossAvatar={trueBusinessAvatar}
                shopName={activeShopName}
                shopId={shopId}
                onNavigateHome={() => router.push('/dashboard')} // 恢复为正确的 React Router SPA 跳转，防止物理级重置
              />
            )}

            {currentUserRole === 'user' && (
              <div className="space-y-1 relative">
                <div className="flex flex-col gap-1 text-white/20 text-[9px] font-mono uppercase tracking-widest ml-4 mb-2">
                  <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-white/20"/>{t('txt_c145c6')}</div>
                  <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-white/20"/>{t('txt_b08822')}</div>
                </div>
                <div className="absolute left-4 top-2 bottom-6 w-px bg-white/10" />
                <div 
                  onClick={() => router.push('/me')}
                  className="flex items-center gap-3 p-3 rounded-xl bg-transparent border border-white/10 ml-6 relative cursor-pointer hover:bg-white/5 hover:border-white/20 transition-all group"
                  title={t('txt_5bcc6c')}
                >
                  <div className="absolute -left-2.5 top-1/2 w-2.5 h-px bg-white/10" />
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white font-black text-xs group-hover:scale-110 transition-transform overflow-hidden">
                    {user && typeof user === 'object' && 'avatar' in user && user.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar as string} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      userInitial || 'S'
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white uppercase">{userName || 'STAFF'}</div>
                    <div className="text-[9px] text-white/40 font-mono tracking-widest">EXECUTIVE_UNIT</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 行业切换区 (已移除，移至底部时钟下方) */}
          <div className="px-8 space-y-6 pt-0">
            {/* 核心统计 (Dynamic) */}
            <div className="grid grid-cols-2 gap-2 pt-8 pointer-events-auto relative z-50">
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

                // 3. AI 跨期野单总数 (NEXUS ALERT) - 终极纯净版：仅捕获 PENDING 待确认订单
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
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 transition-all">
                      <span className="text-[9px] font-mono text-white/60 font-bold uppercase tracking-widest">{t('txt_3353f0') || '今日预约'}</span>
                      <div className="flex items-end justify-between mt-1">
                        <span className={cn("text-xl font-black tracking-tighter", "text-gx-cyan")}>{todayBookingsCount.toString().padStart(2, '0')}</span>
                        <span className="text-[8px] font-mono text-white/40 font-bold mb-1">{t('txt_fb852f')}</span>
                      </div>
                    </div>

                    {/* 原生卡片 2：今日待处理 (业务待服务) */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 transition-all opacity-80">
                      <span className="text-[9px] font-mono text-white/60 font-bold uppercase tracking-widest">{t('txt_047109') || '待处理'}</span>
                      <div className="flex items-end justify-between mt-1">
                        <span className={cn("text-xl font-black tracking-tighter", "text-white/60")}>{todayPendingCount.toString().padStart(2, '0')}</span>
                        <span className="text-[8px] font-mono text-white/40 font-bold mb-1">{t('txt_65dd9e')}</span>
                      </div>
                    </div>

                    {/* 专属卡片 3：新预约提醒 (NEXUS ALERT) - 占据整行 */}
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
                        className="col-span-2 p-3 mt-2 rounded-xl transition-all relative overflow-hidden bg-gx-cyan/10 border border-gx-cyan/50 cursor-pointer hover:bg-gx-cyan/20 shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:scale-[1.02]"
                      >
                        {/* 赛博脉冲背景光 */}
                        <div className="absolute inset-0 bg-gx-cyan/10 animate-[pulse_2s_ease-in-out_infinite]" />
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-mono text-gx-cyan font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-gx-cyan animate-ping" />
                              {t('txt_7708f1')}</span>
                            <span className="text-[8px] text-gx-cyan/60 mt-0.5">{t('txt_9874b3')}</span>
                          </div>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-black tracking-tighter text-gx-cyan drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]">
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
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-gx-cyan/30 bg-gx-cyan/10 hover:bg-gx-cyan/20 transition-all group overflow-hidden relative shadow-[0_0_15px_rgba(0,240,255,0.15)] hover:shadow-[0_0_25px_rgba(0,240,255,0.3)] hover:scale-[1.02]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gx-cyan/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <div className="w-2 h-2 rounded-full bg-gx-cyan animate-pulse shadow-[0_0_8px_#00F0FF]" />
              <span className="text-gx-cyan font-bold tracking-widest text-xs uppercase drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]">
                ⚡ 极速入店
              </span>
            </button>
          </div>

          {/* AI 财务核算 (AI Finance Dashboard) - 顶级 B 端全息入口 */}       
          <div className="px-8 mt-4 pointer-events-auto relative z-50">        
            <button
              onClick={() => setIsFinanceDashboardOpen(true)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/5 bg-black/20 hover:bg-purple-500/10 transition-all group relative overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/30 group-hover:border-purple-400 group-hover:shadow-[0_0_10px_rgba(168,85,247,0.4)] transition-all">
                  <span className="text-[10px] text-purple-400">⚚</span>       
                </div>
                <span className="text-xs font-bold text-white/70 tracking-widest group-hover:text-white transition-colors">AI 财务核算</span>
              </div>
              <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity relative z-10">
                <div className="w-0.5 h-3 bg-purple-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
                <div className="w-0.5 h-4 bg-purple-400 rounded-full animate-[pulse_1.2s_ease-in-out_infinite_0.2s]" />
                <div className="w-0.5 h-2 bg-purple-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.4s]" />
              </div>
            </button>
          </div>

          {/* 动态当前时间显示区 (居中置底) */}
          <div className="mt-auto p-8 flex flex-col items-center justify-center opacity-80 hover:opacity-100 transition-opacity relative w-full">
            {isMounted ? (
              <CyberClock />
            ) : (
              <div className="h-[88px] flex items-center justify-center">
                <span className="text-white/20 text-xs font-mono animate-pulse">SYNCING...</span>
              </div>
            )}
          </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* [MAIN CONTENT] 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden h-full">
        {/* [CONTAINER GROUP] 置顶贴合容器组 (Triple-Axe Sticky Hub) */}
        <div className="shrink-0 z-40 flex flex-col gap-0 bg-transparent">
          <AnimatePresence mode="wait">
            <motion.div
              key={industry + viewMode}
              initial={{ opacity: 1 }} // 移除切换时的渐变延迟，秒切
              animate={{ opacity: 1 }}
              exit={{ opacity: 1 }}
              transition={{ duration: 0 }}
              className="flex flex-col gap-0"
            >
              {/* [CONTAINER 2] 日期与视图控制栏 (Date & Navigation Bar) */}
              <div className="px-4 md:px-6 py-3 flex items-center justify-between bg-transparent">
                <div className="flex items-center gap-4 md:gap-6">
                  <div 
                    className="flex items-baseline gap-3 md:gap-4 cursor-pointer group hover:opacity-80 transition-opacity"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    title={t('txt_84e0cd')}
                  >
                    <h3 
                      suppressHydrationWarning 
                      className={cn(
                        "text-3xl md:text-4xl font-black tracking-[0.1em] md:tracking-[0.15em] leading-none font-mono transition-all", 
                        // 如果是今天，应用全息流光渐变；否则使用用户设置的单色
                        phantomDate.toDateString() === new Date().toDateString()
                          ? "bg-gradient-to-r from-gx-cyan via-gx-purple to-gx-gold bg-[length:200%_auto] animate-[shimmer_8s_linear_infinite] text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(0,240,255,0.8)]"
                          : CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].className
                      )} 
                      style={
                        phantomDate.toDateString() === new Date().toDateString()
                          ? {} // 渐变色不使用 style 的 textShadow，直接用 drop-shadow
                          : { textShadow: `0 0 15px ${CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex}b3` }
                      }
                    >
                      {phantomDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} {phantomDate.getDate()}
                    </h3>
                    <div className="flex flex-col">
                      <span 
                        suppressHydrationWarning 
                        className={cn(
                          "text-xs md:text-sm font-mono tracking-[0.2em] md:tracking-[0.4em] uppercase transition-all", 
                          phantomDate.toDateString() === new Date().toDateString()
                            ? "bg-gradient-to-r from-gx-cyan via-gx-purple to-gx-gold bg-[length:200%_auto] animate-[shimmer_8s_linear_infinite] text-transparent bg-clip-text drop-shadow-[0_0_10px_rgba(0,240,255,0.6)]"
                            : CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].className
                        )} 
                        style={
                          phantomDate.toDateString() === new Date().toDateString()
                            ? {}
                            : { textShadow: `0 0 10px ${CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex}66` }
                        }
                      >
                        {phantomDate.getFullYear()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desktop controls */}
                <div className="hidden md:flex items-center gap-4">
                  {/* 多门店切换舱 */}
                  <NexusSwitcher />

                  <div className="flex bg-transparent rounded-xl p-1 border border-white/10 transition-colors" style={{ borderColor: `${CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex}40` }}>
                    <button
                      onClick={() => {
                        const modes = ['day', 'week', 'month'] as const;
                        const currentIndex = modes.indexOf(viewMode);
                        setViewMode(modes[(currentIndex + 1) % modes.length]);
                      }}
                      className="px-6 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all text-black w-20 text-center"
                      style={{ 
                        backgroundColor: CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex,
                        boxShadow: `0 0 15px ${CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex}80`
                      }}
                    >
                      {viewMode}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleNavigate('prev')}
                      className="p-2 rounded-lg transition-all opacity-60 hover:opacity-100"
                      style={{ color: CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        const now = new Date();
                        setCurrentDate(now);
                        setPhantomDate(now);
                      }}
                      className="px-4 py-2 text-[10px] font-black rounded-lg transition-all tracking-widest opacity-80 hover:opacity-100"
                      style={{ 
                        color: CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex,
                        textShadow: `0 0 10px ${CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex}80` 
                      }}
                    >
                      {getTodayLabel()}
                    </button>
                    <button 
                      onClick={() => handleNavigate('next')}
                      className="p-2 rounded-lg transition-all opacity-60 hover:opacity-100"
                      style={{ color: CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* 移动到右上角的设置按钮与回收站 */}
                    {isAdmin && (
                      <>
                        <button 
                          onClick={() => setIsRecycleBinOpen(true)}
                          className="p-2 ml-2 rounded-lg transition-all opacity-60 hover:opacity-100 hover:bg-red-500/10 group flex items-center justify-center text-red-400"
                          title={t('txt_6508a1')}
                        >
                          <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </button>
                        <button 
                          onClick={() => setIsConfigOpen(true)}
                          className="p-2 rounded-lg transition-all opacity-60 hover:opacity-100 group flex items-center justify-center"
                          style={{ color: CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex }}
                          title={t('txt_677a64')}
                        >
                          <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                        </button>
                      </>
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
                        <div key={res.id} className={cn("flex-1 min-w-0 h-full flex items-center justify-center relative group", res.metadata?.originalStatus === 'on_leave' ? 'opacity-50' : '')}>
                          <div className="flex flex-col items-center justify-center leading-none bg-transparent w-full px-1">
                            <span className={cn(
                              "text-[11px] md:text-[15px] font-black tracking-widest transition-all truncate uppercase w-full text-center mix-blend-screen",
                              res.metadata?.isNoShowColumn 
                                ? "text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" 
                                : CYBER_COLOR_DICTIONARY[visualSettings.staffNameColorTheme].className
                            )}>
                              {res.name}
                            </span>
                            <div className="flex items-center gap-1 mt-1.5 justify-center w-full">
                              <span className={cn(
                                "text-[8px] md:text-[9px] font-mono font-bold uppercase tracking-widest truncate transition-colors",
                                res.metadata?.isNoShowColumn ? "text-red-400/60" : CYBER_COLOR_DICTIONARY[visualSettings.staffNameColorTheme].className,
                                !res.metadata?.isNoShowColumn && "opacity-40 group-hover:opacity-80 mix-blend-screen"
                              )}>{res.role}</span>
                              {res.metadata?.originalStatus === 'on_leave' && (
                                <span className="px-1 py-0.5 rounded text-[8px] bg-yellow-500/20 text-yellow-500 leading-none shadow-[0_0_10px_rgba(234,179,8,0.3)] hidden md:inline-block">{t('txt_62a8cf')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}
              {viewMode !== 'day' && dna.pivot === 'resource' && (
                <div className="flex bg-transparent px-6 py-4 items-center gap-4 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest shrink-0">{t('txt_8b62d9')}</span>
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
                        "px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all shrink-0 flex items-center gap-2",
                        selectedStaffIds.includes(res.id) 
                          ? "text-white" 
                          : "text-white/40 opacity-50"
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
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
                    onDateSwipe={(direction) => handleNavigate(direction)}
                    storeStatus={storeStatus}
                    isReadOnly={isReadOnlyMode}
                    onReadOnlyIntercept={() => openSubscriptionModal('EXPIRED_WARNING')}
                    onPhantomDateChange={(dateStr) => {
                      // 接收到底层雷达的信号，更新顶部的幻象投影日期
                      const newDate = new Date(dateStr);
                      if (!isNaN(newDate.getTime())) {
                        setPhantomDate(newDate);
                      }
                    }}
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
                    onDateClick={(date) => {
                      setCurrentDate(date);
                      setViewMode("day");
                    }}
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
                <div className="p-12 h-full flex items-center justify-center text-white/5 font-black text-4xl uppercase tracking-[1em] relative z-20">
                  {t('txt_0aece4')}</div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 移动端专属：全息赛博控制胶囊 (Holographic Cyber Capsule) */}
        <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-2.5 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          <div className="flex bg-transparent rounded-xl p-0.5 border border-white/10">
            <button
                onClick={() => {
                  const modes = ['day', 'week', 'month'] as const;
                  const currentIndex = modes.indexOf(viewMode);
                  setViewMode(modes[(currentIndex + 1) % modes.length]);
                }}
                className="px-4 py-1 text-[10px] font-black uppercase rounded-lg transition-all text-black w-16 text-center"
                style={{ 
                  backgroundColor: CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex,
                  boxShadow: `0 0 15px ${CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex}80`
                }}
              >
                {viewMode}
              </button>
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={() => handleNavigate('prev')}
              className="p-1.5 rounded-lg transition-all opacity-60 hover:opacity-100"
              style={{ color: CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-[10px] font-black rounded-lg transition-all tracking-widest opacity-80 hover:opacity-100"
              style={{ 
                color: CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex,
                textShadow: `0 0 10px ${CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex}80` 
              }}
            >
              {getTodayLabel()}
            </button>
            <button 
              onClick={() => handleNavigate('next')}
              className="p-1.5 rounded-lg transition-all opacity-60 hover:opacity-100"
              style={{ color: CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* 移动端设置按钮 */}
            {isAdmin && (
              <button 
                onClick={() => setIsConfigOpen(true)}
                className="p-1.5 ml-1 rounded-lg transition-all opacity-60 hover:opacity-100 group flex items-center justify-center"
                style={{ color: CYBER_COLOR_DICTIONARY[visualSettings.headerTitleColorTheme].hex }}
              >
                <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* 注入星云配置中枢抽屉 (需在结界之外，不受透明度影响) */}
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
      />

      <AiFinanceDashboardModal
        isOpen={isFinanceDashboardOpen}
        onClose={() => setIsFinanceDashboardOpen(false)}
        staffs={staffs as any}
        globalBookings={globalBookings}
      />
      
      <RecycleBinModal 
        isOpen={isRecycleBinOpen}
        onClose={() => setIsRecycleBinOpen(false)}
        shopId={shopId}
      />
      </div>

      {/* 注入极致双窗预约界面 (必须在结界之外，以保持清晰呈现) */}
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
        isReadOnly={isReadOnlyMode}
      />
    </div>
  );
};
