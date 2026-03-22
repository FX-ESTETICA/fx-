"use client";

import { useMemo } from "react";
import { cn } from "@/utils/cn";
import { IndustryType, IndustryDNA, MatrixResource } from "../../types";

export interface EliteMonthMatrixProps {
  industry: IndustryType;
  dna: IndustryDNA;
  resources: MatrixResource[];
  selectedStaffIds: string[];
  currentDate: Date;
  onGridClick?: () => void;
  onDateClick?: (date: Date) => void;
}

const DAYS_OF_WEEK = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export const EliteMonthMatrix = ({ resources, selectedStaffIds, currentDate, onGridClick, onDateClick }: EliteMonthMatrixProps) => {
  // 生成当前月的日历网格数据
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDayOfMonth.getDate();
    // 0 is Sunday, convert to 1-7 (Mon-Sun)
    let firstDayOfWeek = firstDayOfMonth.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 7 : firstDayOfWeek;
    
    const days = [];
    
    // 补齐上个月的尾巴
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i > 0; i--) {
      days.push({
        day: prevMonthLastDay - i + 1,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i + 1)
      });
    }
    
    // 当前月
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }
    
    // 补齐下个月的开头
    const remainingCells = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
    
    return days;
  }, [currentDate]);

  const filteredResources = useMemo(() => {
    return resources.filter(res => selectedStaffIds.includes(res.id));
  }, [resources, selectedStaffIds]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent p-6 gap-4">
      {/* 星期表头 */}
      <div className="grid grid-cols-7 h-12 bg-transparent">
        {DAYS_OF_WEEK.map((day, idx) => (
          <div key={idx} className="flex items-center justify-center">
            <span className="text-[11px] font-black uppercase tracking-widest text-white/40">
              {day}
            </span>
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-2">
        {calendarDays.map((cell, idx) => {
          const isToday = cell.date.toDateString() === new Date().toDateString();
          
          return (
            <div 
              key={idx} 
              onClick={onGridClick}
              className={cn(
                "rounded-2xl border p-3 flex flex-col gap-2 transition-all cursor-pointer group hover:bg-white/[0.05]",
                cell.isCurrentMonth 
                  ? "bg-white/[0.02] border-white/5" 
                  : "bg-transparent border-transparent opacity-30",
                isToday && "border-gx-cyan/30 bg-gx-cyan/5 shadow-[0_0_20px_rgba(0,240,255,0.05)]"
              )}
            >
              <div className="flex items-center justify-between">
                <span 
                  onClick={(e) => {
                    e.stopPropagation(); // 阻止触发格子的 onGridClick
                    onDateClick?.(cell.date);
                  }}
                  className={cn(
                    "text-lg font-mono font-bold cursor-pointer hover:scale-110 transition-transform hover:text-gx-cyan",
                    isToday ? "text-gx-cyan" : "text-white"
                  )}
                >
                  {cell.day}
                </span>
                {isToday && (
                  <div className="w-1.5 h-1.5 rounded-full bg-gx-cyan shadow-[0_0_10px_rgba(0,240,255,0.8)] animate-pulse" />
                )}
              </div>
              
              {/* 聚合员工点阵指示器 */}
              <div className="flex-1 flex flex-wrap content-start gap-1.5 pt-2">
                {/* 沙盒模式：使用确定性伪随机展示聚合视觉 */}
                {filteredResources.map((res) => {
                  const pseudoRandom = (res.id.charCodeAt(0) + cell.day) % 3;
                  const hasBooking = pseudoRandom === 0;

                  if (!hasBooking) return null;

                  return (
                    <div 
                      key={res.id}
                      title={res.name}
                      className="w-2 h-2 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                      style={{ 
                        backgroundColor: res.themeColor || '#fff', 
                        boxShadow: `0 0 8px ${res.themeColor || '#fff'}80` 
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
