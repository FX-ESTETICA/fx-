import React from 'react';
import { cn } from '@/lib/utils';

interface StaffTimerBadgeProps {
  label: string;
  timeStr: string;
  color: string;
  borderColor: string;
  shadowColor: string;
  top: number;
  isAnimate?: boolean;
}

export const StaffTimerBadge: React.FC<StaffTimerBadgeProps> = ({
  label,
  timeStr,
  color,
  borderColor,
  shadowColor,
  top,
  isAnimate = false
}) => {
  return (
    <div 
      className={cn(
        "absolute left-0 right-0 z-[999] flex flex-col items-center justify-center pointer-events-none transition-all duration-300",
        isAnimate ? "animate-pulse" : ""
      )} 
      style={{ 
        top: `${top}rem`, 
        transform: 'translateY(-50%)' 
      }}
    >
      <div 
        className={cn(
          "flex flex-col items-center justify-center px-2 py-0.5 rounded-md bg-transparent border border-white/10 backdrop-blur-md shadow-2xl scale-90 md:scale-100",
          borderColor
        )}
        style={{ boxShadow: `0 0 25px ${shadowColor}` }}
      >
        <div className="flex items-center gap-1">
          <span className={cn("text-[8px] font-black tracking-tighter uppercase opacity-70", color)}>
            {label}
          </span>
          <span 
            className={cn("text-[11px] md:text-xs font-black italic tabular-nums leading-none", color)} 
            style={{ fontFamily: 'var(--font-orbitron)' }}
          >
            {timeStr}
          </span>
        </div>
      </div>
    </div>
  );
};
