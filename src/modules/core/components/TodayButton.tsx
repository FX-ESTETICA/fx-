import React from 'react';
import { cn } from '@/lib/utils';

interface TodayButtonProps {
  onClick: () => void;
  isToday: boolean;
  label: string;
  isModalOpen?: boolean;
  title?: string;
  className?: string;
}

export const TodayButton: React.FC<TodayButtonProps> = ({
  onClick,
  isToday,
  label,
  isModalOpen = false,
  title,
  className
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isModalOpen}
      className={cn(
        "w-9 h-9 md:w-11 md:h-11 rounded-full border flex items-center justify-center transition-all duration-300",
        isToday
          ? "bg-gradient-to-br from-white/20 to-white/5 border-white/10 shadow-lg"
          : "bg-transparent border-white/15 hover:border-white/30 hover:bg-white/5",
        isModalOpen && "opacity-0 pointer-events-none",
        className
      )}
      title={title}
    >
      <span
        className={cn(
          "text-[10px] md:text-xs font-black text-white tracking-tighter",
          label.length > 2 && "text-[9px] md:text-[10px] tracking-tight"
        )}
        style={{ fontFamily: 'var(--font-zcool-kuaile)' }}
      >
        {label}
      </span>
    </button>
  );
};
