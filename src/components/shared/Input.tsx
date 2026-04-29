"use client";

import { cn } from "@/utils/cn";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
 label?: string;
 error?: string;
 variant?: 'default' | 'ghost';
}

/**
 * GX 系统通用输入框
 * 极致极简赛博风格
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
 ({ className, label, error, variant = 'default', ...props }, ref) => {
 return (
 <div className="space-y-1.5 w-full">
 {label && (
 <label className="text-xs text-white uppercase tracking-widest ml-1">
 {label}
 </label>
 )}
 <div className="relative">
 <input
 ref={ref}
 className={cn(
 "w-full px-4 py-3 text-white placeholder:text-white outline-none disabled:opacity-50",
 variant === 'default' && "bg-white/5 border border-white/10 rounded-xl focus:bg-white/10 ",
 variant === 'ghost' && "bg-white/[0.02] border-b border-white/20 rounded-none px-2 focus:bg-white/5 ",
 error && "border-gx-red/50 focus:border-gx-red/50 ",
 className
 )}
 {...props}
 />
 {error && (
 <span className="text-[11px] text-gx-red mt-1 ml-1 block ">
 {error}
 </span>
 )}
 </div>
 </div>
 );
 }
);

Input.displayName = "Input";
