"use client";

import React, { useMemo, useRef, UIEvent, useEffect, useCallback } from "react";
import { cn } from "@/utils/cn";
import { motion, PanInfo, AnimatePresence } from "framer-motion";
import { IndustryType, IndustryDNA, MatrixResource } from "../../types";
import { EliteBookingBlock } from "./EliteBookingBlock";
import { OperatingHour } from "../IndustryCalendar";
import { useVisualSettings, CYBER_COLOR_DICTIONARY } from "@/hooks/useVisualSettings";
 

import { BookingService } from "@/features/booking/api/booking";

export interface EliteResourceMatrixProps {
  industry: IndustryType;
  dna: IndustryDNA;
  resources: MatrixResource[];
  operatingHours: OperatingHour[];
  currentDate?: Date; // 新增：接收父组件传来的当前日期
  bookings?: MatrixBooking[];
  onHorizontalScroll?: (scrollLeft: number) => void;
  onGridClick?: (resourceId?: string, time?: string, dateStr?: string) => void;
  onBookingClick?: (booking: MatrixBooking) => void; // 新增：点击预约块的回调
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

        const duration = 1500; // 1.5s 物理弹簧感
        const startTime = performance.now();

        // 阻尼缓动函数 (Expo Ease Out)，前段加速，后段极其顺滑
        const easeOutExpo = (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

        const step = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = easeOutExpo(progress);

          scrollContainer.scrollTop = startScroll + distance * easeProgress;

          if (progress < 1) {
            animationFrameRef.current = requestAnimationFrame(step);
          }
        };
        animationFrameRef.current = requestAnimationFrame(step);
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

export const EliteResourceMatrix = React.memo(({ dna, resources, operatingHours, currentDate, bookings = [], onGridClick, onBookingClick, matrixScrollRef, onDateSwipe, onPhantomDateChange }: EliteResourceMatrixProps) => {
  const [isMounted, setIsMounted] = React.useState(false);

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

      // 1. 收集配置中的正常营业时间
      if (operatingHours && operatingHours.length > 0) {
        operatingHours.forEach(period => {
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
            isOvertime: !operatingHours.some(p => hour >= p.start && hour < p.end),
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
    
    // 【The Data-Layer Shift Paradigm】：十字准星顶部磁吸拦截
    // 如果用户点击了 0~16px 的顶部安全空白区，强制将坐标吸附 (Snap) 到第一根时间轴起跑线，防止越界计算
    if (waterfallData.nodes.length > 0 && absY < waterfallData.nodes[0].top) {
      absY = waterfallData.nodes[0].top;
    } else if (absY < 0) {
      absY = 0;
    }
    
    // 找到当前 Y 所在的节点
    let targetNode = [...waterfallData.nodes].reverse().find(n => absY >= n.top);
    if (!targetNode) targetNode = waterfallData.nodes[0];
    
    let exactY = targetNode.top;
    let timeStr = '00:00';
    
    if (targetNode.type === 'time') {
      const offsetYInRow = absY - targetNode.top;
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
    const target = e.target as HTMLElement;
    if (target.closest('.pointer-events-auto')) return;
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    pointerDownAtRef.current = Date.now();
    containerRectRef.current = matrixContainerRef.current?.getBoundingClientRect() || null;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      activateCrosshair(e.clientY, e.clientX);
    }, 300);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const start = startPointerRef.current;
    if (!start) return;
    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);
    if (!crosshair.active && (dx > 10 || dy > 10)) {
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

  const handlePointerUp = (e: React.PointerEvent) => {
    const start = startPointerRef.current;
    const downAt = pointerDownAtRef.current;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    startPointerRef.current = null;
    pointerDownAtRef.current = null;
    if (crosshair.active) {
      const { resourceId, time, dateStr } = crosshair;
      _setCrosshair({ active: false, y: 0, time: '00:00', resourceId: null, dateStr: '' });
      if (onGridClick) onGridClick(resourceId || undefined, time, dateStr);
      return;
    }
    if (start && downAt) {
      const dt = Date.now() - downAt;
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      if (dt <= 300 && dx <= 10 && dy <= 10) {
        const rect = matrixContainerRef.current?.getBoundingClientRect();
        if (rect) {
          const { timeStr, resourceId, dateStr } = calculateCrosshair(e.clientY, e.clientX, rect);
          if (onGridClick) onGridClick(resourceId || undefined, timeStr, dateStr);
        }
      }
    }
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

  const handleMatrixScroll = (e: UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    
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

  // --- 世界顶端交互法则：黑洞拖拽删除引擎 (The Void Engine) ---
  const [draggedBooking, setDraggedBooking] = React.useState<MatrixBooking | null>(null);
  const [isHoveringVoid, setIsHoveringVoid] = React.useState(false);
  const [pendingVoidBooking, setPendingVoidBooking] = React.useState<MatrixBooking | null>(null);
  const voidRef = useRef<HTMLDivElement>(null);

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
          window.dispatchEvent(new Event('gx-sandbox-bookings-updated'));
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
      window.dispatchEvent(new Event('gx-sandbox-bookings-updated'));
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
      window.dispatchEvent(new Event('gx-sandbox-bookings-updated'));
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
                  {/* 仅保留非营业时间的暗场遮罩，移除所有 border-t 网格线 */}
                  {node.isOvertime && (
                    <div className="absolute inset-0 bg-stripes-white/[0.02]" />
                  )}
                </div>
              );
            })}
            {/* 渲染资源列与卡片 (The Cyber Matrix Data Layer) */}
            <div className="absolute inset-0 flex pl-[0px] pb-20 pointer-events-none">
              {resources.map((resource) => {
                const colBookings = bookings.filter(b => b.resourceId === resource.id);
                return (
                  <div key={resource.id} className="flex-1 relative min-w-[120px] pointer-events-none">
                    {colBookings.map(booking => {
                      if (!booking.startTime || !booking.duration || !booking.date) return null;
                      
                      // 动态编号降维处理函数
                      const formatMinimalId = (idStr: string) => {
                        if (!idStr) return "未知";
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

                      const isTiny = booking.duration <= 45;
                      const serviceTitle = booking.serviceName || '';
                      const isUnassigned = booking.originalUnassigned === true;
                      const blockColor = isUnassigned ? '#00f0ff' : (resource.id === 'NO' ? '#ef4444' : (resource.themeColor || dna.themeColor));
                      const blockAccent = isUnassigned ? 'cyan' : (resource.id === 'NO' ? 'red' : dna.accent);

                      return (
                        <div 
                          key={booking.id} 
                          className="absolute left-1 right-1 pointer-events-auto"
                          style={{
                            top: topOffset,
                            height: Math.max(40, heightPx - 4),
                            zIndex: draggedBooking?.id === booking.id ? 100 : 20,
                            // 软删除待确认状态视觉反馈
                            opacity: pendingVoidBooking?.id === booking.id ? 0.3 : 1,
                            pointerEvents: pendingVoidBooking?.id === booking.id ? 'none' : 'auto'
                          }}
                        >
                          <EliteBookingBlock 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onBookingClick) onBookingClick(booking);
                            }}
                            onDragStart={() => handleBookingDragStart(booking)}
                            onDrag={(e, info) => handleBookingDrag(e, info)}
                            onDragEnd={(e, info) => handleBookingDragEnd(e, info, booking)}
                            title={serviceTitle}
                            time={`${booking.startTime} (${booking.duration}m)`}
                            client={formatMinimalId((booking.customerId || booking.customerName) || "")}
                            color={blockColor}
                            accent={blockAccent as "cyan" | "purple" | "emerald" | "amber" | "red"}
                            height="100%" 
                            isTiny={isTiny}
                          />
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
