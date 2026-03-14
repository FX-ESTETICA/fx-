import React, { useMemo } from 'react';
import { format, isSameMonth, startOfYear, eachMonthOfInterval, endOfYear } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CalendarEvent } from '@/utils/calendar-constants';

interface YearViewProps {
  lang: 'zh' | 'it';
  I18N: any;
  onMonthClick: (month: Date) => void;
  currentDate: Date;
  events: CalendarEvent[];
  isModalOpen: boolean;
  today: Date | null;
}

export const YearView: React.FC<YearViewProps> = ({
  lang,
  I18N,
  onMonthClick,
  currentDate,
  events,
  isModalOpen,
  today
}) => {
  const yearStart = startOfYear(currentDate);

  const months = useMemo(() => {
    return eachMonthOfInterval({
      start: yearStart,
      end: endOfYear(yearStart)
    });
  }, [yearStart]);

  return (
    <div className={cn(
      "flex-1 grid min-h-0 relative p-1 md:p-2 lg:p-3",
      "grid-cols-3 md:grid-cols-4 grid-rows-4 md:grid-rows-3 gap-1 md:gap-2",
      isModalOpen ? "opacity-0 pointer-events-none" : ""
    )}>
      {months.map((month) => {
        const isCurrentMonth = today ? isSameMonth(month, today) : false;
        
        const monthEvents = events.filter(event => {
          const serviceDate = event.service_date;
          if (!serviceDate) return false;
          const [y, m, d] = serviceDate.split('-').map(Number);
          const eventDate = new Date(y, m - 1, d);
          return isSameMonth(month, eventDate);
        });

        return (
          <div 
            key={month.toString()}
            onClick={() => onMonthClick(month)}
            className={cn(
              "relative flex flex-col p-1.5 md:p-3 lg:p-4 rounded-xl md:rounded-2xl lg:rounded-3xl cursor-pointer group/cell overflow-hidden transition-all duration-300",
              "hover:bg-white/10 hover:shadow-2xl hover:shadow-white/5 hover:-translate-y-0.5",
              isCurrentMonth && "bg-white/10 ring-1 ring-white/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]",
              "items-center justify-center text-center"
            )}
          >
            <div className={cn(
              "transition-transform duration-300 group-hover/cell:scale-110 z-10",
              "absolute top-2 left-2 md:top-3 md:left-3"
            )}>
              <span className={cn(
                "font-bold flex items-center justify-center transition-all duration-300",
                "text-2xl md:text-3xl text-white drop-shadow-lg"
              )}>
                {format(month, 'M月', { locale: zhCN })}
              </span>
            </div>

            {/* Show appointment count for year view - Centered */}
            <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
              {monthEvents.length > 0 && (
                <span className={cn(
                  "font-black italic text-white/90 drop-shadow-[0_4px_12px_rgba(255,255,255,0.3)] tracking-tighter group-hover/cell:scale-110 transition-transform duration-500",
                  "text-2xl md:text-4xl lg:text-5xl",
                  monthEvents.some(e => e.status === 'pending') && "text-red-500 animate-pulse"
                )}>
                  {monthEvents.length}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
