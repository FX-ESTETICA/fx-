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
    danger: "border-red-500/30 ",
    none: "border-white/10",
  };

  return (
    <motion.div
      initial={false}
      whileHover={hoverGlow ? { scale: 1.01, transition: { duration: 0.2 } } : {}}
      className={cn(
        "glass-effect rounded-2xl p-6 transition-all duration-300",
        "", // 视觉对齐：移动端恢复毛玻璃效果
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
