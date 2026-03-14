import React from 'react';
import { cn } from '@/lib/utils';

interface NowLineProps {
  top: number;
  className?: string;
}

export const NowLine: React.FC<NowLineProps> = ({ top, className }) => {
  return (
    <div 
      className={cn("absolute left-0 right-0 z-10 pointer-events-none flex items-center", className)}
      style={{ top: `${top}rem` }}
    >
      <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] -ml-1" />
      <div className="flex-1 h-[0.5px] bg-gradient-to-r from-rose-500/50 via-rose-500 to-rose-500/50" />
    </div>
  );
};

interface TimeAxisProps {
  timeSlots: string[];
  slotHeight: number;
  lastTimeLabel: string;
  className?: string;
}

export const TimeAxis: React.FC<TimeAxisProps> = ({ 
  timeSlots, 
  slotHeight, 
  lastTimeLabel,
  className 
}) => {
  return (
    <div className={cn("w-14 md:w-20 shrink-0", className)}>
      {timeSlots.map((time) => (
        <div key={time} className="relative" style={{ height: `${slotHeight}rem` }}>
          {time.endsWith(':00') && (
            <div className="absolute top-0 left-2 -translate-y-1/2 text-[10px] md:text-xs font-black tabular-nums text-white bg-transparent px-1">
              {time}
            </div>
          )}
        </div>
      ))}
      <div className="relative h-0">
        <div className="absolute top-0 left-2 -translate-y-1/2 text-[10px] md:text-xs font-black text-white tabular-nums bg-transparent px-1">
          {lastTimeLabel}
        </div>
      </div>
    </div>
  );
};

interface HoverLineProps {
  top: number;
  time: string;
  color?: string;
  className?: string;
}

export const HoverLine: React.FC<HoverLineProps> = ({ 
  top, 
  time, 
  color = "bg-sky-500",
  className 
}) => {
  const lineStyle = color.includes('sky') ? "bg-sky-400/50" : "bg-zinc-400/50";
  
  return (
    <div 
      className={cn("absolute left-0 right-0 z-20 pointer-events-none flex items-center", className)} 
      style={{ top: `${top}rem` }}
    >
      <div className={cn("flex-1 h-[1px]", lineStyle)} />
      <div className={cn(
        "text-[9px] text-white px-1 py-0.5 rounded shadow-lg font-black italic -mr-1 scale-90",
        color
      )}>
        {time}
      </div>
    </div>
  );
};
