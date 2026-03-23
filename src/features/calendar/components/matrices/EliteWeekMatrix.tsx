"use client";

import { useMemo, useRef, UIEvent } from "react";
import { cn } from "@/utils/cn";
import { IndustryType, IndustryDNA, MatrixResource } from "../../types";
import { OperatingHour } from "../IndustryCalendar";
import { useVisualSettings, CYBER_COLOR_DICTIONARY } from "@/hooks/useVisualSettings";

export interface EliteWeekMatrixProps {
  industry: IndustryType;
  dna: IndustryDNA;
  resources: MatrixResource[];
  selectedStaffIds: string[];
  operatingHours: OperatingHour[];
  onGridClick?: () => void;
  onDateClick?: (date: Date) => void;
  currentDate: Date;
}

// 模拟数据 (暂未使用，为后续真实数据接入留作占位)
// const MOCK_BOOKINGS: any[] = [];

const DAYS_OF_WEEK = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export const EliteWeekMatrix = ({ resources, selectedStaffIds, operatingHours, onGridClick, onDateClick, currentDate }: EliteWeekMatrixProps) => {
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const { settings: visualSettings } = useVisualSettings();

  // --- 核心算法：24小时连续时间轴 ---
  const liquidTimeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        isOvertime: !(operatingHours || []).some(p => hour >= p.start && hour < p.end)
      });
    }
    return slots;
  }, [operatingHours]);

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

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent">
      {/* 周视图表头 (X轴：时间维度) */}
      <div className="flex bg-transparent h-[76px] overflow-hidden shrink-0">
        {/* 左侧固定：空位占位符 */}
        <div className="w-24 shrink-0 flex items-center justify-center z-10">
        </div>
        <div className="flex-1 grid grid-cols-7 h-full">
          {weekDates.map((date, idx) => {
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <div 
                key={idx} 
                className="flex flex-col items-center justify-center relative group cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => onDateClick?.(date)}
              >
                {isToday && <div className="absolute top-0 left-0 right-0 h-1 bg-gx-cyan shadow-[0_0_10px_rgba(0,240,255,0.5)]" />}
                <span className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", isToday ? "text-gx-cyan" : "text-white group-hover:text-gx-cyan")}>
                  {DAYS_OF_WEEK[idx]}
                </span>
                <span className={cn("text-[20px] font-mono font-bold mt-1 transition-colors", isToday ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" : "text-white group-hover:text-white/80")}>
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
            {liquidTimeSlots.map((slot, idx) => (
              <div key={slot.hour} className="h-16 flex items-start justify-center relative group pt-2">
                <div className={cn(
                  "transition-all duration-500 text-[15px] mix-blend-screen flex items-center justify-center font-normal tracking-normal tabular-nums",
                  slot.hour === currentHour 
                    ? "text-gx-cyan scale-110" 
                    : cn("hover:scale-110", CYBER_COLOR_DICTIONARY[visualSettings.timelineColorTheme].className)
                )} style={slot.hour !== currentHour ? { textShadow: `0 0 15px ${CYBER_COLOR_DICTIONARY[visualSettings.timelineColorTheme].hex}80` } : {}}>
                  <span>{slot.hour.toString().padStart(2, '0')}</span>
                  <span className="text-[11px] opacity-40 mx-0.5 animate-pulse">:</span>
                  <span className="opacity-80">00</span>
                </div>
                {idx < liquidTimeSlots.length - 1 && liquidTimeSlots[idx + 1].hour - slot.hour > 1 && (
                  <div className="absolute bottom-[-1px] left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-gx-cyan/40 to-transparent flex items-center justify-center z-10">
                    <div className="w-1 h-1 rounded-full bg-gx-cyan shadow-[0_0_5px_rgba(0,240,255,0.8)]" />
                  </div>
                )}
                {slot.hour === currentHour && (
                  <div className="absolute left-0 right-0 top-3 h-px bg-gx-cyan/30 shadow-[0_0_15px_rgba(0,240,255,0.5)] z-10" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 核心网格 */}
        <div 
          onScroll={handleMatrixScroll}
          className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth relative no-scrollbar"
        >
          <div className="min-w-fit flex flex-col h-full">
            <div className="relative pb-24">
              {liquidTimeSlots.map((slot) => (
                <div 
                  key={slot.hour} 
                  className="grid h-16 relative group/row"
                  style={{ gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))' }}
                >
                  {weekDates.map((_date, dayIdx) => (
                    <div 
                      key={dayIdx} 
                      className="w-full h-full group hover:bg-white/[0.02] transition-colors relative p-1 flex flex-col gap-1 cursor-pointer"
                      onClick={onGridClick}
                    >
                      {/* 渲染当前格子内所有被选中员工的预约 (模拟数据) */}
                      {filteredResources.map((res) => {
                        // 伪代码：在沙盒中为了演示聚合效果，随机生成一些色块
                        // 利用人员id和时间槽产生确定性的伪随机
                        const pseudoRandom = (res.id.charCodeAt(0) + slot.hour + dayIdx) % 5;
                        const hasBooking = pseudoRandom === 0; 
                        
                        if (hasBooking) {
                          return (
                            <div 
                              key={res.id} 
                              className="w-full h-[6px] rounded-full opacity-80 hover:opacity-100 transition-opacity"
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
