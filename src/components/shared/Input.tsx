"use client";

import { cn } from "@/utils/cn";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * GX 系统通用输入框
 * 极致极简赛博风格
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-xs font-mono text-white/40 uppercase tracking-widest ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={cn(
              "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 outline-none transition-all duration-300 focus:border-gx-cyan/50 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(0,242,255,0.1)] disabled:opacity-50",
              error && "border-gx-red/50 focus:border-gx-red/50 focus:shadow-[0_0_15px_rgba(255,0,60,0.1)]",
              className
            )}
            {...props}
          />
          {error && (
            <span className="text-[10px] text-gx-red mt-1 ml-1 block animate-pulse">
              {error}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = "Input";
