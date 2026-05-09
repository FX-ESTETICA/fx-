"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, Minus, Crown, Target, Users, UserPlus, Wallet, ShoppingBag, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Lock, Unlock, Delete } from "lucide-react";
import { cn } from "@/utils/cn";
import { BookingEdit } from "@/features/booking/components/DualPaneBookingModal";
import { StaffItem } from "@/features/calendar/components/NebulaConfigHub";
import { useVisualSettings } from "@/hooks/useVisualSettings";
import { useShop } from "@/features/shop/ShopContext"; // 导入全局门店上下文

// --- 顶级可视化图表组件 (Bento Box Graphical Assets) ---

const MicroBarChart = ({ data, isLight, timeRange, selectedDate }: { data: number[], isLight: boolean, timeRange: string, selectedDate: Date | null }) => {
  const max = Math.max(...data, 0); // Find max
  const rangeMax = max === 0 ? 1 : max;
  const now = selectedDate || new Date();
  
  return (
    <div className="w-full h-full flex flex-col justify-end">
      {/* Bars Container */}
      <div className="flex-1 flex items-end justify-between gap-[2px] sm:gap-1 pt-8">
        {data.map((val, idx) => {
          // Determine if this bar represents the "current" time unit
           let isCurrent = false;
           if (timeRange === 'day') {
             const currentDate = now.getDate();
             isCurrent = (idx + 1) === currentDate;
           } else if (timeRange === 'week') {
             const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 is Monday
             isCurrent = idx === currentDay;
           } else if (timeRange === 'month') {
             const currentDate = now.getDate();
             isCurrent = (idx + 1) === currentDate;
           } else if (timeRange === 'quarter') {
             const currentQuarter = Math.floor(now.getMonth() / 3);
             isCurrent = idx === currentQuarter;
           } else if (timeRange === 'year') {
             const currentMonth = now.getMonth();
             isCurrent = idx === currentMonth;
           }

          const heightPercent = Math.max((val / rangeMax) * 100, 2); // 2% minimum height for empty days
          return (
            <div key={idx} className="relative flex-1 flex flex-col justify-end items-center group h-full">
              <div 
                className={cn(
                  "w-full rounded-t-[2px]",
                  isCurrent 
                    ? "bg-[#06B6D4] shadow-[0_0_8px_rgba(6,182,212,0.5)]" // Cyan Highlighting for current
                    : (isLight ? "bg-black/10 group-hover:bg-black/20" : "bg-white/10 group-hover:bg-white/20")
                )}
                style={{ height: `${heightPercent}%` }}
              />
            </div>
          );
        })}
      </div>
      
      {/* X-Axis Labels */}
      <div className="flex items-center justify-between mt-2">
        {data.map((_, idx) => {
          let label = "";
          if (timeRange === 'day') {
            if ((idx + 1) % 2 === 0) label = `${idx + 1}`;
          } else if (timeRange === 'week') {
            label = `${idx + 1}`;
          } else if (timeRange === 'month') {
            if ((idx + 1) % 2 === 0) label = `${idx + 1}`;
          } else if (timeRange === 'quarter') {
            label = ['Q1 (1-3)', 'Q2 (4-6)', 'Q3 (7-9)', 'Q4 (10-12)'][idx];
          } else if (timeRange === 'year') {
            label = `${idx + 1}`;
          }

          return (
            <div key={idx} className="flex-1 flex justify-center">
              <span className={cn(
                "text-[9px] sm:text-[10px] font-medium tracking-tighter whitespace-nowrap",
                isLight ? "text-black/30" : "text-white/30"
              )}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
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
                // Removed transition-all here to enable Instant Snap for the Donut Chart as well
                className=""
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
 const isLight = settings.calendarBgIndex !== 0;

  const { shopConfig, updateShopConfig } = useShop() || {};
  const financialPin = shopConfig?.financial_pin;
  const isGlobalLockEnabled = shopConfig?.financial_lock_enabled !== false; // 默认为 true（开启状态）
  
  // 真正的商业级隔离防御 (Session Isolation)
  // 锁的状态必须是端侧（当前会话）独立的内存状态。绝不能存数据库，否则一端解锁全网裸奔。
  // 只要数据库里有密码，默认就是锁定状态 (isSessionUnlocked: false)
  const [isSessionUnlocked, setIsSessionUnlocked] = useState(false);
  const [forceLockMode, setForceLockMode] = useState(false); // 用于无密码时强行召唤密码盘

  // 【致命修复】如果刚设置完密码，由于 financialPin 变成 true，而此时如果没有强制解锁，会卡死。
  // 增加判定：如果处于修改密码/强制锁模式，即使 financialPin 存在，只要 forceLockMode 为 true，也依然判定为锁定（渲染密码盘）
  // 【全局开关逻辑】：只有当 isGlobalLockEnabled 为 true 时，才要求验锁。如果为 false，大门敞开。
  const isLocked = forceLockMode || (Boolean(financialPin) && isGlobalLockEnabled && !isSessionUnlocked);

  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isModifyingPin, setIsModifyingPin] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false); // 新增：是否正在切换全局开关
  const [oldPinValidated, setOldPinValidated] = useState(false);

  // 生命周期防御：只要面板关闭，瞬间抹杀当前会话的解锁凭证，实现“开门必验锁”
  useEffect(() => {
    if (!isOpen) {
      setIsSessionUnlocked(false);
      setForceLockMode(false);
      setPinInput("");
      setIsModifyingPin(false);
      setIsTogglingLock(false);
      setOldPinValidated(false);
    }
  }, [isOpen]);

  // 【终极防御】隔离 `visibilitychange` 和 `offline` 对敏感状态的干扰
  // 绝对禁止在失焦或断网时触碰 `forceLockMode`, `isModifyingPin` 等状态
  useEffect(() => {
    // 如果大门已经敞开，就不需要自动上锁
    if (!isOpen || isLocked || !financialPin || !isGlobalLockEnabled) return;

    let timeoutId: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsSessionUnlocked(false); // 仅做降级锁定，不触碰其他状态
      }, 3 * 60 * 1000); 
    };

    const handleOffline = () => {
      setIsSessionUnlocked(false); // 仅做降级锁定
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('offline', handleOffline);
    // 离开当前标签页也直接上锁 (Visibility API)
    // 宽限期防御：避免被系统原生截图工具(短暂夺走焦点)误触发
    let visibilityTimeoutId: NodeJS.Timeout;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        visibilityTimeoutId = setTimeout(() => {
          setIsSessionUnlocked(false);
        }, 15000); // 15秒宽限期
      } else {
        clearTimeout(visibilityTimeoutId); // 焦点恢复，取消上锁
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(visibilityTimeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, isLocked, financialPin, isGlobalLockEnabled]);

  const handlePinSubmit = () => {
    if (isModifyingPin && oldPinValidated) {
      // Set new PIN to Cloud (密码是全网唯一的，必须存数据库)
      if (updateShopConfig && pinInput.length >= 4) {
        // 关键修复：防止因异步导致状态丢失，使用本地变量先行控制
        setIsSessionUnlocked(true); 
        setForceLockMode(false);
        setIsModifyingPin(false);
        setOldPinValidated(false);
        setPinInput("");
        updateShopConfig('financial_pin', pinInput);
        // 如果是首次设置密码，默认开启全局锁
        if (!financialPin) {
          updateShopConfig('financial_lock_enabled', true);
        }
      } else {
        setPinError(true);
        setTimeout(() => setPinError(false), 500);
      }
    } else if (isTogglingLock) {
       // 验证密码以切换全局开关
       if (pinInput === financialPin) {
          if (updateShopConfig) {
             updateShopConfig('financial_lock_enabled', !isGlobalLockEnabled);
          }
          setIsTogglingLock(false);
          setForceLockMode(false);
          setPinInput("");
       } else {
          setPinError(true);
          setTimeout(() => setPinError(false), 500);
          setPinInput("");
       }
    } else {
      // Validate PIN
      if (pinInput === financialPin) {
        if (isModifyingPin) {
          setOldPinValidated(true);
          setPinInput("");
        } else {
          setIsSessionUnlocked(true); // 密码正确，解锁当前设备的内存状态
          setPinInput("");
        }
      } else {
        setPinError(true);
        setTimeout(() => setPinError(false), 500);
        setPinInput("");
      }
    }
  };

  const handleNumClick = (num: string) => {
    if (pinInput.length < 6) {
      setPinInput(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  const handleCancel = () => {
    setPinInput("");
    setIsModifyingPin(false);
    setIsTogglingLock(false);
    setOldPinValidated(false);
    // 如果没有密码或者强制召唤，取消等于直接关闭弹窗
    if (!financialPin) {
      setForceLockMode(false);
      onClose();
    } else if (forceLockMode && isTogglingLock) {
      // 取消切换全局锁
      setForceLockMode(false);
    } else if (isLocked) {
      // 即使是有密码的正常锁定状态，点击取消也应该关闭面板退出
      onClose();
    }
  };

  const toggleLock = () => {
    if (!financialPin) {
      // 如果根本没有密码，强行锁定并让用户设置
      setForceLockMode(true);
      setIsModifyingPin(true);
      setOldPinValidated(true); 
    } else {
      // 点击锁图标，弹出密码验证以切换全局锁状态
      setForceLockMode(true);
      setIsTogglingLock(true);
      setPinInput("");
    }
  };

  // 新增日历相关状态
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // 计算日历数据
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Convert to Monday=0
    
    const days = [];
    
    // Empty slots for previous month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      // Calculate revenue for this day
      const dayBookings = globalBookings.filter(b => b.date === dateStr && ((b.status as string)?.toUpperCase() === 'COMPLETED' || (b.status as string)?.toUpperCase() === 'CHECKED_OUT'));
      let dayRevenue = 0;
      dayBookings.forEach(booking => {
        if (booking.services && Array.isArray(booking.services)) {
          booking.services.forEach((service: any) => {
            const servicePrice = (Array.isArray(service.prices) && service.prices.length > 0) ? Number(service.prices[0]) : 0;
            dayRevenue += servicePrice;
          });
        }
      });

      days.push({
        date,
        revenue: dayRevenue,
        isSelected: selectedDate?.toDateString() === date.toDateString()
      });
    }
    
    return days;
  }, [currentMonth, globalBookings, selectedDate]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // 当选择具体日期时，自动将筛选器切换为'day'，以便财务面板的数据跟随变化
    setTimeRange('day');
    setIsCalendarOpen(false); // 可选：点击后是否自动关闭日历
  };

 // --- 核心真实数据核算逻辑 (Real-time Financial Engine) ---
 
 const financialData = useMemo(() => {
 // 如果处于锁定状态，直接返回 0 数据，实现内存级物理销毁
 if (isLocked) {
   return {
     totalRevenue: 0,
     wechatRevenue: 0,
     alipayRevenue: 0,
     cashRevenue: 0,
     bankCardRevenue: 0,
     memberCardRevenue: 0,
     timelineData: Array(30).fill(0),
     trendPercentage: 0,
     staffRanking: [],
     serviceRanking: [],
     tacticalMetrics: {
       totalCustomers: 0,
       newRatio: 0,
       returningRatio: 0,
       atv: 0,
       topUps: 0,
       conversionRate: 0,
       retailRevenue: 0,
       upsellRate: 0,
       retailRatio: 0
     }
   };
 }

 // 权限隔离过滤
 const filteredBookings = isFinanceSelfOnly 
 ? globalBookings.filter(b => b.resourceId === currentUserId || (b as any).assignedEmployeeId === currentUserId) 
 : globalBookings;
 const filteredStaffs = isFinanceSelfOnly 
 ? staffs.filter(s => s.id === currentUserId || s.frontendId === currentUserId) 
 : staffs;

 // 动态时间窗引擎
  const now = selectedDate || new Date();
  now.setHours(0, 0, 0, 0);
  
  let currStart = new Date(now);
  let currEnd = new Date(now);
  let prevStart = new Date(now);
  let prevEnd = new Date(now);

  if (timeRange === 'day') {
    currEnd.setHours(23, 59, 59, 999);
    prevStart.setDate(now.getDate() - 1);
    prevEnd.setDate(now.getDate() - 1);
    prevEnd.setHours(23, 59, 59, 999);
    
    // 为了让'今日'的图表能显示整月数据，我们需要临时将图表查询范围扩大到整月
    // 注意：这里的 currentBookings 仍会只计算今天，所以我们要单独提取出一个 timelineBookings 逻辑，或者直接扩大 currStart 并依靠 status/date 分别计算总额和 timeline
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
 const timelineBookings: BookingEdit[] = [];

 // 计算用于绘制时间轴的实际时间范围
 let timelineStart = new Date(currStart);
 let timelineEnd = new Date(currEnd);

 if (timeRange === 'day') {
    // 如果是今日，时间轴需要整月的数据
    timelineStart = new Date(now.getFullYear(), now.getMonth(), 1);
    timelineEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (timeRange === 'quarter') {
    // 如果是季度，时间轴需要整年的数据
    timelineStart = new Date(now.getFullYear(), 0, 1);
    timelineEnd = new Date(now.getFullYear(), 11, 31);
  }

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
 
 if (bDate >= timelineStart && bDate <= timelineEnd) {
   timelineBookings.push(b);
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
   const timelinePoints = timeRange === 'day' ? 30 : timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : timeRange === 'quarter' ? 4 : 12;
   const timelineData = Array(timelinePoints).fill(0);
   
   timelineBookings.forEach(booking => {
     let pointIndex = 0;
     const bDate = new Date(booking.date!.replace(/-/g, '/'));
     if (timeRange === 'day') {
       // 今日：显示整个月的数据
       pointIndex = Math.max(0, Math.min(29, bDate.getDate() - 1));
     } else if (timeRange === 'week') {
       pointIndex = bDate.getDay() === 0 ? 6 : bDate.getDay() - 1; // 0-6 (Mon-Sun)
     } else if (timeRange === 'month') {
       pointIndex = Math.max(0, Math.min(29, bDate.getDate() - 1));
     } else if (timeRange === 'quarter') {
       // 季度：显示 4 个季度的完整数据
       pointIndex = Math.floor(bDate.getMonth() / 3);
     } else {
       pointIndex = Math.max(0, Math.min(11, bDate.getMonth()));
     }

    if (booking.services && Array.isArray(booking.services)) {
      booking.services.forEach((service: any) => {
        const servicePrice = (Array.isArray(service.prices) && service.prices.length > 0) ? Number(service.prices[0]) : 0;
        timelineData[pointIndex] += servicePrice;
      });
    }
  });

  currentBookings.forEach(booking => {
  // 解析支付方式，默认为现金
  // 注意：需要容错处理 paymentMethod 可能不存在或为空的情况
  const method = (booking.paymentMethod as string) || '现金';
  
  if (booking.services && Array.isArray(booking.services)) {
  booking.services.forEach((service: any) => {
  const servicePrice = (Array.isArray(service.prices) && service.prices.length > 0) ? Number(service.prices[0]) : 0;
  totalRevenue += servicePrice;
  
  // 精准渠道分流 (与 DualPaneBookingModal 的 PAYMENT_METHODS 对齐)
  // 添加了对小写或拼写变体的容错
 if (method.includes('微信') || method.toLowerCase().includes('wechat')) wechatRevenue += servicePrice;
 else if (method.includes('支付宝') || method.toLowerCase().includes('alipay')) alipayRevenue += servicePrice;
 else if (method.includes('现金') || method.toLowerCase().includes('cash')) cashRevenue += servicePrice;
 else if (method.includes('银行卡') || method.toLowerCase().includes('card')) bankCardRevenue += servicePrice;
 else if (method.includes('会员卡') || method.toLowerCase().includes('member')) memberCardRevenue += servicePrice;
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
 }, [globalBookings, staffs, timeRange, isFinanceSelfOnly, currentUserId, selectedDate, isLocked]);

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
 "fixed inset-0 z-[99999] flex items-center justify-center animate-in fade-in pointer-events-none",
 isLocked ? "p-0" : "p-0 sm:p-8",
 isLight ? "text-black" : "text-white"
 )}>
 {isLocked ? (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className={cn(
      "relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-auto",
      // 物理级防窥隔离：纯净的磨砂/实色背景，彻底切断底层透视
      isLight ? "bg-[#f5f5f5]/95 backdrop-blur-3xl" : "bg-[#0a0a0a]/95 backdrop-blur-3xl"
    )}
  >
    <div className={cn(
      "w-full max-w-[340px] max-h-[90dvh] overflow-y-auto scrollbar-hide rounded-[32px] p-6 sm:p-8 flex flex-col items-center border shadow-2xl transition-all duration-300",
      isLight ? "bg-white/80 border-black/10" : "bg-white/5 border-white/10"
    )}>
      <div className={cn(
        "w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4 shadow-inner shrink-0",
        isLight ? "bg-black/5" : "bg-white/5"
      )}>
        <Lock className={cn("w-5 h-5 sm:w-8 sm:h-8", isLight ? "text-black/60" : "text-white/60")} />
      </div>
      
      {isModifyingPin && (
        <p className={cn("mb-4 text-[11px] sm:text-[13px] font-medium tracking-widest uppercase shrink-0", isLight ? "text-black/60" : "text-white/60")}>
          {oldPinValidated ? "请输入新安全密钥" : "请验证原安全密钥"}
        </p>
      )}
      {isTogglingLock && (
        <p className={cn("mb-4 text-[11px] sm:text-[13px] font-medium tracking-widest uppercase shrink-0", isLight ? "text-black/60" : "text-white/60")}>
          {isGlobalLockEnabled ? "验证密钥以解除安防" : "验证密钥以开启安防"}
        </p>
      )}
      {!isModifyingPin && !isTogglingLock && (
        <p className={cn("mb-4 text-[11px] sm:text-[13px] font-medium tracking-widest uppercase shrink-0", isLight ? "text-black/60" : "text-white/60")}>
          请输入安全密钥
        </p>
      )}
      
      <div className="w-full flex items-center justify-center gap-3 sm:gap-4 mb-6 shrink-0 h-4">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className={cn(
            "w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-all duration-300",
            pinInput.length > i 
              ? (isLight ? "bg-black scale-100 shadow-sm" : "bg-white scale-100 shadow-[0_0_8px_rgba(255,255,255,0.5)]") 
              : (isLight ? "bg-black/10 scale-75" : "bg-white/10 scale-75"),
            pinError && "bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"
          )} />
        ))}
      </div>

      {/* 核心键盘区：使用 flex-1 占据中间所有剩余空间，内部使用 Grid 按比例撑满高度 */}
      <div className="w-full flex-1 min-h-[200px] grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handleNumClick(num.toString())}
            className={cn(
              "w-full h-full rounded-[20px] sm:rounded-2xl flex items-center justify-center text-[22px] sm:text-2xl font-medium transition-all active:scale-95",
              isLight ? "hover:bg-black/5 text-black" : "hover:bg-white/10 text-white"
            )}
          >
            {num}
          </button>
        ))}
        <button
          onClick={handleCancel}
          className={cn(
            "w-full h-full rounded-[20px] sm:rounded-2xl flex items-center justify-center text-[14px] sm:text-[15px] font-medium transition-all active:scale-95 uppercase tracking-widest",
            isLight ? "hover:bg-black/5 text-black/60" : "hover:bg-white/10 text-white/60"
          )}
        >
          {/* 取消或关闭，如果处于强制召唤且没有云端密码或者是解锁状态，则是真正的关闭 */}
          {forceLockMode || !financialPin ? "取消" : "取消"}
        </button>
        <button
          onClick={() => handleNumClick('0')}
          className={cn(
            "w-full h-full rounded-[20px] sm:rounded-2xl flex items-center justify-center text-[22px] sm:text-2xl font-medium transition-all active:scale-95",
            isLight ? "hover:bg-black/5 text-black" : "hover:bg-white/10 text-white"
          )}
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className={cn(
            "w-full h-full rounded-[20px] sm:rounded-2xl flex items-center justify-center transition-all active:scale-95",
            isLight ? "hover:bg-black/5 text-black/60" : "hover:bg-white/10 text-white/60"
          )}
        >
          <Delete className="w-6 h-6 sm:w-6 sm:h-6" />
        </button>
      </div>

      <div className="w-full flex items-center gap-3 sm:gap-4 shrink-0">
        {/* 如果没设密码，则是强制召唤模式，不显示修改按钮 */}
        {financialPin && (
          <button
            onClick={() => {
              setIsModifyingPin(true);
              setOldPinValidated(false);
              setPinInput("");
            }}
            className={cn(
              "flex-1 py-3.5 sm:py-3 rounded-xl sm:rounded-2xl text-[13px] sm:text-[14px] font-medium transition-all tracking-widest uppercase",
              isLight ? "bg-black/5 hover:bg-black/10 text-black/70" : "bg-white/5 hover:bg-white/10 text-white/70"
            )}
          >
            修改密钥
          </button>
        )}
        <button
          onClick={handlePinSubmit}
          className={cn(
            "flex-1 py-3 rounded-xl sm:rounded-2xl text-[13px] sm:text-[14px] font-medium transition-all shadow-md tracking-widest uppercase",
            isLight ? "bg-black text-white hover:bg-black/90" : "bg-white text-black hover:bg-white/90"
          )}
        >
          授权验证
        </button>
      </div>
    </div>
  </motion.div>
 ) : (
 <motion.div
 
 
 
 
 className={cn(
 "relative z-10 w-full max-w-6xl h-[100vh] sm:h-[85vh] sm:rounded-2xl flex flex-col overflow-hidden pointer-events-auto bg-black/5 dark:bg-white/5 sm:bg-transparent backdrop-blur-3xl sm:backdrop-blur-none",
 )}
 >
 {/* Header */}
 <div className={cn(
 "flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-0 sm:h-16 gap-4 sm:gap-0 pointer-events-auto sm:rounded-t-2xl shrink-0",
 )}>
 <div className="flex items-center justify-between w-full sm:w-auto shrink-0 z-50">
 <div className="flex items-center gap-3">
 <div className="relative shrink-0">
 <button 
   onClick={() => setIsCalendarOpen(!isCalendarOpen)}
   className={cn(
     "w-8 h-8 flex items-center justify-center rounded-full pointer-events-auto transition-all duration-300 border",
     isLight 
       ? (isCalendarOpen ? "bg-transparent text-[#06B6D4] border-[#06B6D4]/50 shadow-[0_0_10px_rgba(6,182,212,0.1)]" : "bg-transparent border-[#06B6D4]/20 text-[#06B6D4]/80 hover:border-[#06B6D4]/40")
       : (isCalendarOpen ? "bg-transparent text-[#06B6D4] border-[#06B6D4]/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]" : "bg-transparent border-[#06B6D4]/20 text-[#06B6D4]/80 hover:border-[#06B6D4]/40")
   )}
 >
   <CalendarIcon className="w-4 h-4" />
 </button>

 <AnimatePresence>
   {isCalendarOpen && (
     <motion.div
       initial={{ opacity: 0, y: 10, scale: 0.95 }}
       animate={{ opacity: 1, y: 0, scale: 1 }}
       exit={{ opacity: 0, y: 10, scale: 0.95 }}
       transition={{ duration: 0.2, ease: "easeOut" }}
       className={cn(
         "absolute top-full left-0 sm:left-0 mt-3 p-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border z-50 pointer-events-auto w-[280px]",
         isLight ? "bg-white border-black/10" : "bg-[#1C1C1E] border-white/10"
       )}
     >
       {/* Calendar Header */}
       <div className="flex items-center justify-between mb-4">
         <button 
           onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
           className={cn("p-1 rounded-md", isLight ? "hover:bg-black/5" : "hover:bg-white/10")}
         >
           <ChevronLeft className={cn("w-4 h-4", isLight ? "text-black" : "text-white")} />
         </button>
         <span className={cn("text-[13px] font-medium tracking-widest uppercase", isLight ? "text-black" : "text-white")}>
           {currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' })}
         </span>
         <button 
           onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
           className={cn("p-1 rounded-md", isLight ? "hover:bg-black/5" : "hover:bg-white/10")}
         >
           <ChevronRight className={cn("w-4 h-4", isLight ? "text-black" : "text-white")} />
         </button>
       </div>

       {/* Weekdays */}
       <div className="grid grid-cols-7 gap-1 mb-2">
         {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
           <div key={i} className={cn("text-center text-[10px] font-medium tracking-widest", isLight ? "text-black/40" : "text-white/40")}>
             {day}
           </div>
         ))}
       </div>

       {/* Days Grid */}
       <div className="grid grid-cols-7 gap-1">
         {calendarDays.map((dayObj, i) => {
           if (!dayObj) return <div key={i} className="aspect-square" />;
           
           const { date, revenue, isSelected } = dayObj;
           const isToday = date.toDateString() === new Date().toDateString();
           
           return (
             <button
               key={i}
               onClick={() => handleDateSelect(date)}
               className={cn(
                 "aspect-square flex flex-col items-center justify-center rounded-md relative transition-all duration-200 group",
                 isSelected
                   ? (isLight ? "bg-black text-white shadow-md" : "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]")
                   : (isLight ? "hover:bg-black/5 text-black" : "hover:bg-white/10 text-white"),
                 isToday && !isSelected && (isLight ? "border border-black/20" : "border border-white/20")
               )}
             >
               <span className="text-[12px] font-medium leading-none">{date.getDate()}</span>
               {revenue > 0 && (
                 <span className={cn(
                   "text-[9px] font-bold mt-0.5 tracking-tighter leading-none opacity-80",
                   isSelected ? (isLight ? "text-white/90" : "text-black/90") : (isLight ? "text-[#06B6D4]" : "text-[#06B6D4]")
                 )}>
                   €{revenue >= 1000 ? (revenue/1000).toFixed(1) + 'k' : revenue}
                 </span>
               )}
             </button>
           );
         })}
       </div>
     </motion.div>
   )}
 </AnimatePresence>
 </div>
 <div className="flex flex-col drop-shadow-sm">
 <h2 className={cn("text-sm tracking-widest", isLight ? "text-black font-semibold" : "text-white font-semibold")}>财务中心</h2>
 </div>
 </div>

  {/* Mobile Close Button */}
 <div className="sm:hidden flex items-center gap-2 shrink-0 z-50">
   {financialPin && (
     <button onClick={toggleLock} className={cn(
       "w-8 h-8 flex items-center justify-center rounded-full pointer-events-auto backdrop-blur-md transition-all",
       isLight ? "hover:bg-black/10 text-black hover:text-black bg-black/5" : "hover:bg-white/20 text-white hover:text-white bg-white/10"
     )}>
       {isGlobalLockEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
     </button>
   )}
   <button onClick={onClose} className={cn(
     "w-8 h-8 flex items-center justify-center rounded-full pointer-events-auto backdrop-blur-md",
     isLight ? "hover:bg-black/10 text-black hover:text-black bg-black/5" : "hover:bg-white/20 text-white hover:text-white bg-white/10"
   )}>
     <X className="w-5 h-5" />
   </button>
 </div>
 </div>

 <div 
   className="flex items-center justify-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 -mb-2 sm:mb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
   style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
 >
 <div className="flex items-center justify-center mx-auto gap-0.5 sm:gap-1 pointer-events-auto w-max px-4 sm:px-0">
 {(['day', 'week', 'month', 'quarter', 'year'] as TimeRange[]).map((range) => (
 <button
 key={range}
 onClick={() => {
   setTimeRange(range);
   setSelectedDate(null);
 }}
 className={cn(
 "px-3.5 sm:px-4 py-1.5 rounded-full text-[13px] uppercase tracking-widest whitespace-nowrap transition-all duration-300",
 timeRange === range 
 ? (isLight ? "bg-transparent text-[#06B6D4] border border-[#06B6D4]/50 shadow-[0_0_10px_rgba(6,182,212,0.1)]" : "bg-transparent text-[#06B6D4] border border-[#06B6D4]/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]")
 : (isLight ? "text-black/60 hover:text-black hover:bg-black/5 border border-transparent" : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent")
 )}
 >
 {range === 'day' ? '今日' : range === 'week' ? '本周' : range === 'month' ? '本月' : range === 'quarter' ? '季度' : '年度'}
 </button>
 ))}
 </div>
 </div>
 
 {/* Desktop Close Button */}
 <div className="hidden sm:flex items-center gap-2 shrink-0 z-50">
   {financialPin && (
     <button onClick={toggleLock} className={cn(
       "w-8 h-8 flex items-center justify-center rounded-full pointer-events-auto backdrop-blur-md transition-all",
       isLight ? "hover:bg-black/10 text-black hover:text-black bg-black/5" : "hover:bg-white/20 text-white hover:text-white bg-white/10"
     )}>
       {isGlobalLockEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
     </button>
   )}
   <button onClick={onClose} className={cn(
     "w-8 h-8 flex items-center justify-center rounded-full pointer-events-auto backdrop-blur-md",
     isLight ? "hover:bg-black/10 text-black hover:text-black bg-black/5" : "hover:bg-white/20 text-white hover:text-white bg-white/10"
   )}>
     <X className="w-5 h-5" />
   </button>
 </div>
 </div>

 {/* Scrollable Content / Lock Screen */}
 <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 scrollbar-hide pointer-events-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
 
 {/* Bento Box Top Section */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
   
   {/* Col 1 & 2: Revenue Area Chart (Bento Large Block) */}
     <div className={cn(
        "lg:col-span-2 lg:row-span-3 rounded-2xl p-5 sm:p-8 flex flex-col relative overflow-hidden group border",
         isLight ? "bg-transparent border-black/10 shadow-[0_2px_10px_rgba(0,0,0,0.05)]" : "bg-transparent border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
       )}>

      {/* Super Block: Gross Revenue + Traffic */}
       <div className="flex flex-row relative z-10 mb-10 items-start justify-between">
         
         {/* Left: Giant Money */}
         <div className="flex-1 flex flex-col justify-start pt-1">
           <span className={cn("text-[13px] uppercase tracking-widest flex items-center gap-2 mb-2", isLight ? "text-black/50" : "text-white/50")}>
             <Crown className="w-3.5 h-3.5" />
             总营业额
           </span>
           
           <div className="flex flex-col items-start w-max">
             <span className={cn("text-[36px] sm:text-7xl tracking-tighter drop-shadow-sm leading-none whitespace-nowrap", isLight ? "text-black" : "text-white")}>
               €{currentMetrics.total.toLocaleString()}
             </span>
             <div className="mt-3 w-full flex justify-start">
               <div className={cn("inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border", isPositive ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : isNegative ? "text-black/50 bg-black/5 border-black/10 dark:text-white/50 dark:bg-white/5 dark:border-white/10" : (isLight ? "text-black/60 bg-black/5 border-black/10" : "text-white/60 bg-white/5 border-white/10"))}>
                 {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                 <span className="font-medium tracking-wide">{isPositive ? '+' : ''}{trend.toFixed(1)}%</span>
               </div>
             </div>
           </div>
         </div>
 
         {/* Divider Vertical */}
         <div className={cn("w-[1px] mx-4 sm:mx-8 h-32", isLight ? "bg-black/10" : "bg-white/10")} />
 
         {/* Right: People & ATV (Stacked vertically) */}
         <div className="w-auto sm:w-56 flex flex-col justify-start shrink-0">
           
           {/* Top: Traffic */}
            <div className="flex flex-col gap-1">
              <span className={cn("text-[13px] uppercase tracking-widest flex items-center gap-2", isLight ? "text-black/50" : "text-white/50")}>
                <Users className="w-3.5 h-3.5" />
                客流
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={cn("text-[24px] sm:text-4xl tracking-tighter leading-none", isLight ? "text-black" : "text-white")}>{currentMetrics.tactical.totalCustomers}</span>
              </div>
            </div>
 
           {/* Bottom: ATV */}
           <div className="flex flex-col gap-1 mt-6">
             <span className={cn("text-[13px] uppercase tracking-widest flex items-center gap-2", isLight ? "text-black/50" : "text-white/50")}>
               <Target className="w-3.5 h-3.5" />
               客单价
             </span>
             <div className="flex items-baseline gap-2 mt-1">
               <span className={cn("text-[24px] sm:text-3xl tracking-tighter leading-none", isLight ? "text-black" : "text-white")}>€{currentMetrics.tactical.atv}</span>
             </div>
           </div>
 
         </div>
       </div>

      {/* Micro Bar Chart */}
      <div className="absolute bottom-0 left-0 w-full h-[40%] z-0 pointer-events-none px-5 sm:px-8 pb-3">
        <MicroBarChart data={currentMetrics.timeline} isLight={isLight} timeRange={timeRange} selectedDate={selectedDate} />
      </div>
    </div>

   {/* Col 3: Tactical Stack (Donut Chart + Prepaid + Retail) */}
     <div className="flex flex-col gap-6">
       {/* 1. Payment Breakdown */}
       <div className={cn(
          "rounded-2xl p-4 sm:p-6 flex flex-col relative border",
          isLight ? "bg-transparent border-black/10 shadow-[0_2px_10px_rgba(0,0,0,0.05)]" : "bg-transparent border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
        )}>
          <div className="flex items-center justify-between mb-4">
            <span className={cn("text-[13px] uppercase tracking-widest flex items-center gap-2", isLight ? "text-black/50" : "text-white/50")}>
              <Wallet className="w-3.5 h-3.5" />
              支付类型
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
                { label: '微信', value: currentMetrics.wechat, color: '#07C160' },
                { label: '支付宝', value: currentMetrics.alipay, color: '#1677FF' },
                { label: '银行卡', value: currentMetrics.bankCard, color: '#60A5FA' },
                { label: '现金', value: currentMetrics.cash, color: '#F59E0B' },
                { label: '会员卡', value: currentMetrics.memberCard, color: '#06B6D4' }
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
            "rounded-2xl p-4 sm:p-6 flex flex-col relative overflow-hidden group border",
         isLight ? "bg-transparent border-black/10 shadow-[0_2px_10px_rgba(0,0,0,0.05)]" : "bg-transparent border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
       )}>
         <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/10 rounded-br-full blur-2xl group-hover:bg-amber-500/20" />
         <div className="flex items-center justify-between mb-4 relative z-10">
           <span className="text-[13px] text-amber-500 uppercase tracking-widest flex items-center gap-2">
             <Wallet className="w-3.5 h-3.5" />
             新增充值
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
             <span className="text-[13px]  text-amber-500/70 uppercase tracking-widest">转化率</span>
             <span className="text-[13px]  text-amber-500">{currentMetrics.tactical.conversionRate}% <TrendingUp className="inline w-3 h-3 ml-1" /></span>
           </div>
         </div>
       </div>

       {/* 3. Retail ROI */}
        <div className={cn(
         "rounded-2xl p-4 sm:p-6 flex flex-col relative overflow-hidden group border",
         isLight ? "bg-transparent border-black/10 shadow-[0_2px_10px_rgba(0,0,0,0.05)]" : "bg-transparent border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
       )}>
         <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-br-full blur-2xl group-hover:bg-emerald-500/20" />
         <div className="flex items-center justify-between mb-4 relative z-10">
           <span className="text-[13px] text-emerald-500 uppercase tracking-widest flex items-center gap-2">
             <ShoppingBag className="w-3.5 h-3.5" />
             产品零售
           </span>
         </div>
         
         <div className="flex items-baseline gap-2 relative z-10 mb-4">
           <span className="text-4xl  tracking-tighter text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
             €{currentMetrics.tactical.retailRevenue.toLocaleString()}
           </span>
         </div>

         <div className="flex flex-col gap-1.5 relative z-10">
           <div className="flex justify-between text-[13px]  uppercase tracking-widest text-emerald-500/70">
             <span>占比</span>
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
    "rounded-2xl p-4 sm:p-6 flex flex-col relative overflow-hidden group border",
    isLight ? "bg-transparent border-black/10 shadow-[0_2px_10px_rgba(0,0,0,0.05)]" : "bg-transparent border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
  )}>
   <div className={cn(isLight ? "flex items-center justify-between border-b border-black/5 pb-4 mb-6" : "flex items-center justify-between border-b border-white/5 pb-4 mb-6")}>
     <h3 className={cn(isLight ? "text-sm tracking-widest text-black flex items-center gap-2 uppercase" : "text-sm tracking-widest text-white flex items-center gap-2 uppercase")}>
       <Users className="w-4 h-4 text-blue-500" />
       技师业绩
     </h3>
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
    "rounded-2xl p-4 sm:p-6 flex flex-col relative overflow-hidden group border",
    isLight ? "bg-transparent border-black/10 shadow-[0_2px_10px_rgba(0,0,0,0.05)]" : "bg-transparent border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
  )}>
   <div className={cn(isLight ? "flex items-center justify-between border-b border-black/5 pb-4 mb-6" : "flex items-center justify-between border-b border-white/5 pb-4 mb-6")}>
     <h3 className={cn(isLight ? "text-sm tracking-widest text-black flex items-center gap-2 uppercase" : "text-sm tracking-widest text-white flex items-center gap-2 uppercase")}>
       <Target className="w-4 h-4 text-amber-500" />
       爆款项目排行
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
 )}
 </div>
 </AnimatePresence>
 );
};
