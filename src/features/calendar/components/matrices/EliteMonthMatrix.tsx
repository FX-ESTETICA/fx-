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
 sandboxBookings?: any[]; // 新增 sandboxBookings 属性，允许传入真实数据
 onGridClick?: () => void;
 onDateClick?: (date: Date) => void;
}

const DAYS_OF_WEEK = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export const EliteMonthMatrix = ({ resources, selectedStaffIds, currentDate, sandboxBookings = [], onGridClick, onDateClick }: EliteMonthMatrixProps) => {
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
 <span className="text-[11px] uppercase tracking-widest text-white">
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
 "rounded-2xl border p-3 flex flex-col gap-2 cursor-pointer group ",
 cell.isCurrentMonth 
 ? "bg-white/[0.02] border-white/5" 
 : "bg-transparent border-transparent ",
 isToday && "border-[#FDF5E6]/30 bg-[#FDF5E6]/5"
 )}
 >
 <div className="flex items-center justify-between">
 <span 
 onClick={(e) => {
 e.stopPropagation(); // 阻止触发格子的 onGridClick
 onDateClick?.(cell.date);
 }}
 className={cn(
 "text-lg cursor-pointer ",
 isToday ? "text-[#FDF5E6]" : "text-white"
 )}
 >
 {cell.day}
 </span>
 {isToday && (
 <div className="w-1.5 h-1.5 rounded-full bg-[#FDF5E6] " />
 )}
 </div>
 
 {/* 聚合员工点阵指示器 */}
 <div className="flex-1 flex flex-wrap content-start gap-1.5 pt-2">
 {/* 基于真实订单数据渲染聚合视觉 */}
 {filteredResources.map((res) => {
 const dateStr = cell.date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
 
 // 查找该员工在该天是否有真实的订单
 const hasRealBooking = sandboxBookings.some(b => b.resourceId === res.id && b.date === dateStr);

 if (!hasRealBooking) return null;

 return (
 <div 
 key={res.id}
 title={res.name}
 className="w-2 h-2 rounded-full "
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
