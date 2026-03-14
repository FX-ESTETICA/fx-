import React from 'react'
import { cn } from '@/lib/utils'

interface TotalBillingProps {
  amount: string | number;
  label?: string;
  onAmountClick?: () => void;
  showSwipeHint?: boolean;
  swipeHintLabel?: string;
  className?: string;
}

/**
 * 原子组件：账单总计
 * 渲染底部大数字总额
 */
export const TotalBilling: React.FC<TotalBillingProps> = ({
  amount,
  label = "TOTAL BILLING",
  onAmountClick,
  showSwipeHint = false,
  swipeHintLabel = "确认收款",
  className
}) => {
  return (
    <div className={cn("pt-1 pb-0.5 flex flex-col items-center w-full overflow-visible touch-none overscroll-contain", className)}>
      <div className="w-full flex justify-center overflow-visible">
        <h3 className="text-xl font-black italic text-white uppercase tracking-[0.2em] [text-shadow:0_2px_4px_rgba(0,0,0,0.8),0_0_1px_rgba(0,0,0,1)] mr-[-0.2em]">
          {label}
        </h3>
      </div>
      
      <div className="w-full flex justify-center overflow-visible">
        <div className="flex items-center justify-center overflow-visible">
          <input 
            type="text"
            readOnly
            value={amount}
            onClick={(e) => {
              e.stopPropagation();
              onAmountClick?.();
            }}
            style={{ 
              fontSize: '45px',
              lineHeight: '1',
              height: 'auto',
              width: '100%',
              maxWidth: '250px'
            }}
            className="bg-transparent border-none p-0 text-center focus:outline-none font-black italic text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)] cursor-pointer"
          />
        </div>
      </div>

      {showSwipeHint && (
        <div className="absolute bottom-4 right-6 flex flex-col items-end gap-1 pointer-events-none">
          <span className="text-[11px] font-black italic text-emerald-400 uppercase tracking-widest [text-shadow:0_0_8px_rgba(52,211,153,0.5)]">
            {swipeHintLabel}
          </span>
        </div>
      )}
    </div>
  )
}
