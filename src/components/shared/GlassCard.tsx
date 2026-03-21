"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: "cyan" | "purple" | "danger" | "none";
  hoverGlow?: boolean;
}

/**
 * GlassCard - GX 系统的核心视觉载体
 * 采用极致毛玻璃质感与赛博发光边框
 */
export const GlassCard = ({
  children,
  className,
  glowColor = "none",
  hoverGlow = true,
}: GlassCardProps) => {
  const glowStyles = {
    cyan: "glow-border-cyan",
    purple: "glow-border-purple",
    danger: "border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]",
    none: "border-white/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      whileHover={hoverGlow ? { scale: 1.01, transition: { duration: 0.2 } } : {}}
      className={cn(
        "glass-effect rounded-2xl p-6 transition-all duration-300",
        "backdrop-blur-xl", // 视觉对齐：移动端恢复毛玻璃效果
        "bg-white/5",
        glowStyles[glowColor],
        hoverGlow && "hover:bg-white/10",
        className
      )}
    >
      {children}
    </motion.div>
  );
};
