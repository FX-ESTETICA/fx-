"use client";

import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { useVisualSettings } from "@/hooks/useVisualSettings";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> {
 variant?: "cyan" | "purple" | "ghost" | "danger" | "primary";
 size?: "sm" | "md" | "lg";
 glow?: boolean;
 isLoading?: boolean;
}

/**
 * GX 系统通用按钮
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
 ({ className, variant = "cyan", size = "md", glow = false, isLoading = false, children, ...props }, ref) => {
 const { settings } = useVisualSettings();
 const isLight = settings.frontendBgIndex !== 0;

 const basePrimary = isLight 
 ? "bg-black text-white hover:bg-black/80 border-black" 
 : "bg-white text-black hover:bg-white/80 border-white";

 const variants = {
 cyan: basePrimary,
 purple: basePrimary,
 primary: basePrimary,
 ghost: isLight 
 ? "bg-black/5 border-black/10 text-black hover:bg-black/10 hover:text-black" 
 : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white",
 danger: "bg-red-500/20 border-red-500/50 text-red-500 hover:bg-red-500/30 ",
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
 variants[variant] || variants.primary,
 sizes[size],
 className
 )}
 {...props}
 >
 {isLoading ? (
 <div className="flex items-center gap-2">
 <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
 <circle className="" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
 <path className="" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
