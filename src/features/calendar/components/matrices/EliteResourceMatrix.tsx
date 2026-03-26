"use client";

import React, { useMemo, useRef, UIEvent } from "react";
import { cn } from "@/utils/cn";
import { motion, PanInfo } from "framer-motion";
import { IndustryType, IndustryDNA, MatrixResource } from "../../types";
import { EliteBookingBlock } from "./EliteBookingBlock";
import { OperatingHour } from "../IndustryCalendar";
import { useVisualSettings, CYBER_COLOR_DICTIONARY } from "@/hooks/useVisualSettings";
 

export interface EliteResourceMatrixProps {
  industry: IndustryType;
  dna: IndustryDNA;
  resources: MatrixResource[];
  operatingHours: OperatingHour[];
  currentDate?: Date; // 新增：接收父组件传来的当前日期
  bookings?: MatrixBooking[];
  onHorizontalScroll?: (scrollLeft: number) => void;
  onGridClick?: (resourceId?: string, time?: string) => void;
  onBookingClick?: (booking: MatrixBooking) => void; // 新增：点击预约块的回调
  matrixScrollRef?: React.Ref<HTMLDivElement>;
  onDateSwipe?: (direction: 'prev' | 'next') => void; // 传递日期切换事件
}

type MatrixService = {
  id: string;
  name: string;
  prices?: number[];
  duration?: number;
  assignedEmployeeId?: string | null;
};

