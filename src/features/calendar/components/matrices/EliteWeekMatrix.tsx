"use client";

import React, { useMemo, useRef, UIEvent } from "react";
import { cn } from "@/utils/cn";
import { IndustryType, IndustryDNA, MatrixResource } from "../../types";
import { OperatingHour, ShopOperatingConfig, resolveOperatingHours } from "../IndustryCalendar";
import { useVisualSettings, CYBER_COLOR_DICTIONARY } from "@/hooks/useVisualSettings";
import { useSearchParams } from "next/navigation";
import { BookingService } from "@/features/booking/api/booking";

export interface EliteWeekMatrixProps {
  industry: IndustryType;
  dna: IndustryDNA;
  resources: MatrixResource[];
  selectedStaffIds: string[];
  operatingHours: ShopOperatingConfig | OperatingHour[];
  onGridClick?: (resourceId?: string, time?: string) => void;
  onDateClick?: (date: Date) => void;
  currentDate: Date;
}

// 模拟数据 (暂未使用，为后续真实数据接入留作占位)
// const MOCK_BOOKINGS: any[] = [];

const DAYS_OF_WEEK = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

type WeekBooking = {
  startTime?: string;
  duration?: number;
  resourceId?: string;
  date?: string;
};

export const EliteWeekMatrix = ({ resources, selectedStaffIds, operatingHours, onGridClick, onDateClick, currentDate }: EliteWeekMatrixProps) => {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => setIsMounted(true), []);
  const currentHour = isMounted ? new Date().getHours() : -1;
  const { settings: visualSettings } = useVisualSettings();
  const searchParams = useSearchParams();
  const shopId = searchParams.get('shopId');

  // 新增：从云端读取沙盒预约数据 (为了支持被动撑开逻辑)
  const [sandboxBookings, setSandboxBookings] = React.useState<WeekBooking[]>([]);

  React.useEffect(() => {
    const loadBookings = async () => {
      try {
        const currentShopId = shopId || 'default';
        const { data: bookingsData } = await BookingService.getBookings(currentShopId);
        const allBookings = bookingsData || [];
        setSandboxBookings(allBookings);
      } catch (e) {
        console.error("Failed to load sandbox bookings:", e);
      }
    };
    loadBookings();
    
    // 监听实时更新引擎而不是本地事件
    const realtimeChannel = BookingService.subscribeToAllBookings(() => {
      loadBookings();
    });

    return () => {
      if (realtimeChannel) {
        BookingService.unsubscribe(realtimeChannel);
      }
    };
  }, [shopId]);

  // 生成当前周的日期
  const weekDates = useMemo(() => {
    const dates = [];
    const curr = new Date(currentDate);
    const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1);
    const startDate = new Date(curr.setDate(first));
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentDate]);

  // 提取动态渲染的时间段（智能剔除全局非营业时间）
  const timeSlots = useMemo(() => {
    const activeHours = new Set<number>();

    // 遍历这一周的 7 天，收集所有的有效营业时间
    weekDates.forEach(dateObj => {
      const { hours: effectiveHours } = resolveOperatingHours(dateObj, operatingHours);
      if (effectiveHours && effectiveHours.length > 0) {
        effectiveHours.forEach(period => {
          for (let h = period.start; h < period.end; h++) {
            activeHours.add(h);
          }
        });
      } else {
        for (let h = 9; h < 18; h++) activeHours.add(h);
      }
    });

    // 周视图需要检查这一周内所有的订单是否跨界
    sandboxBookings.forEach(booking => {
      // 周视图简化处理：只要有订单，就把它占用的时间段撑开（不严格过滤具体是哪一天，保证整个星期的 Y 轴坐标系统一）
      if (booking.startTime && booking.duration) {
        const [startHour, startMin] = booking.startTime.split(':').map(Number);
        const totalMinutes = startMin + booking.duration;
        const spanHours = Math.floor((totalMinutes > 0 ? totalMinutes - 1 : 0) / 60);
        
        for (let i = 0; i <= spanHours; i++) {
          const h = startHour + i;
          if (h < 24) activeHours.add(h);
        }
      }
    });

    const sortedHours = Array.from(activeHours).sort((a, b) => a - b);
    
    return sortedHours.map(hour => {
      // 周视图下的 isOvertime 可以基于默认的 9-18，或者提取出的 activeHours 的边界。
      // 为防止崩溃，先简单处理，或者通过重新计算
      return {
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        isOvertime: false
      };
    });
  }, [operatingHours, sandboxBookings, weekDates]);

  // 过滤出选中的人员
  const filteredResources = useMemo(() => {
    return resources.filter(res => selectedStaffIds.includes(res.id));
  }, [resources, selectedStaffIds]);

  const timeColumnRef = useRef<HTMLDivElement>(null);

  const handleMatrixScroll = (e: UIEvent<HTMLDivElement>) => {
    if (timeColumnRef.current) {
      timeColumnRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent">
      {/* 周视图表头 (X轴：时间维度) */}
      <div className="flex bg-transparent h-[76px] overflow-hidden shrink-0">
        {/* 左侧固定：空位占位符 */}
        <div className="w-24 shrink-0 flex items-center justify-center z-10">
        </div>
        <div className="flex-1 grid grid-cols-7 h-full">
          {weekDates.map((date, idx) => {
            const isToday = isMounted ? date.toDateString() === new Date().toDateString() : false;
            return (
              <div 
                key={idx} 
                className="flex flex-col items-center justify-center relative group cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => onDateClick?.(date)}
              >
                {isToday && <div className={`absolute top-0 left-0 right-0 h-1 ${visualSettings.timelineColorTheme === 'blackgold' ? "bg-[#8B7355]" : "bg-[#FDF5E6]"}`} />}
                <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors", isToday ? `${visualSettings.timelineColorTheme === 'blackgold' ? "text-[#8B7355]" : "text-[#FDF5E6]"}` : `text-white ${visualSettings.timelineColorTheme === 'blackgold' ? "group-hover:text-[#8B7355]" : "group-hover:text-[#FDF5E6]"}`)}>
                  {DAYS_OF_WEEK[idx]}
                </span>
                <span className={cn("text-[20px] font-mono font-bold mt-1 transition-colors", isToday ? "text-white " : "text-white group-hover:text-white")}>
                  {date.getDate().toString().padStart(2, '0')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 矩阵主体 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 纵向时间轴 */}
        <div className="w-24 flex flex-col relative shrink-0 bg-transparent">
          <div ref={timeColumnRef} className="flex-1 overflow-hidden relative pointer-events-none">
            {/* 修改周视图的底部留白，原网格高度是 h-16 (64px)，所以改为 pb-16 */}
            <div className="relative pb-16">
              {timeSlots.map((slot, idx) => (
              <div key={slot.hour} className="h-16 flex items-start justify-center relative group pt-2">
                <div className={cn(
                  "transition-all duration-500 text-[15px] flex items-center justify-center font-normal tracking-normal tabular-nums",
                  visualSettings.timelineColorTheme !== 'purewhite' && visualSettings.timelineColorTheme !== 'blackgold' && "mix-blend-screen",
                  slot.hour === currentHour && "scale-110",
                  slot.hour !== currentHour && "hover:scale-110"
                )} style={slot.hour !== currentHour ? { textShadow: visualSettings.timelineColorTheme === 'purewhite' ? 'none' : visualSettings.timelineColorTheme === 'blackgold' ? '0px 1px 0px rgba(255,255,255,0.8)' : `0 0 15px ${(CYBER_COLOR_DICTIONARY as any)[visualSettings.timelineColorTheme]?.hex || '#fff'}80` } : {}}>
                  <span className={cn(slot.hour === currentHour ? `${visualSettings.timelineColorTheme === 'blackgold' ? "text-[#8B7355]" : "text-[#FDF5E6]"}` : CYBER_COLOR_DICTIONARY[visualSettings.timelineColorTheme].className)}>
                    {slot.hour.toString().padStart(2, '0')}
                  </span>
                  <span className={cn("text-[11px] mx-[3px] animate-pulse", slot.hour === currentHour ? `${visualSettings.timelineColorTheme === 'blackgold' ? "text-[#8B7355]" : "text-[#FDF5E6]"} ` : visualSettings.timelineColorTheme === 'blackgold' ? "text-black" : ` ${CYBER_COLOR_DICTIONARY[visualSettings.timelineColorTheme].className.replace('text-transparent bg-clip-text', '')}`)} style={{ color: slot.hour !== currentHour && visualSettings.timelineColorTheme !== 'blackgold' ? (CYBER_COLOR_DICTIONARY as any)[visualSettings.timelineColorTheme]?.hex : undefined }}>:</span>
                  <span className={cn("", slot.hour === currentHour ? `${visualSettings.timelineColorTheme === 'blackgold' ? "text-[#8B7355]" : "text-[#FDF5E6]"}` : CYBER_COLOR_DICTIONARY[visualSettings.timelineColorTheme].className)}>
                    00
                  </span>
                </div>
                {idx < timeSlots.length - 1 && timeSlots[idx + 1].hour - slot.hour > 1 && (
                  <div className={`absolute bottom-[-1px] left-2 right-2 h-[2px] bg-gradient-to-r from-transparent ${visualSettings.timelineColorTheme === 'blackgold' ? "via-[#8B7355]/40" : "via-[#FDF5E6]/40"} to-transparent flex items-center justify-center z-10`}>
                    <div className={`w-1 h-1 rounded-full ${visualSettings.timelineColorTheme === 'blackgold' ? "bg-[#8B7355]" : "bg-[#FDF5E6]"}`} />
                  </div>
                )}
                {slot.hour === currentHour && (
                  <div className={`absolute left-0 right-0 top-3 h-px ${visualSettings.timelineColorTheme === 'blackgold' ? "bg-[#8B7355]/30" : "bg-[#FDF5E6]/30"} z-10`} />
                )}
              </div>
            ))}
            </div>
          </div>
        </div>

        {/* 核心网格 */}
        <div 
          onScroll={handleMatrixScroll}
          className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth relative no-scrollbar"
        >
          <div className="min-w-fit flex flex-col h-full">
            {/* 矩阵主体同步修改底部留白为 pb-16 */}
            <div className="relative pb-16">
              {timeSlots.map((slot) => (
                <div 
                  key={slot.hour} 
                  className="grid h-16 relative group/row"
                  style={{ gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))' }}
                >
                  {weekDates.map((_date, dayIdx) => (
                    <div 
                      key={dayIdx} 
                      className="w-full h-full group hover:bg-white/[0.02] transition-colors relative p-1 flex flex-col gap-1 cursor-pointer"
                      onClick={() => onGridClick && onGridClick(undefined, `${String(slot.hour).padStart(2, '0')}:00`)}
                    >
                      {/* 渲染当前格子内所有被选中员工的真实预约 */}
                      {filteredResources.map((res) => {
                        const dateStr = _date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
                        
                        // 查找该员工在该天该时间槽是否有真实的订单
                        const hasRealBooking = sandboxBookings.some(b => {
                           if (b.resourceId !== res.id || b.date !== dateStr) return false;
                           const startHour = b.startTime ? parseInt(b.startTime.split(':')[0], 10) : -1;
                           return startHour === slot.hour;
                        });
                        
                        if (hasRealBooking) {
                          return (
                            <div 
                              key={res.id} 
                              className="w-full h-[6px] rounded-full  hover:opacity-100 transition-opacity"
                              style={{ 
                                backgroundColor: res.themeColor || '#fff',
                                boxShadow: `0 0 10px ${res.themeColor || '#fff'}40`
                              }}
                              title={res.name}
                            />
                          );
                        }
                        return null;
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
