import React, { useMemo } from 'react';
import { format, isSameDay, addMinutes } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useEventAssignments } from '../hooks/useEventAssignments';
import { getEventStartTime, getEventEndTime } from '@/utils/calendar-helpers';
import { CalendarEvent, StaffMember, ViewType } from '@/utils/calendar-constants';
import { 
  MINUTE_HEIGHT, 
  SLOT_HEIGHT, 
  TIME_SLOTS, 
  SLOT_INTERVAL 
} from '../calendar-constants';
import { EventCard } from './EventCard';
import { GapBadge } from './Gaps';
import { StaffTimer } from './StaffTimer';
import { NowLine, TimeAxis, HoverLine } from '@/modules/core/components/GridElements';

interface GridProps {
  mode: 'admin' | 'customer';
  lang: 'zh' | 'it';
  isCalendarLocked: boolean;
  onGridClick: (e: React.MouseEvent, date: Date, staffId?: string) => void;
  onGridMouseMove: (e: React.MouseEvent, date: Date, staffId?: string) => void;
  onEventClick: (event: CalendarEvent) => void;
  I18N: any;
  viewType: ViewType;
  currentDate: Date;
  events: CalendarEvent[];
  isModalOpen: boolean;
  today: Date | null;
  now: Date | null;
  hoverTime: { time: string; top: number; staffId?: string; date?: Date } | null;
  setHoverTime: (hoverTime: { time: string; top: number; staffId?: string; date?: Date } | null) => void;
  staffMembers: StaffMember[];
}

