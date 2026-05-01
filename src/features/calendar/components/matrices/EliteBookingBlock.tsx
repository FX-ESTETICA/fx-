"use client";

import { motion, useDragControls } from "framer-motion";
import { cn } from "@/utils/cn";
import { isActiveBgColor, isActiveBorderColor } from "./utils";
import React, { useRef, useEffect } from "react";

export interface EliteBookingBlockProps {
 title: string;
 time: string; // 废弃但为兼容性保留
 client: string; // 现在传入的是处理过的极简 ID
 color: string; // Hex color string (e.g., "#00f0ff") or tailwind class
 accent?: string; // Optional now, since we use exact hex color
 height: string | number; // 允许传入数字或字符串
 isTiny?: boolean; // 新增：由父组件基于 duration 计算传入的绝对静态标识
 isMicro?: boolean; // 新增：极限微缩态（25分钟及以下），砸碎内边距
 isPending?: boolean; // 新增：是否是待确认预约（触发跑马灯动画）
 isPast?: boolean; // 新增：是否已过时（跨过红线）
 isCheckedOut?: boolean; // 新增：是否已结账（生命周期终结）
 isNoShow?: boolean; // 新增：是否爽约（幽灵灰降维）
 delayMins?: number; // 新增：挤压延误时间，若大于 0，渲染红色沙漏警示
 onClick?: (e: React.MouseEvent) => void;
 onDragStart?: () => void;
 onDrag?: (e: any, info: any) => void;
 onDragEnd?: (e: any, info: any) => void;
 isReadOnly?: boolean;
}

/**
 * EliteBookingBlock (液态玻璃预约块) - 极简降维重构版
 * 采用物理引擎反馈，极光呼吸灯，降维打击级质感
 */
