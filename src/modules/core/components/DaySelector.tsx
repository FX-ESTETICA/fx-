import React from 'react';
import { cn } from '@/lib/utils';

interface DaySelectorItemProps {
  date: Date;
  isToday: boolean;
  dayLabel: string;
  dateLabel: string;
  onClick: (date: Date) => void;
  className?: string;
}

export const DaySelectorItem: React.FC<DaySelectorItemProps> = ({
  date,
  isToday,
  dayLabel,
  dateLabel,
  onClick,
  className
}) => {
  return (
    <div 
      className={cn(
        "py-2 md:py-3 flex flex-col items-center cursor-pointer group/day-header transition-all",
        className
      )}
      onClick={() => onClick(date)}
    >
      <div className={cn(
        "flex flex-col items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full transition-all duration-300",
        isToday 
          ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
          : "hover:bg-white/10 group-hover/day-header:scale-110"
      )}>
        <div className={cn(
          "text-[10px] md:text-xs font-black italic uppercase tracking-widest mb-0.5",
          isToday ? "text-zinc-950/80" : "text-white"
        )}>
          {dayLabel}
        </div>
        <div className={cn(
          "text-lg md:text-xl font-black",
          isToday ? "text-zinc-900" : "text-white"
        )}>
          {dateLabel}
        </div>
      </div>
    </div>
  );
};

interface DaySelectorProps {
  days: Array<{
    date: Date;
    isToday: boolean;
    dayLabel: string;
    dateLabel: string;
  }>;
  onDayClick: (date: Date) => void;
  className?: string;
}

export const DaySelector: React.FC<DaySelectorProps> = ({
  days,
  onDayClick,
  className
}) => {
  return (
    <div className={cn(
      "flex-1 grid grid-cols-7 gap-1.5 md:gap-3 lg:gap-4",
      className
    )}>
      {days.map((day) => (
        <DaySelectorItem
          key={day.date.toString()}
          date={day.date}
          isToday={day.isToday}
          dayLabel={day.dayLabel}
          dateLabel={day.dateLabel}
          onClick={onDayClick}
        />
      ))}
    </div>
  );
};
