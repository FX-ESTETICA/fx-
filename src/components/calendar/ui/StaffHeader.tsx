import React, { useMemo } from 'react';
import { User } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { zhCN, it as itLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useEventAssignments } from '../hooks/useEventAssignments';
import { getItalyTime } from '../hooks/useCalendarInit';
import WeatherDisplay from './WeatherDisplay';
import { StaffMember, ViewType, CalendarEvent } from '@/utils/calendar-constants';
import { IndustryType } from '@/modules/core/types/omni-flow';
import { StaffDateHeader } from '@/modules/core/components/StaffDateHeader';
import { TodayButton } from '@/modules/core/components/TodayButton';
import { StaffAvatar } from '@/modules/core/components/StaffAvatar';
import { DaySelector } from '@/modules/core/components/DaySelector';
import { LIQUID_UI_CONFIGS } from '@/modules/core/config/liquid-ui-config';

interface StaffHeaderProps {
  lang: 'zh' | 'it';
  mode: 'admin' | 'customer';
  I18N: any;
  onToggleSidebar: () => void;
  viewType: ViewType;
  currentDate: Date;
  isModalOpen: boolean;
  today: Date | null;
  setCurrentDate: (date: Date) => void;
  setViewType: (view: ViewType) => void;
  events: CalendarEvent[];
  staffMembers: StaffMember[];
  industryType?: IndustryType;
}

export const StaffHeader: React.FC<StaffHeaderProps> = ({
  lang,
  mode,
  I18N,
  onToggleSidebar,
  viewType,
  currentDate,
  isModalOpen,
  today,
  setCurrentDate,
  setViewType,
  events,
  staffMembers,
  industryType = 'beauty'
}) => {
  const config = LIQUID_UI_CONFIGS[industryType] || LIQUID_UI_CONFIGS.generic;
  const IndustryIcon = config.icon;

  const { activeStaff } = useEventAssignments({
    mode,
    events,
    currentDate,
    viewType,
    staffMembers
  });
  
  const locale = lang === 'zh' ? zhCN : itLocale;

  const days = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(start.setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [currentDate]);

  return (
    <div className="flex flex-col px-1 md:px-2 lg:px-3 bg-transparent shrink-0">
      {viewType === 'day' && (
        <StaffDateHeader
          year={format(currentDate, 'yyyy')}
          dateStr={format(currentDate, I18N[lang].dayHeaderFormat, { locale })}
          weatherComponent={<WeatherDisplay />}
          onToggleSidebar={onToggleSidebar}
          isModalOpen={isModalOpen}
          className="pl-[24px] md:pl-[40px]"
        />
      )}
      
      <div className="flex w-full">
        <div className={cn(
          "w-14 md:w-20 flex flex-col items-start pl-2 pt-4 pb-2 bg-transparent shrink-0",
          isModalOpen && "opacity-0 pointer-events-none"
        )}>
          {viewType === 'day' && (
            <TodayButton
              onClick={() => setCurrentDate(new Date())}
              isToday={isSameDay(currentDate, today || getItalyTime())}
              label={lang === 'zh' ? '今' : 'OGGI'}
              isModalOpen={isModalOpen}
              title={lang === 'zh' ? '回到今天' : 'Torna a oggi'}
            />
          )}
        </div>
        <div 
          className={cn(
            "flex-1",
            isModalOpen ? "opacity-0 pointer-events-none" : ""
          )}
        >
          {viewType === 'day' ? (
            <div 
              className="grid"
              style={{ gridTemplateColumns: `repeat(${activeStaff.length}, minmax(0, 1fr))` }}
            >
              {industryType === 'beauty' ? (
                activeStaff.map((staff: StaffMember) => (
                  <div key={staff.id} className="py-3 md:py-4 text-center flex flex-col items-center gap-1.5 group">
                    <div className="relative">
                      <StaffAvatar avatar={staff.avatar} />
                      <div className="absolute -bottom-1 -right-1 bg-zinc-950 rounded-full p-0.5 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <User className="w-2.5 h-2.5 text-zinc-400" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between h-full px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center border",
                      `bg-${config.color}/20`,
                      `border-${config.color}/50`
                    )}>
                      <IndustryIcon className={cn("w-4 h-4", `text-${config.color}`)} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white tracking-widest uppercase">
                        {config.viewName[lang]} / {config.viewName.it}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500">
                        {config.subtext[lang]}
                      </span>
                    </div>
                  </div>
                  {config.areas && (
                    <div className="flex gap-2">
                      {config.areas.map(area => (
                        <span key={area} className="px-2 py-0.5 rounded-full border border-white/5 bg-white/5 text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                          {area}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <DaySelector
              days={days.map(day => ({
                date: day,
                isToday: isSameDay(day, today || getItalyTime()),
                dayLabel: format(day, 'EEE', { locale }),
                dateLabel: format(day, 'd', { locale })
              }))}
              onDayClick={(day) => {
                setCurrentDate(day);
                setViewType('day');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
