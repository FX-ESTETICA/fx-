"use client";

import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> {
  variant?: "cyan" | "purple" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  glow?: boolean;
  isLoading?: boolean;
}

/**
 * GX 系统通用按钮
 * 支持赛博发光与玻璃质感
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "cyan", size = "md", glow = true, isLoading = false, children, ...props }, ref) => {
    const variants = {
      cyan: "bg-gx-cyan/20 border-gx-cyan/50 text-gx-cyan hover:bg-gx-cyan/30 shadow-[0_0_15px_rgba(0,242,255,0.2)]",
      purple: "bg-gx-purple/20 border-gx-purple/50 text-gx-purple hover:bg-gx-purple/30 shadow-[0_0_15px_rgba(188,0,255,0.2)]",
      ghost: "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white",
      danger: "bg-gx-red/20 border-gx-red/50 text-gx-red hover:bg-gx-red/30 shadow-[0_0_15px_rgba(255,0,60,0.2)]",
    };

    const sizes = {
      sm: "px-4 py-1.5 text-sm",
      md: "px-6 py-2.5 text-base",
      lg: "px-8 py-3.5 text-lg",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={isLoading ? {} : { scale: 1.02 }}
        whileTap={isLoading ? {} : { scale: 0.98 }}
        disabled={isLoading || props.disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-xl border font-medium transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          glow && !isLoading && "hover:shadow-[0_0_25px_currentColor]",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
          </div>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
