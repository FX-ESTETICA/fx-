"use client";

import React, { useMemo, useRef, UIEvent } from "react";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";
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
  onHorizontalScroll?: (scrollLeft: number) => void;
  onGridClick?: (resourceId?: string, time?: string) => void;
  onBookingClick?: (booking: any) => void; // 新增：点击预约块的回调
  matrixScrollRef?: React.Ref<HTMLDivElement>;
  onDateSwipe?: (direction: 'prev' | 'next') => void; // 传递日期切换事件
}

// 模拟数据：暂时清空以支持真实配置
// const MOCK_BOOKINGS: any[] = [];

/**
 * EliteResourceMatrix (专家音轨矩阵) - 引入液态时间轴算法
 */
export const EliteResourceMatrix = ({ industry, dna, resources, operatingHours, currentDate, onGridClick, onBookingClick, matrixScrollRef, onDateSwipe }: EliteResourceMatrixProps) => {
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const { settings: visualSettings } = useVisualSettings();
  
  // 新增：从 localStorage 读取沙盒预约数据
  const [sandboxBookings, setSandboxBookings] = React.useState<any[]>([]);

  React.useEffect(() => {
    const loadBookings = () => {
      try {
        const stored = localStorage.getItem('gx_sandbox_bookings');
        if (stored) {
          setSandboxBookings(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to load sandbox bookings:", e);
      }
    };

    // 初始加载
    loadBookings();

    // 监听自定义事件以实现跨组件刷新
    window.addEventListener('gx-sandbox-bookings-updated', loadBookings);
    return () => window.removeEventListener('gx-sandbox-bookings-updated', loadBookings);
  }, []);

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

    sandboxBookings.forEach(booking => {
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
  }, [operatingHours, sandboxBookings, currentDate]);

  // --- 战术准星交互 (Tactical Crosshair) ---
  const [crosshair, setCrosshair] = React.useState<{ active: boolean, y: number, time: string, resourceId: string | null }>({
    active: false,
    y: 0,
    time: '00:00',
    resourceId: null
  });
  const matrixContainerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null); // 新增：长按计时器
  const startPointerRef = useRef<{ x: number, y: number } | null>(null); // 新增：记录按下时的初始位置

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

  const handlePointerDown = (e: React.PointerEvent) => {
    // 忽略在已有预约块上的点击
    if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;
    
    const rect = matrixContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // 记录初始按下位置
    const clientX = e.clientX;
    const clientY = e.clientY;
    const pointerId = e.pointerId;
    const target = e.currentTarget as HTMLElement;
    
    startPointerRef.current = { x: clientX, y: clientY };

    // 设置 300ms 长按判定
    longPressTimerRef.current = setTimeout(() => {
      try {
        target.setPointerCapture(pointerId);
      } catch (err) {
        console.warn("setPointerCapture failed", err);
      }
      
      const { exactY, timeStr, resourceId } = calculateCrosshair(clientY, clientX, rect);
      setCrosshair({ active: true, y: exactY, time: timeStr, resourceId });
      
      // 触发触觉反馈 (如果设备支持)
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 300);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // 如果还没激活，检查是否滑动过大，若是则取消长按
    if (!crosshair.active) {
      if (startPointerRef.current) {
        const dx = e.clientX - startPointerRef.current.x;
        const dy = e.clientY - startPointerRef.current.y;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
      }
      return;
    }

    const rect = matrixContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const { exactY, timeStr, resourceId } = calculateCrosshair(e.clientY, e.clientX, rect);
    setCrosshair(prev => ({ ...prev, y: exactY, time: timeStr, resourceId }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const wasTimerActive = longPressTimerRef.current !== null;
    const startPos = startPointerRef.current;

    // 无论是否激活，都清除计时器和初始位置
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    startPointerRef.current = null;

    if (crosshair.active) {
      // --- 场景 2：长按拖拽结束 ---
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {
        console.warn("releasePointerCapture failed", err);
      }
      
      const finalTime = crosshair.time;
      const finalRes = crosshair.resourceId;
      
      setCrosshair(prev => ({ ...prev, active: false }));
      
      if (onGridClick) {
        onGridClick(finalRes || undefined, finalTime);
      }
    } else {
      // --- 场景 1：短按极速建单 ---
      // 如果 timer 还在（说明没有因为滑动超过 10px 而被 move 事件清除）
      if (wasTimerActive && startPos) {
        const dx = e.clientX - startPos.x;
        const dy = e.clientY - startPos.y;
        // 再次安全校验：抬起位置和按下位置偏差极小（小于10px）
        if (Math.abs(dx) <= 10 && Math.abs(dy) <= 10) {
          const rect = matrixContainerRef.current?.getBoundingClientRect();
          if (rect) {
            const { timeStr, resourceId } = calculateCrosshair(e.clientY, e.clientX, rect);
            if (onGridClick) {
              onGridClick(resourceId || undefined, timeStr);
            }
          }
        }
      }
    }
  };

  // --- 场景 3 & 意外中断：取消事件 (不触发创建) ---
  const handlePointerCancel = (e: React.PointerEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    startPointerRef.current = null;
    
    if (crosshair.active) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {
        console.warn("releasePointerCapture failed", err);
      }
      setCrosshair(prev => ({ ...prev, active: false }));
    }
  };

  // 使用 ref 来同步左右两侧的垂直滚动
  const timeColumnRef = useRef<HTMLDivElement>(null);
  const internalMatrixRef = useRef<HTMLDivElement>(null);
  const actualMatrixRef = matrixScrollRef || internalMatrixRef;

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
  const handleMatrixPanEnd = (_e: any, info: any) => {
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
                  <span className={cn("text-[10px] mx-[3px] animate-pulse", slot.hour === currentHour ? "text-gx-cyan opacity-40" : `opacity-40 ${CYBER_COLOR_DICTIONARY[visualSettings.timelineColorTheme].className.replace('text-transparent bg-clip-text', '')}`)} style={{ color: slot.hour !== currentHour ? CYBER_COLOR_DICTIONARY[visualSettings.timelineColorTheme].hex : undefined }}>:</span>
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
            // 动态控制 touch-action：未激活时允许 pan-y，激活时设为 none 以彻底独占手势，防止被浏览器滚动劫持触发 cancel
            className={cn("relative pb-20 pt-4 w-full cursor-crosshair select-none", crosshair.active ? "touch-none" : "")}
            style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            {/* 战术准星光束 */}
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
                  const cellBookings = sandboxBookings.filter(b => {
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
                      className="w-full h-full relative px-4 snap-center"
                    >
                      {/* 分叉渲染逻辑：NO 列使用 Flex 等分，常规列使用全宽绝对定位 */}
                      {cellBookings.length > 0 && (
                        res.id === 'NO' ? (
                          // NO 列：使用 flex-row 等分并排显示多个爽约订单
                          <div className="absolute inset-x-4 top-0 h-full z-10 flex flex-row gap-1 pointer-events-none">
                            {cellBookings.map((booking: any) => {
                              const [, bMin] = (booking.startTime || "00:00").split(':').map(Number);
                              const topOffset = (bMin / 60) * 80;
                              const heightPx = (booking.duration / 60) * 80;
                              const isTiny = booking.duration <= 45; // 前置静态高度判定：小于等于 45 分钟视为极矮卡片

                              return (
                                <div key={booking.id} className="flex-1 relative pointer-events-auto">
                                  <div style={{ position: 'absolute', top: topOffset, left: 0, right: 0, height: Math.max(40, heightPx - 4) }}>
                                    <EliteBookingBlock 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onBookingClick) onBookingClick(booking);
                                      }}
                                      title={industry === 'medical' && booking.serviceName.includes('套餐') ? '常规诊疗' : booking.serviceName}
                                      time={`${booking.startTime} (${booking.duration}m)`}
                                      client={formatMinimalId(booking.customerId || booking.customerName)}
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
                          // 修复：移除多余的绝对定位外壳，直接利用 left: 16, right: 16 相对于父级相对定位格子进行拉伸
                          <>
                            {cellBookings.slice(0, 1).map((booking: any) => {
                              const [, bMin] = (booking.startTime || "00:00").split(':').map(Number);
                              const topOffset = (bMin / 60) * 80;
                              const heightPx = (booking.duration / 60) * 80;
                              const isTiny = booking.duration <= 45; // 前置静态高度判定

                              const isUnassigned = booking?.originalUnassigned === true;
                              const blockColor = isUnassigned ? '#00f0ff' : (res.themeColor || dna.themeColor);

                              return (
                                <div 
                                  key={booking.id} 
                                  className="pointer-events-auto"
                                  style={{ 
                                    position: 'absolute', 
                                    top: topOffset, 
                                    left: 16, 
                                    right: 16, 
                                    height: Math.max(40, heightPx - 4),
                                    zIndex: 10
                                  }}
                                >
                                  <EliteBookingBlock 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onBookingClick) onBookingClick(booking);
                                    }}
                                    title={industry === 'medical' && booking.serviceName.includes('套餐') ? '常规诊疗' : booking.serviceName}
                                    time={`${booking.startTime} (${booking.duration}m)`}
                                    client={formatMinimalId(booking.customerId || booking.customerName)}
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
