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

 {/* 底部：聚合状态指示器 (热力大数字) */}
 <div className="flex flex-col items-center justify-center w-full">
 {/* 基于全店真实订单数据渲染热力数字 */}
 {(() => {
 const dateStr = cell.date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
 
 // 【商业级数据脱水法则：防膨胀与人员过滤】
 // 1. 只打捞当前日期、且状态有效、且在当前选中员工列表里的订单
 const validBookings = sandboxBookings.filter(b => {
   return b.date === dateStr && b.status !== 'VOID' && b.resourceId && selectedStaffIds.includes(b.resourceId);
 });

 // 2. 连单去重（masterOrderId 合并计算）：同一个客人做的 3 个项目（3条记录），只能算作 1 单客流
 const uniqueOrders = new Set<string>();
 let realBookingsCount = 0;

 validBookings.forEach(b => {
   if (b.masterOrderId) {
     if (!uniqueOrders.has(b.masterOrderId)) {
       uniqueOrders.add(b.masterOrderId);
       realBookingsCount++;
     }
   } else {
     realBookingsCount++;
   }
 });

 if (realBookingsCount === 0) return null;

 // 绝对控制法则：强制使用十六进制内联颜色，粉碎一切 CSS 继承冲突
 // 1-10: 绿色 (平稳)
 // 11-25: 橙色 (繁忙)
 // 26+: 红色 (爆满预警)
 let heatColorHex = '#059669'; // 暗灰绿
 if (realBookingsCount >= 11 && realBookingsCount <= 25) {
 heatColorHex = '#D97706'; // 暗灰橙
 } else if (realBookingsCount >= 26) {
 heatColorHex = '#DC2626'; // 暗灰红
 }

 // 当不是当月日期时，让热力数字变成幽灵灰
 const finalColor = cell.isCurrentMonth ? heatColorHex : 'rgba(0,0,0,0.15)';

 return (
 <div className="flex items-center justify-center relative w-full">
 {/* 【防全局污染】：强制写入 mix-blend-normal 抵御 coreblack 主题的颜色吸收，同时增加 style 的 absolute 权限 */}
 <span 
 className="text-[32px] md:text-[40px] tracking-tighter tabular-nums font-light transition-all duration-300 leading-none mix-blend-normal"
 style={{ 
   color: finalColor,
   // 在 React inline style 中无法直接写 !important，我们通过 textShadow 和 WebkitTextFillColor 进行物理级覆盖
   WebkitTextFillColor: finalColor,
   textShadow: 'none'
 }}
 >
 {realBookingsCount}
 </span>
 </div>
 );
 })()}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
};
