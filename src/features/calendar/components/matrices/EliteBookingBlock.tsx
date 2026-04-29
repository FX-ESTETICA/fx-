"use client";

import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { isActiveBgColor, isActiveBorderColor } from "./utils";

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

 // 终极视觉状态判定法则
 // 1. isCheckedOut (已结账): 彻底隐入星空，透明底色，极暗边框
 // 2. isPast (跨过红线/进行中): 能量抽干，透明底色，保留发光特征色边框
 // 3. 默认 (未来/待服务): 填充渐变特征色，发光边框
 // 4. isNoShow (爽约): 彻底隐入星空，幽灵灰边框，文字降维
 
 const getBackgroundColor = () => {
 if (isPending) return '';
 if (isCheckedOut || isPast || isNoShow) return 'transparent';
 return isHexColor ? `${color}CC` : ''; // 80% opacity for background
 };

 const getBorderColor = () => {
 if (isPending) return 'transparent';
 if (isNoShow) return 'rgba(255, 255, 255, 0.15)'; // 幽灵灰边框
 if (isCheckedOut) return 'rgba(255, 255, 255, 0.05)'; // 幽灵灰极暗边框
 return isHexColor ? (isPast ? `${color}80` : `${color}80`) : ''; // 边框亮度提升至 50% (更清晰)
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
 className="absolute inset-x-1.5 top-0 z-[5] rounded-2xl p-[2px] pointer-events-none "
 style={{ height: height === "100%" ? "100%" : height }}
 >
 <div className="absolute inset-0 rounded-2xl bg-[linear-gradient(90deg,#ff0000,#ff7f00,#ffff00,#00ff00,#0000ff,#4b0082,#9400d3,#ff0000)] bg-[length:200%_auto] animate-[shimmer_2s_linear_infinite]" />
 </div>
 )}
 
 <motion.div
 onClick={onClick}
 drag={!isReadOnly}
 dragSnapToOrigin // 松手自动弹回原位
 onDragStart={onDragStart}
 onDrag={onDrag}
 onDragEnd={onDragEnd}
 className={cn(
 "absolute inset-x-1.5 top-0 z-10 rounded-2xl border flex cursor-pointer group overflow-hidden",
 isMicro ? "py-0 px-1.5 items-center justify-center" : (isTiny ? "p-1 items-center justify-center" : "p-3 flex-col justify-between"),
 !isHexColor && !isCheckedOut && !isNoShow && !isPast && isActiveBgColor(accent || ''),
 !isHexColor && !isCheckedOut && !isNoShow && isActiveBorderColor(accent || ''),
 isPending && "border-transparent bg-black/60 m-[2px]" // 如果有跑马灯，缩小一圈并让自身边框透明
 )}
 style={{
 height: height === "100%" ? "100%" : (isPending && typeof height === 'number' ? height - 4 : height),
 backgroundColor: getBackgroundColor(),
 borderColor: getBorderColor(),
 boxShadow: getBoxShadow(),
 backdropFilter: (isCheckedOut || isPast || isNoShow) ? "(0px)" : "(30px)", // 已过时也彻底移除毛玻璃
 }}
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
 // --- 极限微缩态 (15-25 分钟)：绝对居中，只有服务名称，超小字体，隐藏多余元素 ---
 <div className="flex items-center justify-center relative z-10 w-full truncate">
 <span 
 className={cn("text-[11px] leading-none font-medium antialiased tracking-widest uppercase shrink-0 text-white", (isCheckedOut || isNoShow) ? "" : "opacity-100")}
 >
 {title}
 </span>
 </div>
 ) : isTiny ? (
 // --- 紧凑态 (30-40 分钟)：单行居中排版 ---
 <div className="flex items-center justify-center gap-2 relative z-10 w-full truncate px-2">
 <span 
 className={cn("text-[11px] font-medium antialiased tracking-widest uppercase shrink-0 text-white", (isCheckedOut || isNoShow) ? "" : "opacity-100")}
 >
 {title}
 </span>
 {client && (
 <>
 <span className="text-white text-[11px] shrink-0">-</span>
 <span className={cn("text-[11px] tracking-widest antialiased truncate", (isCheckedOut || isNoShow) ? "text-white" : "text-white")}>
 {client}
 </span>
 </>
 )}
 {/* 右上角绝对定位的小圆点已根据极简法则移除 */}
 </div>
 ) : (
 // --- 充足空间：两行经典排版 ---
 <>
 <div className="flex flex-col gap-1 relative z-10 w-full">
 <div className="flex justify-between items-start">
 <span 
 className={cn("text-[11px] font-medium antialiased tracking-widest uppercase leading-tight line-clamp-2 text-white", (isCheckedOut || isNoShow) ? "" : "opacity-100")}
 >
 {title}
 </span>
 {delayMins > 0 && !isCheckedOut && !isNoShow && (
 <div className="flex items-center justify-center bg-black/60 border border-white/30 px-1.5 rounded-sm shrink-0 ml-1 ">
 <span className="text-[11px] text-white font-medium antialiased tracking-wider">+{delayMins}m</span>
 </div>
 )}
 </div>
 </div>

 <div className="flex items-center justify-between mt-1 relative z-10 w-full">
 <span className={cn("text-[11px] tracking-widest antialiased truncate max-w-[60%]", (isCheckedOut || isNoShow) ? "text-white" : "text-white")}>
 {client}
 </span>
 {/* 右下角绝对定位的小圆点已根据极简法则移除 */}
 </div>
 </>
 )}
 </motion.div>
 </>
 );
};
