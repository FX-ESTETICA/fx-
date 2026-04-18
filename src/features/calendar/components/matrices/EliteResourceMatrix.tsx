"use client";

import React, { useMemo, useRef, UIEvent, useEffect, useCallback } from "react";
import { cn } from "@/utils/cn";
import { motion, PanInfo, AnimatePresence } from "framer-motion";
import { IndustryType, IndustryDNA, MatrixResource } from "../../types";
import { EliteBookingBlock } from "./EliteBookingBlock";
import { OperatingHour, ShopOperatingConfig, resolveOperatingHours } from "../IndustryCalendar";
import { useVisualSettings, CYBER_COLOR_DICTIONARY } from "@/hooks/useVisualSettings";
 

import { BookingService } from "@/features/booking/api/booking";
import { BookingScheduler } from "@/features/booking/utils/scheduler";
import { useShop } from "@/features/shop/ShopContext";

export interface EliteResourceMatrixProps {
  industry: IndustryType;
  dna: IndustryDNA;
  resources: MatrixResource[];
  operatingHours: ShopOperatingConfig | OperatingHour[];
  currentDate?: Date; // 新增：接收父组件传来的当前日期
  bookings?: MatrixBooking[];
  onHorizontalScroll?: (scrollLeft: number) => void;
  onGridClick?: (resourceId?: string, time?: string, dateStr?: string) => void;
  onBookingClick?: (booking: MatrixBooking) => void; // 新增：点击预约块的回调
  onReadOnlyIntercept?: () => void; // 新增：只读模式拦截回调
  matrixScrollRef?: React.Ref<HTMLDivElement>;
  onDateSwipe?: (direction: 'prev' | 'next') => void; // 传递日期切换事件
  onPhantomDateChange?: (dateStr: string) => void; // 新增：幻象投影雷达回调
}

type MatrixService = {
  id: string;
  name: string;
  prices?: number[];
  duration?: number;
  assignedEmployeeId?: string | null;
};

export type MatrixBooking = {
  id: string;
  shopId?: string;
  date: string;
  startTime: string;
  duration: number;
  resourceId: string | null;
  customerId?: string;
  customerName?: string;
  serviceName?: string;
  originalUnassigned?: boolean;
  masterOrderId?: string;
  services?: MatrixService[];
  status?: string;
};

// 模拟数据：暂时清空以支持真实配置
// const MOCK_BOOKINGS: any[] = [];