type MatrixBooking = {
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

export const EliteResourceMatrix = ({ industry, dna, resources, operatingHours, currentDate, bookings = [], onGridClick, onBookingClick, matrixScrollRef, onDateSwipe }: EliteResourceMatrixProps) => {
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

  // --- 核心算法：智能折叠与被动撑开的时间轴 (Smart Folding Timeline) ---
  const liquidTimeSlots = useMemo(() => {
    const activeHours = new Set<number>();

    // 1. 收集配置中的正常营业时间
    if (operatingHours && operatingHours.length > 0) {
      operatingHours.forEach(period => {
        for (let h = period.start; h < period.end; h++) {
          activeHours.add(h);
        }
      });
    } else {
      // 降级保护：默认 09:00 - 18:00
      for (let h = 9; h < 18; h++) activeHours.add(h);
    }

    // 2. 收集跨界订单强制撑开的时间
    const targetDate = currentDate || new Date();
    const year = targetDate.getFullYear();
    const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
    const day = targetDate.getDate().toString().padStart(2, '0');
    const currentDateStr = `${year}-${month}-${day}`;

    bookings.forEach(booking => {
      // 仅检查当天的订单
      if (booking.date === currentDateStr && booking.startTime && booking.duration) {
        const [startHour, startMin] = booking.startTime.split(':').map(Number);
        // 计算订单结束时的小时 (Math.ceil 处理跨点逻辑，例如 11:59 + 120min -> 13:59 -> 占用了 11, 12, 13)
        const totalMinutes = startMin + booking.duration;
        // 如果分钟正好等于60的倍数（比如 11:00 持续 60 分钟到 12:00），它不应该撑开 12:00 这个格子
        // 所以我们用 (totalMinutes - 1) 来计算实际跨越的格子数
        const spanHours = Math.floor((totalMinutes > 0 ? totalMinutes - 1 : 0) / 60);
        
        for (let i = 0; i <= spanHours; i++) {
          const h = startHour + i;
          if (h < 24) activeHours.add(h); // 确保不跨天
        }
      }
    });

    // 3. 排序并生成最终渲染数组
    const sortedHours = Array.from(activeHours).sort((a, b) => a - b);
    
    return sortedHours.map(hour => ({
      hour,
      label: `${hour.toString().padStart(2, '0')}:00`,
      // 虽然已经折叠，但为了可能保留的视觉状态（如非营业时间段被撑开时显示不同背景），我们依然标记 isOvertime
      isOvertime: !operatingHours.some(p => hour >= p.start && hour < p.end)
    }));
  }, [operatingHours, bookings, currentDate]);

  const [crosshair, _setCrosshair] = React.useState<{ active: boolean, y: number, time: string, resourceId: string | null }>({
    active: false,
    y: 0,
    time: '00:00',
    resourceId: null
  });

  const calculateCrosshair = (clientY: number, clientX: number, rect: DOMRect) => {
    let y = clientY - rect.top - 16; // 16px is pt-4
    if (y < 0) y = 0;
    
    const rowIdx = Math.floor(y / 80);
    const maxRowIdx = liquidTimeSlots.length - 1;
    const clampedRowIdx = Math.min(Math.max(0, rowIdx), maxRowIdx);
    
    const offsetYInRow = y - (clampedRowIdx * 80);
    const snappedOffsetY = Math.round(offsetYInRow / 20) * 20; // 0, 20, 40, 60, 80
    
    let finalRowIdx = clampedRowIdx;
    let finalMin = (snappedOffsetY / 20) * 15; // 0, 15, 30, 45, 60
    
    if (finalMin === 60) {
      if (finalRowIdx < maxRowIdx) {
        finalRowIdx += 1;
        finalMin = 0;
      } else {
        finalMin = 45;
      }
    }
    
    const hour = liquidTimeSlots[finalRowIdx].hour;
    const timeStr = `${hour.toString().padStart(2, '0')}:${finalMin.toString().padStart(2, '0')}`;
    
    const exactY = finalRowIdx * 80 + (finalMin / 15) * 20 + 16;
    
    const x = clientX - rect.left;
    const colWidth = rect.width / resources.length;
    const colIdx = Math.min(Math.max(0, Math.floor(x / colWidth)), resources.length - 1);
    const resourceId = resources[colIdx].id;
    
    return { exactY, timeStr, resourceId };
  };

  const activateCrosshair = (clientY: number, clientX: number) => {
    const rect = containerRectRef.current;
    if (!rect) return;
    const { exactY, timeStr, resourceId } = calculateCrosshair(clientY, clientX, rect);
    _setCrosshair({ active: true, y: exactY, time: timeStr, resourceId });
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
      const { exactY, timeStr, resourceId } = calculateCrosshair(e.clientY, e.clientX, rect);
      _setCrosshair({ active: true, y: exactY, time: timeStr, resourceId });
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
      const { resourceId, time } = crosshair;
      _setCrosshair({ active: false, y: 0, time: '00:00', resourceId: null });
      if (onGridClick) onGridClick(resourceId || undefined, time);
      return;
    }
    if (start && downAt) {
      const dt = Date.now() - downAt;
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      if (dt <= 300 && dx <= 10 && dy <= 10) {
        const rect = matrixContainerRef.current?.getBoundingClientRect();
        if (rect) {
          const { timeStr, resourceId } = calculateCrosshair(e.clientY, e.clientX, rect);
          if (onGridClick) onGridClick(resourceId || undefined, timeStr);
        }
      }
    }
  };

  const handlePointerCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    _setCrosshair({ active: false, y: 0, time: '00:00', resourceId: null });
    startPointerRef.current = null;
    pointerDownAtRef.current = null;
  };

  const handleMatrixScroll = (e: UIEvent<HTMLDivElement>) => {
    // 垂直同步时间轴
    if (timeColumnRef.current) {
      timeColumnRef.current.scrollTop = e.currentTarget.scrollTop;
    }
    // 横向同步顶部员工列表 (已废弃，表头不再接受被动滚动，改为翻页)
    // if (onHorizontalScroll) {
    //   onHorizontalScroll(e.currentTarget.scrollLeft);
    // }
  };

  // 矩阵区的手势接管：滑动切换日期
  const handleMatrixPanEnd = (_e: unknown, info: PanInfo) => {
    // 防止纵向滚动误触横向翻页
    if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) return;

    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      onDateSwipe?.('next');
    } else if (info.offset.x > swipeThreshold) {
      onDateSwipe?.('prev');
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-transparent">
      {/* 纵向时间轴固定列 (带流动发光) */}
      <div className="w-[60px] md:w-20 flex flex-col relative shrink-0">
        <div 
          ref={timeColumnRef}
          className="flex-1 overflow-hidden relative pointer-events-none"
        >
          {/* 修改底部留白为 pb-20 (恰好等于一个 h-20 网格的高度) */}
          <div className="relative pb-20 pt-4 w-full">
            {liquidTimeSlots.map((slot, idx) => (
              <div key={slot.hour} className="h-20 relative group">
                <div className={cn(
                  "absolute top-0 left-2.5 -translate-y-1/2 transition-all duration-500 text-[13px] leading-none mix-blend-screen flex items-center justify-center font-normal tracking-normal tabular-nums z-10",
                  slot.hour === currentHour && "scale-110 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] [text-shadow:0_0_15px_rgba(0,240,255,0.6)]",
                  slot.hour !== currentHour && "hover:scale-110"
                )} style={slot.hour !== currentHour ? { textShadow: `0 0 15px ${CYBER_COLOR_DICTIONARY[visualSettings.timelineColorTheme].hex}80` } : {}}>
                  <span className={cn(slot.hour === currentHour ? "bg-gradient-to-br from-white via-gx-cyan to-white bg-[length:200%_auto] animate-[gradient_2s_linear_infinite] bg-clip-text text-transparent" : CYBER_COLOR_DICTIONARY[visualSettings.timelineColorTheme].className)}>
                    {slot.hour.toString().padStart(2, '0')}
                  </span>
                  {/* 修复时间轴竖杠的样式冲突，移除强制内联颜色，统一使用透明度控制 */}
                  <span className={cn(
                    "text-[10px] mx-[3px] animate-pulse", 
                    slot.hour === currentHour ? "text-gx-cyan opacity-40" : "text-white/30"
                  )}>:</span>
                  <span className={cn("opacity-80", slot.hour === currentHour ? "bg-gradient-to-br from-white via-gx-cyan to-white bg-[length:200%_auto] animate-[gradient_2s_linear_infinite] bg-clip-text text-transparent" : CYBER_COLOR_DICTIONARY[visualSettings.timelineColorTheme].className)}>
                    00
                  </span>
                </div>
                {/* 如果是断点（例如 11点下一个是 15点），显示折叠提示 */}
                {idx < liquidTimeSlots.length - 1 && liquidTimeSlots[idx + 1].hour - slot.hour > 1 && (
                  <div className="absolute bottom-[-1px] left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-gx-cyan/40 to-transparent flex items-center justify-center z-10">
                    <div className="w-1 h-1 rounded-full bg-gx-cyan shadow-[0_0_5px_rgba(0,240,255,0.8)]" />
                  </div>
                )}
                {slot.hour === currentHour && (
                  <div className="absolute left-0 right-0 top-0 -translate-y-1/2 h-px bg-gx-cyan/30 shadow-[0_0_15px_rgba(0,240,255,0.5)] z-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 横向专家音轨矩阵 */}
      <motion.div 
        ref={actualMatrixRef}
        onScroll={handleMatrixScroll}
        onPanEnd={handleMatrixPanEnd}
        className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth relative no-scrollbar touch-pan-y"
      >
        <div className="min-w-fit flex flex-col h-full w-full">
          {/* 矩阵主体同步修改底部留白为 pb-20 */}
          <div 
            ref={matrixContainerRef}
            className={cn("relative pb-20 pt-4 w-full cursor-crosshair select-none", crosshair.active ? "touch-none" : "")}
            style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
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

            {liquidTimeSlots.map((slot) => (
              <div 
                key={slot.hour} 
                className="grid h-20 relative group/row w-full"
                style={{
                  gridTemplateColumns: `repeat(${resources.length}, minmax(0, 1fr))`, // 彻底放弃固定宽度，强制平分屏幕
                  width: '100%'
                }}
              >
                {resources.map((res: MatrixResource) => {
                  // --- 极简渲染逻辑 ---
                  // 现在数据在存入 localStorage 时已经分配好了 resourceId (即使是 unassigned 也被前置派发了坑位)
                  // 并且我们加入了 date 字段来过滤非当天的幽灵数据
                  const targetDate = currentDate || new Date();
                  const year = targetDate.getFullYear();
                  const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
                  const day = targetDate.getDate().toString().padStart(2, '0');
                  const currentDateStr = `${year}-${month}-${day}`;
                  
                  // 使用 filter 替代 find，以支持单个格子内的多重渲染（主要用于 NO 爽约列的无限堆叠）
                  const cellBookings = bookings.filter(b => {
                    const [bHour] = (b.startTime || "00:00").split(':').map(Number);
                    return bHour === slot.hour && b.resourceId === res.id && b.date === currentDateStr;
                  });

                  // 动态编号降维处理函数
                  const formatMinimalId = (idStr: string) => {
                    if (!idStr) return "未知";
                    
                    // 1. 处理散客 (CO) 和 爽约 (NO) -> 剥离前缀，动态补零
                    if (idStr.startsWith("CO") || idStr.startsWith("NO")) {
                      const prefix = idStr.substring(0, 2);
                      const numStr = idStr.substring(2).trim();
                      const num = parseInt(numStr, 10);
                      
                      if (isNaN(num)) return idStr;
                      
                      // 1-999 补至 3 位，1000 以上原样显示
                      if (num < 1000) {
                        return `${prefix} ${num.toString().padStart(3, '0')}`;
                      } else {
                        return `${prefix} ${num.toString()}`;
                      }
                    }
                    
                    // 2. 处理正式会员 (GV/AD/AN/UM) -> 彻底剥离字母前缀，只留数字
                    const vipMatch = idStr.match(/^(GV|AD|AN|UM)\s*(\d+)$/);
                    if (vipMatch) {
                      return vipMatch[2]; // 只返回数字部分
                    }

                    // 兜底返回
                    return idStr;
                  };

                  return (
                    <div 
                      key={res.id} 
                      className="w-full h-full relative px-0.5 md:px-2 snap-center"
                    >
                      {/* 分叉渲染逻辑：NO 列使用 Flex 等分，常规列使用全宽绝对定位 */}
                      {cellBookings.length > 0 && (
                        res.id === 'NO' ? (
                          // NO 列：使用 flex-row 等分并排显示多个爽约订单
                          <div className="absolute inset-x-0.5 md:inset-x-2 top-0 h-full z-10 flex flex-row gap-1 pointer-events-none">
                            {cellBookings.map((booking: MatrixBooking) => {
                              const [, bMin] = (booking.startTime || "00:00").split(':').map(Number);
                              const topOffset = (bMin / 60) * 80;
                              const heightPx = (booking.duration / 60) * 80;
                              const isTiny = booking.duration <= 45; // 前置静态高度判定：小于等于 45 分钟视为极矮卡片
                              const serviceTitle = booking.serviceName ? (industry === 'medical' && booking.serviceName.includes('套餐') ? '常规诊疗' : booking.serviceName) : '';
                              return (
                                <div key={booking.id} className="flex-1 relative pointer-events-auto">
                                  <div style={{ position: 'absolute', top: topOffset, left: 0, right: 0, height: Math.max(40, heightPx - 4) }}>
                                    <EliteBookingBlock 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onBookingClick) onBookingClick(booking);
                                      }}
                                      title={serviceTitle}
                                      time={`${booking.startTime} (${booking.duration}m)`}
                                      client={formatMinimalId((booking.customerId || booking.customerName) || "")}
                                      color="#ef4444"
                                      accent="red"
                                      height="100%" 
                                      isTiny={isTiny}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          // 常规列：坚守物理碰撞法则，全宽渲染（取第一个订单，虽然底层已经做了防重叠）
                          // 修复：移除多余的绝对定位外壳，直接利用 left: 2, right: 2 (移动端) 相对于父级相对定位格子进行拉伸
                          <>
                            {cellBookings.slice(0, 1).map((booking: MatrixBooking) => {
                              const [, bMin] = (booking.startTime || "00:00").split(':').map(Number);
                              const topOffset = (bMin / 60) * 80;
                              const heightPx = (booking.duration / 60) * 80;
                              const isTiny = booking.duration <= 45; // 前置静态高度判定
                              const serviceTitle = booking.serviceName ? (industry === 'medical' && booking.serviceName.includes('套餐') ? '常规诊疗' : booking.serviceName) : '';
                              const isUnassigned = booking?.originalUnassigned === true;
                              const blockColor = isUnassigned ? '#00f0ff' : (res.themeColor || dna.themeColor);

                              return (
                                <div 
                                  key={booking.id} 
                                  className="pointer-events-auto"
                                  style={{ 
                                    position: 'absolute', 
                                    top: topOffset, 
                                    left: '2px', 
                                    right: '2px', 
                                    height: Math.max(40, heightPx - 4),
                                    zIndex: 10
                                  }}
                                >
                                  <EliteBookingBlock 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onBookingClick) onBookingClick(booking);
                                    }}
                                    title={serviceTitle}
                                    time={`${booking.startTime} (${booking.duration}m)`}
                                    client={formatMinimalId((booking.customerId || booking.customerName) || "")}
                                    color={blockColor}
                                    accent={isUnassigned ? 'cyan' : dna.accent}
                                    height="100%" 
                                    isTiny={isTiny}
                                  />
                                </div>
                              );
                            })}
                          </>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