export const EliteBookingBlock = ({ 
 title, client, color, accent, height, isTiny = false, isMicro = false, isPending = false,
 isPast = false, isCheckedOut = false, isNoShow = false, delayMins = 0,
 onClick, onDragStart, onDrag, onDragEnd, isReadOnly 
}: EliteBookingBlockProps) => {
 // Check if the color is a hex code
 const isHexColor = color?.startsWith('#');
 const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 const isDraggingRef = useRef(false);
 const dragStartYRef = useRef(0);

 const handlePointerDown = (e: React.PointerEvent) => {
 if (isReadOnly) return;
 dragStartYRef.current = e.clientY;
 e.currentTarget.setPointerCapture(e.pointerId); // 捕获指针，防止移出元素后丢失事件
 dragTimeoutRef.current = setTimeout(() => {
 // 触发长按逻辑
 isDraggingRef.current = true;
 onDragStart?.();
 }, 300);
 };

 const handlePointerMove = (e: React.PointerEvent) => {
 if (isDraggingRef.current && onDrag) {
 // 模拟 info.offset.y
 onDrag(e, { offset: { y: e.clientY - dragStartYRef.current } });
 }
 };

 const handlePointerUp = (e: React.PointerEvent) => {
 e.currentTarget.releasePointerCapture(e.pointerId);
 if (dragTimeoutRef.current) {
 clearTimeout(dragTimeoutRef.current);
 dragTimeoutRef.current = null;
 }
 if (isDraggingRef.current && onDragEnd) {
 onDragEnd(e, { offset: { y: e.clientY - dragStartYRef.current } });
 setTimeout(() => {
 isDraggingRef.current = false;
 }, 50);
 }
 };

 const handleClick = (e: React.MouseEvent) => {
 if (isDraggingRef.current) {
 e.stopPropagation();
 return;
 }
 onClick?.(e);
 };

 useEffect(() => {
 return () => {
 if (dragTimeoutRef.current) {
 clearTimeout(dragTimeoutRef.current);
 }
 };
 }, []);

 // 终极视觉状态判定法则
 // 1. isCheckedOut (已结账): 彻底隐入星空，透明底色，极暗边框
 // 2. isPast (跨过红线/进行中): 能量抽干，透明底色，保留发光特征色边框
 // 3. 默认 (未来/待服务): 填充渐变特征色，发光边框
 // 4. isNoShow (爽约): 彻底隐入星空，幽灵灰边框，文字降维
 
 const getBackgroundColor = () => {
    if (isPending) return '';
    if (isCheckedOut || isPast || isNoShow) return 'transparent';
    // 废弃原来的 `${color}40` (25% opacity) 的半透明底色，直接使用实色
    return isHexColor ? color : ''; 
  };

 const getBorderColor = () => {
    if (isPending) return 'transparent';
    if (isNoShow) return 'rgba(255, 255, 255, 0.15)'; // 幽灵灰边框
    if (isCheckedOut) return 'rgba(255, 255, 255, 0.05)'; // 幽灵灰极暗边框
    // 弱化整体外边框，仅作为结构辅助，不再抢戏 (15% 透明度)
    return isHexColor ? (isPast ? `${color}40` : `${color}26`) : ''; 
  };

 const getBoxShadow = () => {
 if (isPending) return '';
 if (isCheckedOut || isPast || isNoShow) return 'none'; // 已过时完全去除发光阴影，变成静态死线框
 return 'none'; // 彻底移除黑色阴影
 };

 return (
 <>
 {/* 跑马灯动画边框 (只有待确认状态才渲染) */}
 {isPending && (
 <div 
 className="absolute inset-x-1.5 top-0 z-[5] rounded p-[2px] pointer-events-none "
 style={{ height: height === "100%" ? "100%" : height }}
 >
 <div className="absolute inset-0 rounded bg-[linear-gradient(90deg,#ff0000,#ff7f00,#ffff00,#00ff00,#0000ff,#4b0082,#9400d3,#ff0000)] bg-[length:200%_auto] animate-[shimmer_2s_linear_infinite]" />
 </div>
 )}
 
 <motion.div
  onClick={handleClick}
  // 【纯数据驱动】：彻底废弃 framer-motion 的物理拖拽 (drag="y")
  // 利用 onPointerDown 和 onPointerMove 完全接管事件，本体只做原地半透明留影
  onPointerDown={handlePointerDown}
  onPointerMove={handlePointerMove}
  onPointerUp={handlePointerUp}
  onPointerCancel={handlePointerUp}
  className={cn(
          "absolute inset-x-1.5 top-0 z-10 rounded border flex cursor-pointer group overflow-hidden",
          isMicro ? "py-0 px-2 pl-[10px] items-center justify-start" : (isTiny ? "p-1 pl-[10px] items-center justify-start" : "p-3 pl-[12px] flex-col justify-start"),
          !isHexColor && !isCheckedOut && !isNoShow && !isPast && isActiveBgColor(accent || ''),
          !isHexColor && !isCheckedOut && !isNoShow && isActiveBorderColor(accent || ''),
          isPending && "border-transparent bg-black/60 m-[2px]" // 如果有跑马灯，缩小一圈并让自身边框透明
        )}
        style={{
          height: height === "100%" ? "100%" : (isPending && typeof height === 'number' ? height - 4 : height),
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          boxShadow: getBoxShadow(),
          backdropFilter: (isCheckedOut || isPast || isNoShow) ? "(0px)" : "(10px)", // 微弱磨砂
        }}
        title={`${title} - ${client}`} // 悬浮显示完整信息
      >
        {/* 内部极光背景 (Aurora Glow) - 已移除 ，改为静态极简底色以提升性能 */}
        {!isCheckedOut && !isPast && !isNoShow && (
 <div 
 className={cn(
 "absolute -top-1/2 -left-1/2 w-full h-full opacity-[0.03] rounded-full pointer-events-none",
 !isHexColor && (accent === 'purple' ? '' : accent === 'cyan' ? '' : 'bg-orange-500')
 )}
 style={isHexColor ? { backgroundColor: color } : {}}
 />
 )}

 {isMicro ? (
 // --- 极限微缩态 (15-25 分钟)：绝对左对齐，只有服务名称，超小字体，隐藏多余元素 ---
 <div className="flex items-center justify-start relative z-10 w-full truncate">
 <span 
 className={cn("text-[11px] leading-none font-medium antialiased tracking-widest uppercase shrink-0 text-white", (isCheckedOut || isNoShow) ? "" : "opacity-100")}
 >
 {title.replace(/ \+ /g, ' ')}
 </span>
 </div>
 ) : isTiny ? (
 // --- 紧凑态 (30-40 分钟)：单行左对齐排版 ---
 <div className="flex items-center justify-start gap-2 relative z-10 w-full truncate px-0">
 <span 
 className={cn("text-[11px] font-medium antialiased tracking-widest uppercase shrink-0 text-white", (isCheckedOut || isNoShow) ? "" : "opacity-100")}
 >
 {title.replace(/ \+ /g, ' ')}
 </span>
 </div>
 ) : (
 // --- 充足空间：左对齐排版 ---
 <>
 <div className="flex flex-col gap-1 relative z-10 w-full">
 <div className="flex justify-between items-start">
 <span 
 className={cn("text-[11px] font-medium antialiased tracking-widest uppercase leading-tight line-clamp-2 text-white", (isCheckedOut || isNoShow) ? "" : "opacity-100")}
 >
 {title.replace(/ \+ /g, ' ')}
 </span>
 {delayMins > 0 && !isCheckedOut && !isNoShow && (
 <div className="flex items-center justify-center bg-black/60 border border-white/30 px-1.5 rounded-sm shrink-0 ml-1 ">
 <span className="text-[11px] text-white font-medium antialiased tracking-wider">+{delayMins}m</span>
 </div>
 )}
 </div>
 </div>
 </>
 )}
 </motion.div>
 </>
 );
};
