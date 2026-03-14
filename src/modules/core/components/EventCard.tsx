import React from 'react';
import { cn } from '@/lib/utils';

interface EventCardProps {
  services: string[];
  mode: 'admin' | 'customer';
  isShort: boolean;
  isCompleted: boolean;
  isPending: boolean;
  onClick: (e: React.MouseEvent) => void;
  style: React.CSSProperties;
  height: number;
  memberDisplayId?: string;
  staffLabel?: string;
  occupiedLabel?: string;
  pendingLabel?: string;
  backgroundColor?: string;
  borderColorClass?: string;
  className?: string;
}

/**
 * 原子组件：预约卡片
 * 纯视图组件，负责渲染卡片的视觉样式
 */
export const EventCard: React.FC<EventCardProps> = ({
  services,
  mode,
  isShort,
  isCompleted,
  isPending,
  onClick,
  style,
  height,
  memberDisplayId,
  staffLabel,
  occupiedLabel = "Occupied",
  pendingLabel = "您有新订单",
  backgroundColor = 'bg-blue-600',
  borderColorClass,
  className
}) => {
  return (
    <div 
      onClick={onClick}
      style={style}
      className={cn(
        "absolute z-10 rounded-lg text-white shadow-2xl overflow-hidden",
        isShort ? "px-1" : "px-2",
        "shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] ring-1 ring-white/10",
        "hover:brightness-110 flex flex-col justify-center uppercase tracking-wider transition-all duration-200",
        mode === 'customer' ? 'bg-zinc-700/50' : backgroundColor,
        isCompleted && cn("bg-opacity-[0.05] border", borderColorClass),
        isPending && "ring-2 ring-red-500 animate-pulse border-2 border-red-500",
        className
      )}
    >
      <div className={cn(
        "flex flex-col leading-none font-black italic w-full gap-0.5",
        height < 1.5 ? "text-[9px]" : 
        height < 2 ? "text-[10px]" :
        isShort ? "text-[11px]" : "text-[13px]"
      )}>
        <div className="flex items-center gap-1 w-full overflow-hidden">
          {mode === 'admin' && staffLabel === 'NO' && (
            <span className="text-[7px] bg-zinc-800 px-0.5 rounded border border-zinc-700 not-italic shrink-0 scale-90">NO</span>
          )}
          <div className="truncate flex-1 flex items-center gap-0.5 overflow-hidden">
            {isPending ? (
              <span className="truncate text-white animate-bounce">{pendingLabel}</span>
            ) : mode === 'customer' ? (
              <span className="truncate text-white/40 font-medium">{occupiedLabel}</span>
            ) : (
              services.map((item, idx) => (
                <React.Fragment key={idx}>
                  <span className="truncate text-white">{item}</span>
                  {idx < services.length - 1 && <span className="text-white/60 mx-0.5">/</span>}
                </React.Fragment>
              ))
            )}
          </div>
          {mode === 'admin' && isShort && memberDisplayId && (
            <span className="text-[9px] ml-auto shrink-0 font-black not-italic leading-none text-white">{memberDisplayId}</span>
          )}
        </div>
        {mode === 'admin' && !isShort && memberDisplayId && (
          <div>
            <span className="text-[10px] font-black not-italic truncate leading-none inline-block text-white">
              {memberDisplayId}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
