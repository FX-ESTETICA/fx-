import React, { useMemo } from 'react';
import { format, isSameDay, isSameMonth, startOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CalendarEvent } from '@/utils/calendar-constants';

interface MonthViewProps {
  lang: 'zh' | 'it';
  I18N: any;
  onDayClick: (day: Date) => void;
  currentDate: Date;
  events: CalendarEvent[];
  isModalOpen: boolean;
  today: Date | null;
}

export const MonthView: React.FC<MonthViewProps> = ({
  lang,
  I18N,
  onDayClick,
  currentDate,
  events,
  isModalOpen,
  today
}) => {
  const monthStart = startOfMonth(currentDate);

  const days = useMemo(() => {
    const start = new Date(monthStart);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(start.setDate(diff));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [monthStart]);

  return (
    <div className="flex flex-col h-full">
      {/* Weekdays Header - Only show in month view */}
      <div className="flex bg-transparent sticky top-0 z-20">
        <div className="flex-1 grid grid-cols-7 gap-1 md:gap-2 lg:gap-2.5 px-1 md:px-2 lg:px-3">
          {I18N[lang].weekdays.map((day: string) => (
            <div key={day} className="py-3 md:py-4 text-center">
              <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-[0.2em]">
                {day}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div className={cn(
        "flex-1 grid grid-cols-7 grid-rows-6 gap-1 md:gap-2 lg:gap-2.5 p-1 md:p-2 lg:p-3 min-h-0 relative",
        isModalOpen ? "opacity-0 pointer-events-none" : ""
      )}>
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = today ? isSameDay(day, today) : false;
          
          const dayEvents = events.filter(event => {
            const serviceDate = event.service_date;
            if (!serviceDate) return false;
            const [y, m, d] = serviceDate.split('-').map(Number);
            const eventDate = new Date(y, m - 1, d);
            return isSameDay(day, eventDate);
          });

          return (
            <div 
              key={day.toString()}
              onClick={() => onDayClick(day)}
              className={cn(
                "relative flex flex-col p-1.5 md:p-3 lg:p-4 rounded-xl md:rounded-2xl lg:rounded-3xl cursor-pointer group/cell overflow-hidden transition-all duration-300",
                !isCurrentMonth ? "opacity-20" : "hover:bg-white/10 hover:shadow-2xl hover:shadow-white/5 hover:-translate-y-0.5",
                isToday && "bg-white/10 ring-1 ring-white/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]"
              )}
            >
              <div className={cn(
                "transition-transform duration-300 group-hover/cell:scale-110 z-10",
                "absolute top-1 left-1 md:top-1.5 md:left-1.5"
              )}>
                <span className={cn(
                  "font-bold flex items-center justify-center transition-all duration-300",
                  "text-[9px] md:text-xs w-5 h-5 md:w-6 md:h-6 rounded-full",
                  isToday 
                    ? "bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                    : (isCurrentMonth 
                        ? "bg-transparent text-white/90 border border-white/20 group-hover/cell:border-white/40" 
                        : "text-zinc-600")
                )}>
                  {format(day, 'd')}
                </span>
              </div>

              {/* Show appointment count for month view - Centered */}
              {isCurrentMonth && (
                <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                  {dayEvents.length > 0 && (
                    <span className={cn(
                      "font-black italic text-white/90 drop-shadow-[0_4px_12px_rgba(255,255,255,0.3)] tracking-tighter group-hover/cell:scale-110 transition-transform duration-500",
                      "text-xl md:text-3xl lg:text-4xl",
                      dayEvents.some(e => e.status === 'pending') && "text-red-500 animate-pulse"
                    )}>
                      {dayEvents.length}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
