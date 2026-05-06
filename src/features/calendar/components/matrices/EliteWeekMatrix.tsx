"use client";

import React, { useMemo, useRef, UIEvent } from "react";
import { cn } from "@/utils/cn";
import { IndustryType, IndustryDNA, MatrixResource } from "../../types";
import { OperatingHour, ShopOperatingConfig, resolveOperatingHours } from "../IndustryCalendar";
import { useVisualSettings, CYBER_COLOR_DICTIONARY } from "@/hooks/useVisualSettings";

export interface EliteWeekMatrixProps {
 industry: IndustryType;
 dna: IndustryDNA;
 resources: MatrixResource[];
 selectedStaffIds: string[];
 operatingHours: ShopOperatingConfig | OperatingHour[];
 onGridClick?: (resourceId?: string, time?: string, dateStr?: string) => void;
 onDateClick?: (date: Date) => void;
 onBookingClick?: (booking: any) => void;
 currentDate: Date;
 bookings?: any[];
}

const DAYS_OF_WEEK = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export const EliteWeekMatrix = ({ resources, selectedStaffIds, operatingHours, onGridClick, onDateClick, currentDate, bookings = [], onBookingClick }: EliteWeekMatrixProps) => {
 const [isMounted, setIsMounted] = React.useState(false);
 React.useEffect(() => setIsMounted(true), []);
 const currentHour = isMounted ? new Date().getHours() : -1;
 const { settings: visualSettings } = useVisualSettings();

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
 bookings.forEach(booking => {
 // 周视图简化处理：只要有订单，就把它占用的时间段撑开（不严格过滤具体是哪一天，保证整个星期的 Y 轴坐标系统一）
 if (booking.startTime && booking.duration && booking.status !== 'VOID') {
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
 }, [operatingHours, bookings, weekDates]);

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
 className="flex flex-col items-center justify-center relative group cursor-pointer "
 onClick={() => onDateClick?.(date)}
 >
 {isToday && <div className={`absolute top-0 left-0 right-0 h-1 ${visualSettings.timelineColorTheme === 'blackgold' ? "bg-[#8B7355]" : "bg-[#FDF5E6]"}`} />}
 <span className={cn("text-[11px] uppercase tracking-widest ", isToday ? `${visualSettings.timelineColorTheme === 'blackgold' ? "text-[#8B7355]" : "text-[#FDF5E6]"}` : `text-white `)}>
 {DAYS_OF_WEEK[idx]}
 </span>
 <span className={cn("text-[20px] mt-1 text-white ")}>
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
 " text-[15px] flex items-center justify-center font-normal tracking-normal tabular-nums",
 visualSettings.timelineColorTheme !== 'purewhite' && visualSettings.timelineColorTheme !== 'blackgold' && "mix-blend-screen",
 slot.hour === currentHour && "scale-110",
 slot.hour !== currentHour && ""
 )} style={slot.hour !== currentHour ? { textShadow: visualSettings.timelineColorTheme === 'purewhite' ? 'none' : visualSettings.timelineColorTheme === 'blackgold' ? '0px 1px 0px rgba(255,255,255,0.8)' : `0 0 15px ${(CYBER_COLOR_DICTIONARY as any)[visualSettings.timelineColorTheme]?.hex || '#fff'}80` } : {}}>
 <span className={cn(slot.hour === currentHour ? `${visualSettings.timelineColorTheme === 'blackgold' ? "text-[#8B7355]" : "text-[#FDF5E6]"}` : CYBER_COLOR_DICTIONARY[visualSettings.timelineColorTheme].className)}>
 {slot.hour.toString().padStart(2, '0')}
 </span>
 <span className={cn("text-[11px] mx-[3px] ", slot.hour === currentHour ? `${visualSettings.timelineColorTheme === 'blackgold' ? "text-[#8B7355]" : "text-[#FDF5E6]"} ` : visualSettings.timelineColorTheme === 'blackgold' ? "text-black" : ` ${CYBER_COLOR_DICTIONARY[visualSettings.timelineColorTheme].className.replace('text-transparent bg-clip-text', '')}`)} style={{ color: slot.hour !== currentHour && visualSettings.timelineColorTheme !== 'blackgold' ? (CYBER_COLOR_DICTIONARY as any)[visualSettings.timelineColorTheme]?.hex : undefined }}>:</span>
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
 className="flex-1 overflow-x-hidden overflow-y-auto relative no-scrollbar"
 >
 <div className="min-w-fit flex flex-col h-full">
 {/* 矩阵主体同步修改底部留白为 pb-16 */}
 <div className="relative pb-16">
 {/* --- 底层：网格背景 (Y 轴物理时间轨道) --- */}
 {timeSlots.map((slot) => (
 <div 
 key={slot.hour} 
 className="grid h-16 relative border-b border-white/5"
 style={{ gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))' }}
 >
 {weekDates.map((_date, dayIdx) => {
 const dateStr = _date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
 return (
 <div 
 key={dayIdx} 
 className="w-full h-full border-r border-white/5 cursor-pointer"
 onClick={() => onGridClick && onGridClick(undefined, `${String(slot.hour).padStart(2, '0')}:00`, dateStr)}
 />
 );
 })}
 </div>
 ))}
 
 {/* --- 顶层：基于真实时间的物理层叠线框阵列 (绝对透明，只留发光边) --- */}
 <div className="absolute top-0 left-0 right-0 bottom-16 grid pointer-events-none" style={{ gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))' }}>
 {weekDates.map((date, dayIdx) => {
 const dateStr = date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
 
 // 过滤出当天的所有选中员工的有效订单
 const dayBookings = bookings.filter(b => {
 return b.date?.split('T')[0] === dateStr && b.resourceId && selectedStaffIds.includes(b.resourceId) && b.status !== 'VOID';
 });
 
 // 【子列隔离算法】：为每个被选中的员工分配一个独立的子轨道 (Sub-column)
 const staffCount = selectedStaffIds.length || 1;
 const columnWidthPct = 100 / staffCount;
 
 return (
 <div key={dayIdx} className="relative w-full h-full">
 {selectedStaffIds.map((staffId, staffIndex) => {
 // 取出该员工在当天的所有订单
 const staffBookings = dayBookings.filter(b => b.resourceId === staffId);
 
 // 【员工内部的时间重叠冲突检测】：处理同一个员工自己时间打架的情况
 const processedBookings = staffBookings.map((b) => {
   const [h, m] = (b.startTime || "00:00").split(':').map(Number);
   const startMins = h * 60 + m;
   const endMins = startMins + (b.duration || 0);
   return { ...b, startMins, endMins, overlapIndex: 0, maxOverlaps: 1 };
 });
 
 processedBookings.sort((a, b) => a.startMins - b.startMins);
 
 const groups: typeof processedBookings[] = [];
 processedBookings.forEach((b) => {
   let placed = false;
   for (const group of groups) {
     const hasOverlap = group.some(gb => 
       (b.startMins >= gb.startMins && b.startMins < gb.endMins) ||
       (b.endMins > gb.startMins && b.endMins <= gb.endMins) ||
       (b.startMins <= gb.startMins && b.endMins >= gb.endMins)
     );
     if (hasOverlap) {
       group.push(b);
       b.overlapIndex = group.length - 1;
       placed = true;
       break;
     }
   }
   if (!placed) {
     groups.push([b]);
     b.overlapIndex = 0;
   }
 });
 
 groups.forEach(group => {
   group.forEach(b => {
     b.maxOverlaps = group.length;
   });
 });

 return (
 <React.Fragment key={staffId}>
 {processedBookings.map((booking, bIdx) => {
 if (!booking.startTime || !booking.duration) return null;
 
 const [startHour, startMinute] = booking.startTime.split(':').map(Number);
 const duration = booking.duration;
 
 // Y轴物理时间坐标计算法则：严格对齐 timeSlots
 const firstHour = timeSlots[0]?.hour || 9;
 const hourIndex = timeSlots.findIndex(s => s.hour === startHour);
 
 let top = 0;
 if (hourIndex !== -1) {
 top = hourIndex * 64 + (startMinute / 60) * 64;
 } else {
 top = (startHour - firstHour) * 64 + (startMinute / 60) * 64;
 }
 
 const height = (duration / 60) * 64;
 
 const resource = resources.find(r => r.id === booking.resourceId);
 const color = resource?.themeColor || '#fff';
 
 // 【X轴子列与冲突避让联合计算法则】
 // 1. 先将总宽度按员工平分
 const baseLeftPct = staffIndex * columnWidthPct;
 // 2. 在分给该员工的这块自留地里，如果有重叠，再进行内部分割
 const innerWidthPct = columnWidthPct / booking.maxOverlaps;
 const finalLeftPct = baseLeftPct + (booking.overlapIndex * innerWidthPct);
 
 return (
 <div
 key={`${booking.id || bIdx}`}
 className="absolute rounded border-[1.5px] bg-transparent pointer-events-auto cursor-pointer transition-all duration-300"
 style={{
 top: `${top}px`,
 height: `${height}px`,
 left: `${finalLeftPct}%`,
 width: `${innerWidthPct}%`,
 borderColor: color,
 backgroundColor: 'rgba(0, 0, 0, 0.45)',
 boxShadow: `0 0 12px ${color}50, inset 0 0 6px ${color}30`,
 zIndex: 10 + booking.overlapIndex
 }}
 onClick={() => {
 if (onBookingClick) {
 onBookingClick(booking);
 }
 }}
 />
 );
 })}
 </React.Fragment>
 );
 })}
 </div>
 );
 })}
 </div>
 
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};
