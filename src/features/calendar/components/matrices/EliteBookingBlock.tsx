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
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * EliteBookingBlock (液态玻璃预约块) - 极简降维重构版
 * 采用物理引擎反馈，极光呼吸灯，降维打击级质感
 */
export const EliteBookingBlock = ({ title, client, color, accent, height, isTiny = false, onClick }: EliteBookingBlockProps) => {
  // Check if the color is a hex code
  const isHexColor = color?.startsWith('#');

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ 
        y: -4, 
        scale: 1.02,
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
      }}
      transition={{ 
        type: "spring", 
        stiffness: 260, 
        damping: 20 
      }}
      className={cn(
        "absolute inset-x-1.5 top-0 z-10 rounded-2xl border shadow-2xl backdrop-blur-3xl flex cursor-pointer group overflow-hidden",
        isTiny ? "p-1 items-center justify-center" : "p-3 flex-col justify-between",
        !isHexColor && isActiveBgColor(accent || ''),
        !isHexColor && isActiveBorderColor(accent || '')
      )}
      style={{
        height: height === "100%" ? "100%" : height,
        ...(isHexColor ? { 
          backgroundColor: `${color}1A`, // 10% opacity for background
          borderColor: `${color}4D`, // 30% opacity for border
        } : {})
      }}
    >
      {/* 内部极光背景 (Aurora Glow) */}
      <div 
        className={cn(
          "absolute -top-1/2 -left-1/2 w-full h-full opacity-10 blur-[40px] rounded-full animate-pulse pointer-events-none",
          !isHexColor && (accent === 'purple' ? 'bg-gx-purple' : accent === 'cyan' ? 'bg-gx-cyan' : 'bg-orange-500')
        )}
        style={isHexColor ? { backgroundColor: color } : {}}
      />

      {isTiny ? (
        // --- 极限空间：单行居中排版 ---
        <div className="flex items-center justify-center gap-2 relative z-10 w-full truncate px-2">
          <span 
            className={cn("text-xs font-black uppercase tracking-tighter shrink-0", !isHexColor && color)}
            style={isHexColor ? { color: color } : {}}
          >
            {title}
          </span>
          {client && (
            <>
              <span className="text-white/40 text-[10px] shrink-0">-</span>
              <span className="text-xs font-black text-white/90 tracking-wider truncate">
                {client}
              </span>
            </>
          )}
          {/* 右上角绝对定位的小圆点 */}
          <div 
            className={cn(
              "absolute top-0 right-0 w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_10px_currentColor]", 
              !isHexColor && color.replace('text-', 'bg-')
            )}
            style={isHexColor ? { backgroundColor: color, color: color } : {}}
          />
        </div>
      ) : (
        // --- 充足空间：两行经典排版 ---
        <>
          {/* 第一行：服务项目 + 员工小圆点 */}
          <div className="flex items-start justify-between gap-1 relative z-10">
            <span 
              className={cn("text-xs font-black uppercase tracking-tighter leading-tight break-words line-clamp-2", !isHexColor && color)}
              style={isHexColor ? { color: color } : {}}
            >
              {title}
            </span>
            <div 
              className={cn(
                "w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor] shrink-0 mt-0.5", 
                !isHexColor && color.replace('text-', 'bg-')
              )}
              style={isHexColor ? { backgroundColor: color, color: color } : {}}
            />
          </div>
          
          {/* 第二行：极简客户标识 (底端对齐) */}
          {client && (
            <div className="flex items-center mt-auto relative z-10">
              <span className="text-sm font-black text-white/90 tracking-wider truncate w-full">
                {client}
              </span>
            </div>
          )}
        </>
      )}

      {/* 底部装饰线 */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 h-1 opacity-50 pointer-events-none",
          !isHexColor && (accent === 'purple' ? 'bg-gx-purple' : accent === 'cyan' ? 'bg-gx-cyan' : 'bg-orange-500')
        )} 
        style={isHexColor ? { backgroundColor: color } : {}}
      />
    </motion.div>
  );
};
