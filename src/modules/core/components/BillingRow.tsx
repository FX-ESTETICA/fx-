import React from 'react'
import { cn } from '@/lib/utils'

interface BillingRowProps {
  label: string;
  amount: string | number;
  colorClass?: string;
  dotColorClass?: string;
  onAmountClick?: () => void;
  isStaffRow?: boolean;
  isEditing?: boolean;
  presetPrices?: number[];
  onPresetClick?: (price: number) => void;
  onCustomClick?: () => void;
  showCustomKeypad?: boolean;
  className?: string;
}

/**
 * 原子组件：账单行
 * 渲染单个服务项目或员工金额
 */
export const BillingRow: React.FC<BillingRowProps> = ({
  label,
  amount,
  colorClass,
  dotColorClass = 'bg-white',
  onAmountClick,
  isStaffRow = false,
  isEditing = false,
  presetPrices = [],
  onPresetClick,
  onCustomClick,
  showCustomKeypad = false,
  className
}) => {
  return (
    <div className={cn("flex flex-col py-0.5 overflow-visible h-[34px] justify-center relative", className)}>
      <div className="flex items-center justify-between group/item overflow-visible">
        <div className="flex items-center gap-2">
          <div className={cn("w-1.5 h-1.5 rounded-full", dotColorClass)} />
          <span className={cn(
            "text-[12px] font-bold uppercase tracking-widest subpixel-antialiased truncate", 
            colorClass
          )}>
            {label}
          </span>
        </div>
        
        <div className="flex items-center gap-1 relative z-10 overflow-visible">
          <span className="text-[10px] font-bold text-white/40 shrink-0 subpixel-antialiased">¥</span>
          <div className="w-12 h-6 flex items-center justify-center transition-all">
            <input 
              type="text"
              readOnly
              value={amount}
              onClick={(e) => {
                e.stopPropagation();
                onAmountClick?.();
              }}
              placeholder={isStaffRow ? "0" : ""}
              className="w-full bg-transparent border-none p-0 text-center focus:outline-none text-[12px] font-bold text-white subpixel-antialiased cursor-pointer"
            />
          </div>
        </div>
      </div>

      {isEditing && !showCustomKeypad && (
        <div className="absolute left-0 right-0 top-full mt-1 flex flex-wrap items-center gap-1 z-[100] animate-in fade-in slide-in-from-top-1 duration-200 overflow-visible bg-transparent backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-2xl">
          {presetPrices.map((price) => (
            <button
              key={price}
              onClick={(e) => {
                e.stopPropagation();
                onPresetClick?.(price);
              }}
              className="px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/5 hover:bg-white/20 text-[9px] font-bold text-white transition-all shadow-lg"
            >
              {price}
            </button>
          ))}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCustomClick?.();
            }}
            className="px-2 py-0.5 rounded-full bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/20 hover:bg-emerald-500/30 text-[8px] font-black italic uppercase tracking-widest text-emerald-400 transition-all shadow-lg"
          >
            自定义
          </button>
        </div>
      )}
    </div>
  )
}