// 【独立微组件】：量子时间线 (Quantum Timeline) & 静默视界引擎 (Idle Physics Engine)
// 独立挂载，绝对不引起外层矩阵重绘。包含 0 冲突物理级居中算法。
const CurrentTimeIndicator = React.memo(({ getYCoordinate, matrixRef }: { getYCoordinate: (dateStr: string, timeStr: string) => number, matrixRef?: React.RefObject<HTMLDivElement> }) => {
  const [now, setNow] = React.useState(new Date());
  const [isWarning, setIsWarning] = React.useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 每一分钟（60000ms）更新一次自己
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsWarning(false);
  }, []);

  const resetIdleTimer = useCallback(() => {
    stopAutoScroll();

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    // 27秒：潜意识预警 (时间线高频呼吸，暗示即将重置视界)
    warningTimerRef.current = setTimeout(() => {
      setIsWarning(true);
    }, 27000);

    // 30秒：触发流体弹簧引擎
    idleTimerRef.current = setTimeout(() => {
      setIsWarning(false); // 滚动时关闭预警

      const currentDate = new Date();
      const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
      const timeStr = `${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
      const y = getYCoordinate(dateStr, timeStr);

      const scrollContainer = matrixRef && typeof matrixRef !== 'function' ? matrixRef.current : null;

      if (y !== -1 && scrollContainer) {
        const containerHeight = scrollContainer.clientHeight;
        // 视界黄金分割法则：时间线锚定在屏幕上方 1/3 处，下方留给未来数据
        const targetScroll = Math.max(0, y - containerHeight / 3);
        const startScroll = scrollContainer.scrollTop;
        const distance = targetScroll - startScroll;
        
        if (Math.abs(distance) < 10) return; // 已经在黄金视界内，不打扰

        // 【极速效率模式】：1.5s 物理弹簧感 -> 0s 瞬间到位
        // 直接设置 scrollTop，移除 requestAnimationFrame 缓动逻辑
        scrollContainer.scrollTop = targetScroll;
      }
    }, 30000);
  }, [getYCoordinate, matrixRef, stopAutoScroll]);

  useEffect(() => {
    const handleInteraction = () => resetIdleTimer();
    
    // 全局物理静默侦测：拦截任何微小的用户意图，实现“瞬间熔断防抢夺”
    window.addEventListener('pointerdown', handleInteraction, { passive: true });
    window.addEventListener('wheel', handleInteraction, { passive: true });
    window.addEventListener('touchmove', handleInteraction, { passive: true });
    window.addEventListener('keydown', handleInteraction, { passive: true });
    
    resetIdleTimer();

    return () => {
      stopAutoScroll();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('wheel', handleInteraction);
      window.removeEventListener('touchmove', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [resetIdleTimer, stopAutoScroll]);

  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const topOffset = getYCoordinate(dateStr, timeStr);

  if (topOffset === -1) return null; // 如果当前时间不在渲染视界内，直接隐形

  return (
    <div 
      className="absolute left-0 right-0 z-30 pointer-events-none flex items-center transition-all duration-1000 ease-linear"
      style={{ top: topOffset, transform: 'translateY(-50%)' }}
    >
      {/* 红色流光脉冲导管 (Pulse Energy Stream) */}
      <div className={cn(
        "w-full h-[1px] transition-all duration-500",
        isWarning 
          ? "bg-gradient-to-r from-red-400 via-white to-transparent bg-[length:100%_auto] animate-[gradient_0.5s_linear_infinite] shadow-[0_0_15px_rgba(255,255,255,0.8)] opacity-100" 
          : "bg-gradient-to-r from-red-500 via-rose-400 to-transparent bg-[length:200%_auto] animate-[gradient_2s_linear_infinite] opacity-80"
      )} />
    </div>
  );
});

export const EliteResourceMatrix = React.memo(({ dna, resources, operatingHours, currentDate, bookings = [], onGridClick, onBookingClick, onReadOnlyIntercept, matrixScrollRef, onDateSwipe, onPhantomDateChange, isReadOnly }: EliteResourceMatrixProps & { storeStatus?: string; isReadOnly?: boolean }) => {
  const [isMounted, setIsMounted] = React.useState(false);
  const { refreshBookings, trackAction } = useShop();

  React.useEffect(() => setIsMounted(true), []);
  const currentHour = isMounted ? new Date().getHours() : -1;
  const { settings: visualSettings } = useVisualSettings();
  const matrixContainerRef = useRef<HTMLDivElement>(null);
  const timeColumnRef = useRef<HTMLDivElement>(null);
  const internalMatrixRef = useRef<HTMLDivElement>(null);
  const actualMatrixRef = matrixScrollRef || internalMatrixRef;
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startPointerRef = useRef<{ x: number; y: number } | null>(null);
  const pointerDownAtRef = useRef<number | null>(null);
  const containerRectRef = useRef<DOMRect | null>(null);

  // --- 拖拽与调度核心状态 ---
  const [draggedBooking, setDraggedBooking] = React.useState<MatrixBooking | null>(null);
  const [isHoveringVoid, setIsHoveringVoid] = React.useState(false);
  const [pendingVoidBooking, setPendingVoidBooking] = React.useState<MatrixBooking | null>(null);
  const voidRef = useRef<HTMLDivElement>(null);

  // --- 极致交互法则：多方剥离拆单状态引擎 ---
  const [implodedOrderId, setImplodedOrderId] = React.useState<string | null>(null);
  const [splitActiveEmployeeId, setSplitActiveEmployeeId] = React.useState<string | null>(null);
  // 改用映射表：记录每个子项目被分配给了哪个员工 { serviceId: targetEmployeeId }
  const [splitServiceAssignments, setSplitServiceAssignments] = React.useState<Record<string, string>>({});
  // 物理防抖锁：防止网络延迟时的多重点选
  const [processingOrderId, setProcessingOrderId] = React.useState<string | null>(null);

// --- 核心算法：时间切片瀑布流 (Cyber Time-Slice Waterfall) ---
  type WaterfallNode = {
    id: string;
    type: 'time'; // 彻底废弃 'divider'，所有节点均为等距的时间切片
    dateStr: string;
    hour: number;
    label: string;
    isOvertime?: boolean;
    isDayStart?: boolean; // 新增：标记是否为新一天的起跑线，用于挂载光刃
    height: number;
    top: number;
  };

  const waterfallData = useMemo(() => {
    // 【大道至简】：4天未来视界 (4-Day Future Horizon)
    // 彻底砍掉过去的 3 天，渲染 [今天, +1, +2, +3] 共 4 天
    // 物理起点 (scrollTop: 0) 天生就是今天的起始时间，0 JS 介入，绝对 0 闪烁
    const targetDates = Array.from({ length: 4 }, (_, i) => i).map(offset => {
      const d = new Date(currentDate || new Date());
      d.setDate(d.getDate() + offset);
      return d;
    });

    const nodes: WaterfallNode[] = [];
    const formatDateStr = (d: Date) => {
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let currentTop = 16; 

    targetDates.forEach(dateObj => {
      const dateStr = formatDateStr(dateObj);
      const activeHours = new Set<number>();
      
      const { hours: effectiveHours } = resolveOperatingHours(dateObj, operatingHours);

      // 1. 收集配置中的正常营业时间
      if (effectiveHours && effectiveHours.length > 0) {
        effectiveHours.forEach(period => {
          for (let h = period.start; h < period.end; h++) activeHours.add(h);
        });
      } else {
        // 降级保护
        for (let h = 9; h < 18; h++) activeHours.add(h);
      }

      // 2. 收集跨界订单强制撑开的时间
      bookings.forEach(booking => {
        if (booking.date === dateStr && booking.startTime && booking.duration) {
          const [startHour, startMin] = booking.startTime.split(':').map(Number);
          const totalMinutes = startMin + booking.duration;
          const spanHours = Math.floor((totalMinutes > 0 ? totalMinutes - 1 : 0) / 60);
          for (let i = 0; i <= spanHours; i++) {
            if (startHour + i < 24) activeHours.add(startHour + i);
          }
        }
      });

      if (activeHours.size > 0) {
        // 插入当天的有效营业时间
        const sortedHours = Array.from(activeHours).sort((a, b) => a - b);
        sortedHours.forEach((hour, index) => {
          nodes.push({
            id: `time-${dateStr}-${hour}`,
            type: 'time',
            dateStr: dateStr,
            hour: hour,
            label: `${hour.toString().padStart(2, '0')}:00`,
            isOvertime: !effectiveHours.some(p => hour >= p.start && hour < p.end),
            isDayStart: index === 0, // 每天的第一个有效营业小时被标记为光刃挂载点
            height: 80,
            top: currentTop
          });
          currentTop += 80; // 绝对的 80px 等距，没有任何多余的缝隙
        });
      }
    });

    return { nodes, totalHeight: currentTop };
  }, [operatingHours, bookings, currentDate]);

  const getYCoordinate = useCallback((dateStr: string, timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const node = waterfallData.nodes.find(n => n.type === 'time' && n.dateStr === dateStr && n.hour === h);
    if (node) {
      return node.top + (m / 60) * 80;
    }
    return -1; // 隐藏不在渲染区间内的订单
  }, [waterfallData.nodes]);

  const getBookingHeight = useCallback((dateStr: string, timeStr: string, duration: number) => {
    const startY = getYCoordinate(dateStr, timeStr);
    if (startY === -1) return 0;

    const [h, m] = timeStr.split(':').map(Number);
    const endTotalMins = h * 60 + m + duration;
    const endH = Math.floor(endTotalMins / 60);
    const endM = endTotalMins % 60;

    let endDateStr = dateStr;
    let finalEndH = endH;
    
    // 处理跨天计算
    if (endH >= 24) {
      const d = new Date(dateStr.replace(/-/g, '/'));
      d.setDate(d.getDate() + Math.floor(endH / 24));
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      endDateStr = `${year}-${month}-${day}`;
      finalEndH = endH % 24;
    }

    const endY = getYCoordinate(endDateStr, `${finalEndH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`);
    
    if (endY !== -1 && endY > startY) {
      return endY - startY;
    }
    // 如果结尾没找到（比如结束时间在未渲染的日子里），降级为按原始时长计算
    return (duration / 60) * 80;
  }, [getYCoordinate]);

  const [crosshair, _setCrosshair] = React.useState<{ active: boolean, y: number, time: string, resourceId: string | null, dateStr: string }>({
    active: false,
    y: 0,
    time: '00:00',
    resourceId: null,
    dateStr: ''
  });

  const calculateCrosshair = (clientY: number, clientX: number, rect: DOMRect) => {
    // 移除导致多重滚动的 + scrollY，clientY - rect.top 已经正确计算了相对于容器的内容偏移量
    let absY = clientY - rect.top;
    
    // 【The Data-Layer Shift Paradigm】：十字准星顶部磁吸拦截 (终极防御)
    // 拦截因平板端极速点击时减去 scrollTop 或 padding 导致的越界甚至负坐标
    if (waterfallData.nodes.length > 0 && absY < waterfallData.nodes[0].top) {
      absY = waterfallData.nodes[0].top;
    } 
    // 绝对兜底防御
    if (absY < 0) {
      absY = 0;
    }
    
    // 找到当前 Y 所在的节点
    let targetNode = [...waterfallData.nodes].reverse().find(n => absY >= n.top);
    if (!targetNode) targetNode = waterfallData.nodes[0];
    
    let exactY = targetNode.top;
    let timeStr = '00:00';
    
    if (targetNode.type === 'time') {
      // ⚠️ 终极防御结界：强制确保偏移量永远大于等于 0，绝不产生负数导致的越界时间！
      const offsetYInRow = Math.max(0, absY - targetNode.top);
      
      let finalMin = Math.round((offsetYInRow / 80) * 60 / 15) * 15;
      let finalHour = targetNode.hour!;
      
      if (finalMin === 60) {
        const nextNode = waterfallData.nodes.find(n => n.type === 'time' && n.dateStr === targetNode!.dateStr && n.hour === finalHour + 1);
        if (nextNode) {
          targetNode = nextNode;
          finalHour = nextNode.hour!;
          finalMin = 0;
        } else {
          // 修复 18:00 黑洞：允许生成下一小时的 00 分，而不是降级为 45 分
          finalHour = finalHour + 1;
          finalMin = 0;
        }
      }
      exactY = targetNode.top + (finalMin / 60) * 80;
      timeStr = `${finalHour.toString().padStart(2, '0')}:${finalMin.toString().padStart(2, '0')}`;
    }
    
    // X 计算不变
    const x = clientX - rect.left;
    const colWidth = rect.width / resources.length;
    const colIdx = Math.min(Math.max(0, Math.floor(x / colWidth)), resources.length - 1);
    const resourceId = resources[colIdx].id;
    
    return { exactY, timeStr, resourceId, dateStr: targetNode.dateStr };
  };

  const activateCrosshair = (clientY: number, clientX: number) => {
    const rect = containerRectRef.current;
    if (!rect) return;
    const { exactY, timeStr, resourceId, dateStr } = calculateCrosshair(clientY, clientX, rect);
    _setCrosshair({ active: true, y: exactY, time: timeStr, resourceId, dateStr });
    if (typeof navigator !== 'undefined') {
      const nav = navigator as unknown as { vibrate?: (pattern: number | number[]) => boolean };
      try { nav.vibrate?.(20); } catch {}
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // 允许穿透：只有当点击在已有的预约色块内部时才拦截，点击空白背景直接放行！
    const target = e.target as HTMLElement;
    // 【关键修复】：如果点击的是卡片内部 (包含 implosion-container) 或右键菜单，就拦截
    // 注意不要拦截整个日历画布的 pointer-events-auto
    if (target.closest('.implosion-container') || target.closest('[id^="booking-block-"]')) {
      return; 
    }
    
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    pointerDownAtRef.current = Date.now();
    
    // 【关键修复】：获取元素的真实物理位置时，必须考虑容器本身的 scrollTop
    // ClientY 是相对于屏幕视口的，但我们的日历画布是在一个可滚动的 div 内部
    // 所以在计算十字准星坐标时，必须把滚动偏移量加回来！
    const container = matrixContainerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      containerRectRef.current = {
        top: rect.top - container.scrollTop, // 将容器的 scrollTop 抵消掉，获得绝对顶部的虚拟坐标
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right,
        x: rect.x,
        y: rect.y
      } as DOMRect;
    }
    
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    
    // 【修改点二】：将长按阈值从 300ms 提高到 450ms，彻底剥离单点和长按的界限
    longPressTimerRef.current = setTimeout(() => {
      activateCrosshair(e.clientY, e.clientX);
    }, 450);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const start = startPointerRef.current;
    if (!start) return;
    
    // 只允许单指操作，避免多指缩放误触 (兼容 isPrimary 未定义的旧设备)
    if (e.isPrimary === false) return;

    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);
    
    // 在准星尚未激活时，如果发生了超过 10px 的物理位移，说明用户意图是“滚动屏幕”
    if (!crosshair.active && (dx > 10 || dy > 10)) {
      // 立刻取消长按定时器，释放滚动权
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      return;
    }
    
    if (crosshair.active) {
      const rect = containerRectRef.current;
      if (!rect) return;
      const { exactY, timeStr, resourceId, dateStr } = calculateCrosshair(e.clientY, e.clientX, rect);
      _setCrosshair({ active: true, y: exactY, time: timeStr, resourceId, dateStr });
    }
  };

  // 【核心修改点三】：引入底层 DOM 拦截器，一旦准星激活，绝对禁止页面滚动！
  useEffect(() => {
    const container = matrixContainerRef.current;
    if (!container) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (crosshair.active) {
        // 如果准星处于激活状态，强行阻止浏览器默认的滚动行为
        // { passive: false } 是必须的，否则 preventDefault() 无效
        e.preventDefault();
      }
    };

    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [crosshair.active]);

  const handlePointerUp = (e: React.PointerEvent) => {
    const start = startPointerRef.current;
    const downAt = pointerDownAtRef.current;
    
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (crosshair.active) {
      const { resourceId, time, dateStr } = crosshair;
      _setCrosshair({ active: false, y: 0, time: '00:00', resourceId: null, dateStr: '' });
      if (onGridClick) onGridClick(resourceId || undefined, time, dateStr);
      startPointerRef.current = null;
      pointerDownAtRef.current = null;
      return;
    }
    
    if (start && downAt) {
      const dt = Date.now() - downAt;
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      
      // 点击判定：时间极短且没有发生大幅度滑动
      if (dt <= 500 && dx <= 15 && dy <= 15) {
        const container = matrixContainerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          // 在获取网格点击坐标时，同样必须补偿 scrollTop，否则点击页面下方时算出的坐标全是错的
          const virtualRect = {
            ...rect,
            top: rect.top - container.scrollTop,
            left: rect.left,
            width: rect.width
          } as DOMRect;
          
          const { timeStr, resourceId, dateStr } = calculateCrosshair(e.clientY, e.clientX, virtualRect);
          
          // 获取当前店铺真实状态 (考虑多端同步情况，从 Context 提取到的最新 status)
          // 注意：storeStatus='closed_today' 仅仅只是打个标签，底层真正起决定性作用的应该是 config.hours 的长度或 todayOverride.isClosed。
          // 但由于我们现在有了全局状态，我们可以直接通过判断今天是不是被 closed 拦截。
          // 之前的 bug 在于：storeStatus === 'closed_today' 时，如果 isToday 为 true 就被锁死了。
          // 可是如果老板想要在“关门”期间，依然允许店长在后台排单（给明天排、或者给今天强制排），那么严格的物理锁死会导致无法操作。
          // 【根据关门特权排单法则】：即使关门了，作为管理员也应该能创建特权预约。所以这里我们彻底废除物理门禁的拦截。
          const isLocked = false; 
          
          if (!isLocked && onGridClick) {
            onGridClick(resourceId || undefined, timeStr, dateStr);
          }
        }
      }
    }
    
    startPointerRef.current = null;
    pointerDownAtRef.current = null;
  };

  const handlePointerCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    _setCrosshair({ active: false, y: 0, time: '00:00', resourceId: null, dateStr: '' });
    startPointerRef.current = null;
    pointerDownAtRef.current = null;
  };

  // 用于防抖的幻象投影日期缓存
  const currentPhantomDateRef = useRef<string | null>(null);
  const scrollRafRef = useRef<number | null>(null);

  const handleMatrixScroll = (e: UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    
    // 使用 requestAnimationFrame 进行节流，防止疯狂触发 DOM 更新导致卡顿
    if (scrollRafRef.current) return;

    scrollRafRef.current = requestAnimationFrame(() => {
      // 垂直同步时间轴
      if (timeColumnRef.current) {
        timeColumnRef.current.scrollTop = scrollTop;
      }
      
      // --- 滚动雷达侦测 (Scroll Spy Phantom Radar) ---
      if (onPhantomDateChange && waterfallData.nodes.length > 0) {
        // 找到当前滚动视口顶部所属的日期节点
        let activeNode = [...waterfallData.nodes].reverse().find(n => n.top <= scrollTop);
        if (!activeNode) activeNode = waterfallData.nodes[0];
        
        if (activeNode.dateStr !== currentPhantomDateRef.current) {
          currentPhantomDateRef.current = activeNode.dateStr;
          onPhantomDateChange(activeNode.dateStr);
        }
      }
      scrollRafRef.current = null;
    });
  };

  // 矩阵区的手势接管：滑动切换日期
  const handleMatrixPanEnd = (_e: unknown, info: PanInfo) => {
    // 【终极降噪装甲】：如果有卡片正在被拖拽，矩阵强行装死，绝对无视任何滑动指令！
    if (draggedBooking !== null) return;

    // 防止纵向滚动误触横向翻页
    if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) return;

    // 提高翻页触发门槛，从 50 提升到 80，过滤微小手颤
    const swipeThreshold = 80;
    if (info.offset.x < -swipeThreshold) {
      onDateSwipe?.('next');
    } else if (info.offset.x > swipeThreshold) {
      onDateSwipe?.('prev');
    }
  };

  // Close implosion on click outside
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // If clicking outside the imploded area, close it
      if (implodedOrderId && !(e.target as HTMLElement).closest('.implosion-container')) {
        setImplodedOrderId(null);
        setSplitActiveEmployeeId(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [implodedOrderId]);

  const checkVoidHover = (clientY: number, clientX: number) => {
    if (!voidRef.current) return false;
    const rect = voidRef.current.getBoundingClientRect();
    // 扩大判定区
    return (
      clientY >= rect.top - 50 &&
      clientY <= rect.bottom + 50 &&
      clientX >= rect.left - 50 &&
      clientX <= rect.right + 50
    );
  };

  const handleBookingDragStart = (booking: MatrixBooking) => {
    if (isReadOnly) {
      if (onReadOnlyIntercept) onReadOnlyIntercept();
      return;
    }
    setDraggedBooking(booking);
    setPendingVoidBooking(null); // 取消之前的悬停状态
  };

  const handleBookingDrag = (_e: any, info: PanInfo) => {
    const isHovering = checkVoidHover(info.point.y, info.point.x);
    if (isHovering !== isHoveringVoid) {
      setIsHoveringVoid(isHovering);
    }
  };

  const handleBookingDragEnd = async (_e: any, info: PanInfo, booking: MatrixBooking) => {
    setDraggedBooking(null);
    setIsHoveringVoid(false);

    if (checkVoidHover(info.point.y, info.point.x)) {
      const siblings = booking.masterOrderId 
        ? bookings.filter(b => b.masterOrderId === booking.masterOrderId && b.id !== booking.id) 
        : [];
        
      if (siblings.length > 0) {
        // 连单：进入悬停待确认分裂状态
        setPendingVoidBooking(booking);
      } else {
        // 单卡：直接瞬间处决
        try {
          await BookingService.deleteBookings([booking.id]);
          refreshBookings();
          trackAction();
        } catch (error) {
          console.error("Failed to destroy single booking:", error);
        }
      }
    }
  };

  const destroyCurrent = async () => {
    if (!pendingVoidBooking) return;
    try {
      await BookingService.deleteBookings([pendingVoidBooking.id]);
      refreshBookings();
      trackAction();
    } catch (error) {
      console.error("Failed to destroy booking:", error);
    } finally {
      setPendingVoidBooking(null);
    }
  };

  const destroyAll = async () => {
    if (!pendingVoidBooking) return;
    const masterOrderId = pendingVoidBooking.masterOrderId;
    const idsToDelete = masterOrderId 
      ? bookings.filter(b => b.masterOrderId === masterOrderId).map(b => b.id)
      : [pendingVoidBooking.id];
      
    try {
      await BookingService.deleteBookings(idsToDelete);
      refreshBookings();
      trackAction();
    } catch (error) {
      console.error("Failed to destroy all bookings:", error);
    } finally {
      setPendingVoidBooking(null);
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-transparent relative">
      {/* 纵向时间轴固定列 (带流动发光) */}
      <div className="w-[60px] md:w-20 flex flex-col relative shrink-0">
        <div 
          ref={timeColumnRef}
          className="flex-1 overflow-hidden relative pointer-events-none"
        >
          <div className="relative w-full" style={{ height: waterfallData.totalHeight }}>
            {waterfallData.nodes.map((node) => {
              return (
                <div key={node.id} className="absolute w-full group" style={{ top: node.top, height: node.height }}>
                  <div className={cn(
                    "absolute top-0 left-2.5 -translate-y-1/2 transition-all duration-500 text-[13px] leading-none mix-blend-screen flex items-center justify-center font-normal tracking-normal tabular-nums z-10",
                    node.hour === currentHour && "scale-110 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] [text-shadow:0_0_15px_rgba(0,240,255,0.6)]",
                    node.hour !== currentHour && "hover:scale-110"
                  )} style={node.hour !== currentHour ? { textShadow: `0 0 15px ${CYBER_COLOR_DICTIONARY[visualSettings.timelineColorTheme].hex}80` } : {}}>
                    <span className={cn(node.hour === currentHour ? "bg-gradient-to-br from-white via-gx-cyan to-white bg-[length:200%_auto] animate-[gradient_2s_linear_infinite] bg-clip-text text-transparent" : CYBER_COLOR_DICTIONARY[visualSettings.timelineColorTheme].className)}>
                      {node.hour!.toString().padStart(2, '0')}
                    </span>
                    <span className={cn(
                      "text-[10px] mx-[3px] animate-pulse", 
                      node.hour === currentHour ? "text-gx-cyan opacity-40" : "text-white/30"
                    )}>:</span>
                    <span className={cn("opacity-80", node.hour === currentHour ? "bg-gradient-to-br from-white via-gx-cyan to-white bg-[length:200%_auto] animate-[gradient_2s_linear_infinite] bg-clip-text text-transparent" : CYBER_COLOR_DICTIONARY[visualSettings.timelineColorTheme].className)}>
                      00
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 横向专家音轨矩阵 */}
      <motion.div 
        ref={actualMatrixRef as React.RefObject<HTMLDivElement>}
        onScroll={handleMatrixScroll}
        onPanEnd={handleMatrixPanEnd}
        className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth relative no-scrollbar touch-pan-y"
      >
        <div className="min-w-fit flex flex-col h-full w-full">
          <div 
            ref={matrixContainerRef}
            className={cn("relative w-full cursor-crosshair select-none", crosshair.active ? "touch-none" : "")}
            style={{ height: waterfallData.totalHeight, WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            {crosshair.active && (
              <div 
                className="absolute left-0 right-0 z-50 pointer-events-none flex items-center"
                style={{ top: crosshair.y, transform: 'translateY(-50%)' }}
              >
                {/* 时间胶囊 HUD */}
                <div className="absolute left-4 bg-gx-cyan text-black text-[10px] font-black font-mono px-2 py-0.5 rounded shadow-[0_0_15px_rgba(0,240,255,0.8)] z-10">
                  {crosshair.time}
                </div>
                {/* 激光线 */}
                <div className="w-full h-[1px] bg-gx-cyan shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
              </div>
            )}

            {/* 【独立微组件挂载】：量子当前时间线 & 静默视界引擎 */}
            <CurrentTimeIndicator getYCoordinate={getYCoordinate} matrixRef={actualMatrixRef as any} />

            {/* 渲染背景与分隔 (剥离横向网格线，仅保留跨天光刃与纵向列分隔) */}
            {waterfallData.nodes.map((node, idx) => {
              return (
                <div key={`bg-${node.id}`} className="absolute w-full z-0" style={{ top: node.top, height: node.height }}>
                  {/* 赛博光刃 (挂载在新一天首个节点的顶部边框，即 0 刻度) */}
                  {node.isDayStart && idx > 0 && (
                    <div className="absolute top-0 left-0 w-full h-[2px] -translate-y-[1px] bg-gradient-to-r from-transparent via-gx-cyan/50 to-transparent shadow-[0_0_15px_rgba(0,240,255,0.6)] z-20" />
                  )}
                  {/* 【第四步改造】：直接物理隐藏非营业时间的灰色遮罩，让时间轴只显示有效开店时间 */}
                  {/* 原本的 bg-stripes 被物理删除了，保持极致干净 */}
                </div>
              );
            })}
            
            {/* 【物理级幽灵锁块】：渲染关门或休假的不可点击区域 */}
            {waterfallData.nodes.filter(n => n.isDayStart).map(dayNode => {
              // 判断这天是否被锁定
              // 【完美终极法则】：放弃依赖全局 storeStatus，直接根据当前日期在时间轴引擎里的高度计算！
              // 如果这天没有任何营业时间，它的 dayHeight 会接近 0，或者 nextDayNode 会紧贴着它。
              // 更精确的做法：利用外部传进来的 operatingHours，针对 dayNode.dateStr 再次调用 resolveOperatingHours
              const parts = dayNode.dateStr.split('-');
              if (parts.length !== 3) return null;
              
              const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
              const { isClosed } = resolveOperatingHours(d, operatingHours);
              
              if (!isClosed) return null;

              // 计算这一天的总高度 (从这天开始，到下一天开始前)
              const nextDayNode = waterfallData.nodes.find(n => n.isDayStart && n.top > dayNode.top);
              const dayHeight = nextDayNode ? nextDayNode.top - dayNode.top : waterfallData.totalHeight - dayNode.top;

              return (
                <div 
                  key={`locked-${dayNode.dateStr}`}
                  className="absolute left-0 right-0 z-40 flex flex-col items-center justify-center pointer-events-auto backdrop-blur-md"
                  style={{ top: dayNode.top, height: dayHeight }}
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onPointerDown={(e) => { e.stopPropagation(); }}
                >
                  <div className="absolute inset-0 bg-red-500/10 pointer-events-none" />
                  <div className="p-8 rounded-2xl border bg-red-500/10 border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)] text-center relative z-10">
                    <h2 className="text-2xl font-black tracking-widest mb-2 text-red-500">
                      {dayNode.dateStr === new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') ? "今日关门" : "休息 CLOSED"}
                    </h2>
                    <p className="text-red-400/80 font-mono text-sm">
                      暂停营业与一切排班预约操作
                    </p>
                  </div>
                </div>
              );
            })}

            {/* 渲染资源列与卡片 (The Cyber Matrix Data Layer) */}
            <div className="absolute inset-0 flex pl-[0px] pb-20 pointer-events-none">
              {resources.map((resource) => {
                const colBookings = bookings.filter(b => {
                  // 【NEXUS 终极法则】：只捕获前端 AI 生成的待确认订单 (PENDING)
                  if (resource.id === 'NEXUS') {
                    return b.status === 'PENDING';
                  }
                  
                  // 如果是爽约列 (NO)，捕获 resourceId 为 NO 的订单
                  if (resource.id === 'NO') {
                    return b.resourceId === 'NO';
                  }

                  // 正常实体员工列：必须严格匹配 resourceId
                  return b.resourceId === resource.id;
                });
                
                return (
                  <div key={resource.id} className="flex-1 relative min-w-0 pointer-events-none" style={{ zIndex: colBookings.some(b => implodedOrderId === (b.masterOrderId || b.id)) ? 50 : 1 }}>
                    {colBookings.map(booking => {
                      if (!booking.startTime || !booking.duration || !booking.date) return null;
                      
                      // 动态编号降维处理函数
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const formatMinimalId = (idStr: string) => {
                        if (!idStr) return 'Unknown';
                        if (idStr.startsWith("CO") || idStr.startsWith("NO")) {
                          const prefix = idStr.substring(0, 2);
                          const numStr = idStr.substring(2).trim();
                          const num = parseInt(numStr, 10);
                          if (isNaN(num)) return idStr;
                          if (num < 1000) return `${prefix} ${num.toString().padStart(3, '0')}`;
                          return `${prefix} ${num.toString()}`;
                        }
                        const vipMatch = idStr.match(/^(GV|AD|AN|UM)\s*(\d+)$/);
                        if (vipMatch) return vipMatch[2];
                        return idStr;
                      };

                      const topOffset = getYCoordinate(booking.date, booking.startTime);
                      const heightPx = getBookingHeight(booking.date, booking.startTime, booking.duration);
                      
                      // 如果订单在当前视界（这三天）内不可见，则不渲染
                      if (topOffset === -1 || heightPx === 0) return null;

                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const isTiny = booking.duration <= 45;
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const serviceTitle = booking.serviceName || '';
                      const isUnassigned = booking.originalUnassigned === true;
                      const isPending = booking.status === 'PENDING'; // 检查是否是待确认预约
                      
                      // --- 生命周期的视觉降维法则 ---
                      // 1. 动态获取系统当前时间，用于比对预约是否过期
                      const now = new Date();
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      let isPast = false;
                      if (booking.startTime && booking.date) {
                        const [hourStr, minStr] = booking.startTime.split(':');
                        const bookingStart = new Date(booking.date);
                        bookingStart.setHours(parseInt(hourStr, 10), parseInt(minStr, 10), 0, 0);
                        // 服务时间完全结束 (EndTime < Now)
                        const durationMs = booking.duration * 60000;
                        const thresholdTime = new Date(bookingStart.getTime() + durationMs);
                        isPast = now >= thresholdTime;
                      }

                      // 2. 判定是否已结账/结束 (彻底隐身)
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const isCheckedOut = booking.status?.toUpperCase() === 'COMPLETED' || booking.status?.toUpperCase() === 'CHECKED_OUT';

                      // 3. 判定是否为爽约 (降维打击：幽灵灰，彻底熄灭)
                      const isNoShow = resource.id === 'NO' || booking.status?.toUpperCase() === 'NO_SHOW';

                      // 恢复您的设计：未指定的散单保留青色，作为店长灵活调度的视觉锚点
                      const blockColor = isUnassigned ? '#00f0ff' : (resource.id === 'NO' ? '#ef4444' : (resource.themeColor || dna.themeColor));
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const blockAccent = isUnassigned ? 'cyan' : (resource.id === 'NO' ? 'red' : dna.accent);

                      // --- 快捷调度内爆形变与极速拆单法则 ---
                      
                      // 2. 右键内爆处理函数
                      const handleContextMenu = (e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();

                        // 0. 只读模式物理拦截
                        if (isReadOnly && onReadOnlyIntercept) {
                          onReadOnlyIntercept();
                          return;
                        }

                        // 1. 如果有别的卡片正在拖拽/删除中，或者系统处于硬加载态，锁死右键。
                        if (draggedBooking || pendingVoidBooking || processingOrderId === booking.id) return;
                        
                        // 2. 引爆当前靶向订单 (绝对原子化：永远只引爆自己，绝不跨列牵连兄弟)
                        setImplodedOrderId(booking.id);
                        setSplitActiveEmployeeId(null);
                        setSplitServiceAssignments({}); // 每次重开右键菜单时，清空多方分配映射
                      };

                      // 当前卡片是否被引爆了？
                      const isImploded = implodedOrderId === booking.id;
                      
                      // 3. 捞取所有需要参与这次操作的兄弟卡片
                      // 绝对原子化：只有它自己参与。不再通过 masterOrderId 去跨列捞取连单。
                      
                      // 4. 判定是否开启“三分天下”的派单模式
                      // 绝对原子化：判定基准是当前卡片内部包裹了几个子项目 (services.length > 1)
                      // （目前你的卡片在矩阵里都是 1 个项目的切片，如果是这样，isSplitMode 就永远是 false，
                      // 也就永远只走“一键换人”单列菜单，彻底消灭了图 3 那种复杂的项目列表层级）
                      const isSplitMode = booking.services && booking.services.length > 1;

                      // 5. 确保附加菜单在这次引爆行动中，只渲染一次
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const isFirstImploded = isImploded;

                      // 6. 物理切割：动态计算宽度和位置（0 遮挡）
                      let blockClass = "left-1 right-1";
                      if (isImploded) {
                        blockClass = isSplitMode ? "left-[66.6%] w-[33.3%]" : "left-[50%] w-[50%]";
                      }
                      
                      // 7. 预览颜色注入 (Cyber Glow Resonance)
                      // 【新交互法则】：大卡片保持原色，不随选定的员工发生形变和变色
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      let finalBlockColor = blockColor;
                      
                      const isProcessing = processingOrderId === booking.id;

                      return (
                        <div 
                          key={booking.id} 
                          id={`booking-block-${booking.id}`} // 【世界级靶向雷达】：植入 DOM ID 信标，供外层一键穿梭寻迹
                          className={cn(
                            "absolute pointer-events-auto implosion-container transition-all duration-300",
                            blockClass,
                            isProcessing ? "animate-pulse" : ""
                          )}
                          style={{
                            top: topOffset,
                            height: Math.max(40, heightPx - 4),
                            zIndex: draggedBooking?.id === booking.id ? 100 : (isImploded ? 50 : (isPending ? 30 : 20)),
                            // 软删除待确认状态或处理中的视觉反馈
                            opacity: (pendingVoidBooking?.id === booking.id || isProcessing) ? 0.3 : 1,
                            pointerEvents: (pendingVoidBooking?.id === booking.id || isProcessing) ? 'none' : 'auto'
                          }}
                          onContextMenu={handleContextMenu}
                        >
                          <EliteBookingBlock 
                            isReadOnly={isReadOnly}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isProcessing) return; // 物理级拦截多余点击
                              
                              if (isImploded) {
                                // 如果正在拆单
                                const assignedServicesCount = Object.keys(splitServiceAssignments).length;
                                if (isSplitMode && assignedServicesCount > 0) {
                                  // 批量深层剥离拆单 (基于最新的多方映射状态)
                                  setProcessingOrderId(booking.id); // 锁死
                                  BookingService.splitBookingServices(booking.id, splitServiceAssignments)
                                    .then(async () => {
                                      // 核心修复：移除 null 限制，无论指派给谁都强制全局唤醒智能排盘大脑
                                      await BookingScheduler.reflowDayBookings(booking.date, booking.shopId || 'default', resources);
                                      setImplodedOrderId(null);
                                      setSplitServiceAssignments({});
                                      refreshBookings();
                                      trackAction();
                                    })
                                    .catch(err => console.error("Batch split failed:", err))
                                    .finally(() => setProcessingOrderId(null)); // 释放锁
                                } else if (!isSplitMode && splitActiveEmployeeId) {
                                  // 单个项目的卡片直接整个换人
                                  const targetId = splitActiveEmployeeId === 'UNASSIGNED_POOL' ? null : splitActiveEmployeeId;
                                  setProcessingOrderId(booking.id); // 锁死
                                  BookingService.updateBookingResource(booking.id, targetId)
                                    .then(async () => {
                                      // 核心修复：移除 null 限制，无论指派给谁都强制全局唤醒智能排盘大脑
                                      // 注入 manualOverrides 避免由于视图同步延迟读到旧数据
                                      const isAssignedToPerson = targetId !== null && targetId !== 'UNASSIGNED_POOL';
                                      await BookingScheduler.reflowDayBookings(booking.date, booking.shopId || 'default', resources, {
                                        [booking.id]: {
                                          resourceId: targetId,
                                          originalUnassigned: !isAssignedToPerson
                                        }
                                      });
                                      setImplodedOrderId(null);
                                      setSplitServiceAssignments({});
                                      refreshBookings();
                                      trackAction();
                                    })
                                    .catch(err => console.error("Update resource failed:", err))
                                    .finally(() => setProcessingOrderId(null)); // 释放锁
                                }
                                return;
                              }
                              if (onBookingClick) onBookingClick(booking);
                            }}
                            onDragStart={() => handleBookingDragStart(booking)}
                            onDrag={(e, info) => handleBookingDrag(e, info)}
                            onDragEnd={(e, info) => handleBookingDragEnd(e, info, booking)}
                            title={serviceTitle}
                            time={`${booking.startTime} (${booking.duration}m)`}
                            client={formatMinimalId((booking.customerId || booking.customerName) || "")}
                            color={finalBlockColor}
                            accent={blockAccent as "cyan" | "purple" | "emerald" | "amber" | "red"}
                            height="100%" 
                            isTiny={isTiny}
                            isPending={isPending} // 传递待确认标识，触发跑马灯
                            isPast={isPast} // 跨过红线
                            isCheckedOut={isCheckedOut} // 已结账
                            isNoShow={isNoShow} // 爽约幽灵降维
                          />

                          {/* 渲染内爆菜单 (微缩派单器，只在第一个子订单处渲染) */}
                          {isFirstImploded && (
                            <div 
                              className={cn(
                                "absolute z-[60] flex flex-row gap-1 pointer-events-auto h-[240px] shadow-2xl",
                                isSplitMode ? "-left-[200%] w-[200%]" : "-left-[100%] w-[100%]"
                              )}
                              style={{
                                top: 0,
                              }}
                            >
                              {/* 员工列表 (左侧 33.3% 或 50%) */}
                              <div className={cn(
                                "h-full bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-2xl flex flex-col gap-1 overflow-y-auto no-scrollbar",
                                isSplitMode ? "w-1/2" : "w-full"
                              )}>
                                {/* 未指定选项 - 固定在最顶部 */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isSplitMode) {
                                        // 单项换人：退回未指定池 (null)
                                        BookingService.updateBookingResource(booking.id, null)
                                          .then(async () => {
                                            // 触发智能重排算法
                                            // 注入 manualOverrides 避免由于视图同步延迟读到旧数据
                                            await BookingScheduler.reflowDayBookings(booking.date, booking.shopId || 'default', resources, {
                                              [booking.id]: {
                                                resourceId: null,
                                                originalUnassigned: true
                                              }
                                            });
                                            setImplodedOrderId(null);
                                            refreshBookings();
                                            trackAction();
                                          });
                                    } else {
                                      // 多项拆单：激活“未指定”状态
                                      setSplitActiveEmployeeId('UNASSIGNED_POOL' === splitActiveEmployeeId ? null : 'UNASSIGNED_POOL');
                                    }
                                  }}
                                  className={cn(
                                    "text-center px-1 py-2 rounded-lg text-xs font-black tracking-widest transition-all shrink-0 border",
                                    splitActiveEmployeeId === 'UNASSIGNED_POOL'
                                      ? "scale-105"
                                      : "border-transparent hover:border-white/20"
                                  )}
                                  style={{ 
                                    color: '#00f0ff',
                                    backgroundColor: 'transparent',
                                    borderColor: splitActiveEmployeeId === 'UNASSIGNED_POOL' ? '#00f0ff' : 'transparent',
                                    boxShadow: splitActiveEmployeeId === 'UNASSIGNED_POOL' ? `0 0 10px #00f0ff80, inset 0 0 5px #00f0ff40` : 'none'
                                  }}
                                >
                                  <div>未指定</div>
                                </button>
                                
                                {/* 员工列表 */}
                                {resources.filter(r => r.id !== 'NEXUS' && r.id !== 'NO').map(res => (
                                  <button
                                    key={res.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isSplitMode) {
                                        // 单项换人：直接分配并关闭
                                        BookingService.updateBookingResource(booking.id, res.id)
                                          .then(async () => {
                                            // 强制全局唤醒智能排盘大脑，处理重叠
                                            await BookingScheduler.reflowDayBookings(booking.date, booking.shopId || 'default', resources, {
                                              [booking.id]: {
                                                resourceId: res.id,
                                                originalUnassigned: false
                                              }
                                            });
                                            setImplodedOrderId(null);
                                            refreshBookings();
                                            trackAction();
                                          });
                                      } else {
                                        // 多项拆单：激活该员工，等待点击项目
                                        setSplitActiveEmployeeId(res.id === splitActiveEmployeeId ? null : res.id);
                                      }
                                    }}
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      if (isSplitMode) {
                                        // 双击多项：整个订单直接换人（所有包裹的项目一起分配）
                                        BookingService.updateBookingResource(booking.id, res.id)
                                          .then(async () => {
                                            // 强制全局唤醒智能排盘大脑，处理重叠
                                            await BookingScheduler.reflowDayBookings(booking.date, booking.shopId || 'default', resources, {
                                              [booking.id]: {
                                                resourceId: res.id,
                                                originalUnassigned: false
                                              }
                                            });
                                            setImplodedOrderId(null);
                                            refreshBookings();
                                            trackAction();
                                          });
                                      }
                                    }}
                                    className={cn(
                                      "text-center px-1 py-2 rounded-lg text-xs font-black tracking-widest transition-all shrink-0 border",
                                      splitActiveEmployeeId === res.id 
                                        ? "scale-105" 
                                        : "border-transparent hover:border-white/20"
                                    )}
                                    style={{ 
                                      color: res.themeColor || dna.themeColor,
                                      backgroundColor: 'transparent',
                                      borderColor: splitActiveEmployeeId === res.id ? (res.themeColor || dna.themeColor) : 'transparent',
                                      boxShadow: splitActiveEmployeeId === res.id ? `0 0 10px ${res.themeColor || dna.themeColor}80, inset 0 0 5px ${res.themeColor || dna.themeColor}40` : 'none'
                                    }}
                                  >
                                    <div>{res.name}</div>
                                  </button>
                                ))}
                              </div>

                              {/* 项目列表 (仅多项拆单时显示，中间 33.3%) */}
                              {isSplitMode && booking.services && (
                                <div className="w-1/2 h-full bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-2xl flex flex-col gap-1 overflow-y-auto no-scrollbar">
                                  {booking.services.map((svc: any) => {
                                    // 确定该项目当前被分配给谁
                                    const assignedEmpId = splitServiceAssignments[svc.id];
                                    
                                    // 确定显示的基础颜色
                                    let itemColor = '#666';
                                    if (assignedEmpId) {
                                      if (assignedEmpId === 'UNASSIGNED_POOL') {
                                        itemColor = '#00f0ff';
                                      } else {
                                        const res = resources.find(r => r.id === assignedEmpId);
                                        if (res?.themeColor) itemColor = res.themeColor;
                                      }
                                    } else {
                                      // 如果还没被分配，显示原始订单颜色
                                      if (booking.originalUnassigned === true || !booking.resourceId || booking.resourceId === 'NEXUS') {
                                        itemColor = '#00f0ff'; // 未分配强制青色
                                      } else {
                                        const currentRes = resources.find(r => r.id === booking.resourceId);
                                        if (currentRes?.themeColor) itemColor = currentRes.themeColor;
                                      }
                                    }

                                    // 交互态：是否正准备被重新分配 (选中)
                                    // 在这种模式下，“选中”就是当前被点击改变了映射，
                                    // 为了视觉反馈，我们可以看它是否被分配了人，或者在 hover 时显示当前选中的画笔颜色
                                    const isAssigned = !!assignedEmpId;
                                    
                                    // 这里保留 previewColor 逻辑以防鼠标悬浮或点击时需要发光
                                    // 当前我们把被分配过（记录在字典里）的就视作选中并打上钩
                                    let isPreviewing = isAssigned;
                                    let previewColor = itemColor;
                                    
                                    return (
                                      <button
                                        key={svc.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (splitActiveEmployeeId) {
                                            // 真正的画笔逻辑：将该项目涂上当前激活的员工颜色
                                            setSplitServiceAssignments(prev => {
                                              const newAssignments = { ...prev };
                                              // 如果再次点击同样的员工，则取消分配（擦除）
                                              if (newAssignments[svc.id] === splitActiveEmployeeId) {
                                                delete newAssignments[svc.id];
                                              } else {
                                                newAssignments[svc.id] = splitActiveEmployeeId;
                                              }
                                              return newAssignments;
                                            });
                                          }
                                        }}
                                        className={cn(
                                          "text-left px-2 py-2 rounded-lg text-xs font-bold transition-all border shrink-0 relative",
                                          splitActiveEmployeeId ? "cursor-pointer" : "opacity-50 cursor-not-allowed",
                                          isAssigned ? "scale-[1.02]" : ""
                                        )}
                                        style={{ 
                                          backgroundColor: 'transparent', 
                                          borderColor: isPreviewing ? previewColor : itemColor, 
                                          boxShadow: isPreviewing 
                                            ? `0 0 10px ${previewColor}80, inset 0 0 5px ${previewColor}40` 
                                            : `0 0 5px ${itemColor}40`,
                                          color: isPreviewing ? previewColor : itemColor
                                        }}
                                      >
                                        {/* 被分配后的复选标记/印章 */}
                                        {isAssigned && (
                                          <div className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: previewColor, boxShadow: `0 0 8px ${previewColor}` }} />
                                        )}
                                        <div className="text-white truncate pr-3" title={svc.name || svc.serviceName}>{svc.name || svc.serviceName}</div>
                                        <div className="text-[9px] text-white/50">{svc.duration || 60}m</div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* --- 黑洞视界 (The Void) --- */}
      <AnimatePresence>
        {(draggedBooking || pendingVoidBooking) && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center pointer-events-auto"
          >
            <div 
              ref={voidRef}
              className={cn(
                "relative flex items-center justify-center rounded-full transition-all duration-300",
                isHoveringVoid ? "w-32 h-32" : "w-24 h-24",
                pendingVoidBooking ? "w-[300px] h-32" : ""
              )}
            >
              {/* 黑洞引力场 */}
              <div className={cn(
                "absolute inset-0 rounded-full bg-red-600/10 blur-xl transition-all duration-300 pointer-events-none",
                isHoveringVoid ? "bg-red-500/40 blur-2xl scale-125" : "",
                pendingVoidBooking ? "bg-red-600/30 blur-3xl animate-pulse" : "animate-pulse"
              )} />
              
              {/* 黑洞实体 / 分裂核心 */}
              {pendingVoidBooking ? (
                <div className="relative z-10 flex items-center gap-6">
                  {/* 销毁当前 (局部) */}
                  <button 
                    onClick={destroyCurrent}
                    className="w-32 h-32 rounded-full border-2 border-gx-cyan/50 bg-black/90 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.4)] hover:bg-gx-cyan/20 hover:scale-105 transition-all"
                  >
                    <span className="text-gx-cyan text-sm font-black tracking-widest drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]">销毁当前</span>
                    <span className="text-white/40 text-[9px] uppercase tracking-widest mt-1">Single</span>
                  </button>
                  
                  {/* 摧毁全部 (级联) */}
                  <button 
                    onClick={destroyAll}
                    className="w-32 h-32 rounded-full border-2 border-red-500/50 bg-black/90 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.6)] hover:bg-red-500/30 hover:scale-105 transition-all"
                  >
                    <span className="text-red-400 text-sm font-black tracking-widest drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">摧毁全部</span>
                    <span className="text-white/40 text-[9px] uppercase tracking-widest mt-1">All Linked</span>
                  </button>
                </div>
              ) : (
                <div 
                  className={cn(
                    "relative z-10 rounded-full border flex flex-col items-center justify-center text-center overflow-hidden transition-all pointer-events-none",
                    isHoveringVoid ? "w-20 h-20 border-red-400 bg-black/90 shadow-[0_0_50px_rgba(239,68,68,0.8)]" : "w-16 h-16 border-red-500/30 bg-black/60"
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
