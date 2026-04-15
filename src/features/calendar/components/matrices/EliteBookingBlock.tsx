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
  isPending?: boolean; // 新增：是否是待确认预约（触发跑马灯动画）
  isPast?: boolean; // 新增：是否已过时（跨过红线）
  isCheckedOut?: boolean; // 新增：是否已结账（生命周期终结）
  isNoShow?: boolean; // 新增：是否爽约（幽灵灰降维）
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
  title, client, color, accent, height, isTiny = false, isPending = false,
  isPast = false, isCheckedOut = false, isNoShow = false,
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
    return isHexColor ? `${color}` : ''; // 100% opacity for background (完全不透明实心色块)
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
    return '0 10px 30px rgba(0,0,0,0.2)'; // 恢复一点阴影
  };

  return (
    <>
      {/* 跑马灯动画边框 (只有待确认状态才渲染) */}
      {isPending && (
        <div 
          className="absolute inset-x-1.5 top-0 z-[5] rounded-2xl p-[2px] pointer-events-none opacity-80"
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
          isTiny ? "p-1 items-center justify-center" : "p-3 flex-col justify-between",
          !isHexColor && !isCheckedOut && !isNoShow && !isPast && isActiveBgColor(accent || ''),
          !isHexColor && !isCheckedOut && !isNoShow && isActiveBorderColor(accent || ''),
          isPending && "border-transparent bg-black/60 m-[2px]" // 如果有跑马灯，缩小一圈并让自身边框透明
        )}
        style={{
          height: height === "100%" ? "100%" : (isPending && typeof height === 'number' ? height - 4 : height),
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          boxShadow: getBoxShadow(),
          backdropFilter: (isCheckedOut || isPast || isNoShow) ? "blur(0px)" : "blur(30px)", // 已过时也彻底移除毛玻璃
        }}
      >
      {/* 内部极光背景 (Aurora Glow) - 已移除 animate-pulse，改为静态极简底色以提升性能 */}
      {!isCheckedOut && !isPast && !isNoShow && (
        <div 
          className={cn(
            "absolute -top-1/2 -left-1/2 w-full h-full opacity-[0.03] rounded-full pointer-events-none",
            !isHexColor && (accent === 'purple' ? 'bg-gx-purple' : accent === 'cyan' ? 'bg-gx-cyan' : 'bg-orange-500')
          )}
          style={isHexColor ? { backgroundColor: color } : {}}
        />
      )}

      {isTiny ? (
        // --- 极限空间：单行居中排版 ---
        <div className="flex items-center justify-center gap-2 relative z-10 w-full truncate px-2">
          <span 
            className={cn("text-xs font-black uppercase tracking-tighter shrink-0 text-white", (isCheckedOut || isNoShow) ? "opacity-40" : "opacity-100")}
          >
            {title}
          </span>
          {client && (
            <>
              <span className="text-white/40 text-[10px] shrink-0">-</span>
              <span className={cn("text-xs font-black tracking-wider truncate", (isCheckedOut || isNoShow) ? "text-white/40" : "text-white/90")}>
                {client}
              </span>
            </>
          )}
          {/* 右上角绝对定位的小圆点 (已过时则不再显示) - 已移除高频闪烁 animate-pulse */}
          {!isCheckedOut && !isPast && !isNoShow && (
            <div 
              className={cn(
                "absolute top-0 right-0 w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]", 
                !isHexColor && color.replace('text-', 'bg-')
              )}
              style={isHexColor ? { backgroundColor: color, color: color } : {}}
            />
          )}
        </div>
      ) : (
        // --- 充足空间：两行经典排版 ---
        <>
          <div className="flex flex-col gap-1 relative z-10 w-full">
            <span 
              className={cn("text-xs md:text-sm font-black uppercase tracking-tighter leading-none line-clamp-2 text-white", (isCheckedOut || isNoShow) ? "opacity-40" : "opacity-100")}
            >
              {title}
            </span>
          </div>

          <div className="flex items-center justify-between mt-1 relative z-10 w-full">
            <span className={cn("text-[10px] font-black tracking-wider truncate max-w-[60%]", (isCheckedOut || isNoShow) ? "text-white/40" : "text-white/90")}>
              {client}
            </span>
            {/* 右下角绝对定位的小圆点 (已过时则不再显示) - 已移除高频闪烁 animate-pulse */}
            {!isCheckedOut && !isPast && !isNoShow && (
              <div 
                className={cn(
                  "w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]", 
                  !isHexColor && color.replace('text-', 'bg-')
                )}
                style={isHexColor ? { backgroundColor: color, color: color } : {}}
              />
            )}
          </div>
        </>
      )}
    </motion.div>
    </>
  );
};