export const Grid: React.FC<GridProps> = ({
  mode,
  lang,
  isCalendarLocked,
  onGridClick,
  onGridMouseMove,
  onEventClick,
  I18N,
  viewType,
  currentDate,
  events,
  isModalOpen,
  today,
  now,
  hoverTime,
  setHoverTime,
  staffMembers
}) => {
  const { activeStaff, eventAssignments } = useEventAssignments({
    mode,
    events,
    currentDate,
    viewType,
    staffMembers
  });

  const days = useMemo(() => {
    if (viewType === 'day') return [currentDate];
    // Week view days logic (simplified for this component)
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(start.setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [viewType, currentDate]);

  const renderNowLine = (date: Date) => {
    if (!now || isCalendarLocked || !isSameDay(date, now)) return null;
    if (now.getHours() < 8 || now.getHours() >= 21) return null;

    const top = ((now.getHours() - 8) * 60 + now.getMinutes()) * MINUTE_HEIGHT;
    return <NowLine top={top} />;
  };

  const lastTimeLabel = useMemo(() => {
    const lastSlot = TIME_SLOTS[TIME_SLOTS.length - 1];
    const [h, m] = lastSlot.split(':').map(Number);
    const endDate = addMinutes(new Date(0, 0, 0, h, m), SLOT_INTERVAL);
    return format(endDate, 'HH:mm');
  }, []);

  return (
    <div className={cn("flex-1 overflow-y-auto no-scrollbar", isModalOpen && "opacity-0 pointer-events-none")}>
      <div className="flex px-1 md:px-2 lg:px-3 min-h-fit pb-20 pt-4">
        {/* Time Axis Column */}
        <TimeAxis 
          timeSlots={TIME_SLOTS} 
          slotHeight={SLOT_HEIGHT} 
          lastTimeLabel={lastTimeLabel}
          className={cn(isModalOpen && "opacity-0 pointer-events-none")}
        />

        {/* Slots Grid */}
        <div 
          className={cn(
            "flex-1 grid relative z-0",
            viewType === 'day' ? "" : "grid-cols-7 gap-1.5 md:gap-3 lg:gap-4"
          )}
          style={viewType === 'day' ? { 
            gridTemplateColumns: `repeat(${activeStaff.length}, minmax(0, 1fr))` 
          } : {}}
        >
          {renderNowLine(currentDate)}

          {viewType === 'day' ? activeStaff.map((staff) => {
            const filteredEvents = events.filter(e => {
              const isCurrentDay = isSameDay(getEventStartTime(e), currentDate);
              if (!isCurrentDay) return false;
              const assignedStaffId = eventAssignments.get(e.id);
              return assignedStaffId === staff.id;
            });

            return (
              <div key={staff.id} className={cn("relative z-10", isModalOpen && "opacity-0")}>
                {mode === 'admin' && !isCalendarLocked && (
                  <>
                    <GapBadge 
                      staffId={staff.id} 
                      eventAssignments={eventAssignments} 
                      events={events}
                      currentDate={currentDate}
                      now={now}
                    />
                    <StaffTimer 
                      staffId={staff.id} 
                      eventAssignments={eventAssignments} 
                      events={events}
                      now={now}
                      currentDate={currentDate}
                    />
                  </>
                )}
                
                <div 
                  className="absolute inset-0 z-0 cursor-crosshair group/grid"
                  onClick={(e) => onGridClick(e, currentDate, staff.id)}
                  onMouseMove={(e) => onGridMouseMove(e, currentDate, staff.id)}
                  onMouseLeave={() => setHoverTime(null)}
                >
                  {hoverTime && hoverTime.staffId === staff.id && (
                    <HoverLine top={hoverTime.top} time={hoverTime.time} />
                  )}
                </div>

                {filteredEvents.map(event => {
                  const start = getEventStartTime(event);
                  const end = getEventEndTime(event);
                  const totalStartMinutes = (start.getHours() - 8) * 60 + start.getMinutes();
                  const durationInMinutes = (end.getTime() - start.getTime()) / 60000;
                  
                  const top = (totalStartMinutes) * MINUTE_HEIGHT;
                  const height = (durationInMinutes) * MINUTE_HEIGHT;
                  
                  // --- 建立 context_snapshot 标准，清理 notes 中的所有正则逻辑 ---
                  const snapshot = event.context_snapshot || {};
                  let staffId = snapshot.selected_staff_id || snapshot.clicked_staff_id;
                  
                  // 降级方案：旧数据兼容
                  if (!staffId) {
                    const notes = event.notes || '';
                    const staffIdMatch = notes.match(/技师:([^,\]\s]+)/);
                    staffId = staffIdMatch ? staffIdMatch[1] : 'NO';
                  }
                  
                  const notes = event.notes || '';
                  const memberDisplayId = event.customer_id || '';
                  
                  return (
                    <EventCard
                      key={event.id}
                      event={event}
                      mode={mode}
                      lang={lang}
                      isShort={durationInMinutes < 30}
                      isCompleted={!!notes.includes('COMPLETED')}
                      isPending={event.status === 'pending'}
                      onClick={() => onEventClick(event)}
                      style={{ 
                        top: `calc(${top}rem + 1px)`, 
                        height: `calc(${height}rem - 2px)`,
                        left: '4px',
                        right: '4px'
                      }}
                      staffMembers={staffMembers}
                      I18N={I18N}
                      height={height}
                      memberDisplayId={memberDisplayId}
                      staffId={staffId}
                    />
                  );
                })}
              </div>
            );
          }) : days.map((day) => {
            const filteredEvents = events.filter(e => isSameDay(getEventStartTime(e), day));

            // Week view overlap logic
            const sortedEvents = [...filteredEvents].sort((a, b) => {
              const startA = getEventStartTime(a).getTime();
              const startB = getEventStartTime(b).getTime();
              if (startA !== startB) return startA - startB;
              return getEventEndTime(b).getTime() - getEventEndTime(a).getTime();
            });

            const groups: { event: CalendarEvent; start: number; end: number; column: number; totalColumns: number }[] = [];
            const activeGroups: typeof groups = [];

            sortedEvents.forEach(event => {
              const start = getEventStartTime(event).getTime();
              const end = getEventEndTime(event).getTime();

              for (let i = activeGroups.length - 1; i >= 0; i--) {
                if (activeGroups[i].end <= start) activeGroups.splice(i, 1);
              }

              let column = 0;
              const usedColumns = new Set(activeGroups.map(g => g.column));
              while (usedColumns.has(column)) column++;

              const newGroup = { event, start, end, column, totalColumns: 0 };
              groups.push(newGroup);
              activeGroups.push(newGroup);

              const maxCol = Math.max(...activeGroups.map(g => g.column)) + 1;
              activeGroups.forEach(ag => {
                ag.totalColumns = Math.max(ag.totalColumns, maxCol);
              });
            });

            return (
              <div key={day.toString()} className="relative border-none">
                <div 
                  className="absolute inset-0 z-0 cursor-crosshair group/grid"
                  onClick={(e) => onGridClick(e, day)}
                  onMouseMove={(e) => onGridMouseMove(e, day)}
                  onMouseLeave={() => setHoverTime(null)}
                >
                  {hoverTime && hoverTime.date && isSameDay(hoverTime.date, day) && !hoverTime.staffId && (
                    <HoverLine top={hoverTime.top} time={hoverTime.time} />
                  )}
                </div>

                {groups.map(group => {
                  const event = group.event;
                  const start = getEventStartTime(event);
                  const end = getEventEndTime(event);
                  const totalStartMinutes = (start.getHours() - 8) * 60 + start.getMinutes();
                  const durationInMinutes = (end.getTime() - start.getTime()) / 60000;
                  
                  const top = (totalStartMinutes) * MINUTE_HEIGHT;
                  const height = (durationInMinutes) * MINUTE_HEIGHT;

                  const memberInfo = event.customer_id ? `(ID: ${event.customer_id})` : '';
                  const memberIdMatch = memberInfo.match(/\(([^)]+)\)/);
                  const memberDisplayId = memberIdMatch ? memberIdMatch[1] : '';
                  
                  const notes = event.notes || '';
                  const staffIdMatch = notes.match(/技师:([^,\]\s]+)/);
                  const staffId = staffIdMatch ? staffIdMatch[1] : undefined;
                  
                  const width = 100 / group.totalColumns;
                  const left = group.column * width;

                  return (
                    <EventCard
                      key={event.id}
                      event={event}
                      mode={mode}
                      lang={lang}
                      isShort={durationInMinutes < 30}
                      isCompleted={mode === 'admin' && !!notes.includes('COMPLETED')}
                      isPending={event.status === 'pending'}
                      onClick={() => onEventClick(event)}
                      style={{ 
                        top: `calc(${top}rem + 1px)`, 
                        height: `calc(${height}rem - 2px)`,
                        left: `${left}%`,
                        width: `${width}%`,
                        paddingLeft: '2px',
                        paddingRight: '2px'
                      }}
                      staffMembers={staffMembers}
                      I18N={I18N}
                      height={height}
                      memberDisplayId={memberDisplayId}
                      staffId={staffId}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
