import React from 'react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay 
} from 'date-fns'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  className?: string
}

/**
 * 原子组件：迷你日历选择器
 * 适配移动端弹窗的高性能日期选择零件
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  selectedDate,
  onDateSelect,
  className
}) => {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className={cn("bg-transparent backdrop-blur-xl border border-white/5 rounded-2xl p-3 shadow-2xl w-[240px]", className)}>
      <div className="flex items-center justify-center mb-4">
        <h3 className="text-[11px] font-black tracking-widest text-white uppercase italic">
          {format(selectedDate, 'yyyy年 MM月')}
        </h3>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {['一', '二', '三', '四', '五', '六', '日'].map(d => (
          <div key={d} className="text-center text-[9px] font-black italic text-zinc-400">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0">
        {calendarDays.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, monthStart);
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                const newDate = new Date(selectedDate);
                newDate.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
                onDateSelect(newDate);
              }}
              className={cn(
                "h-7 w-7 flex items-center justify-center text-[10px] transition-all rounded-lg",
                isSelected 
                  ? "bg-white text-black font-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                  : isCurrentMonth 
                    ? "text-zinc-300 hover:bg-white/10" 
                    : "text-zinc-800"
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
