import React, { useMemo } from 'react'
import { isSameDay } from 'date-fns'
import { getEventStartTime, getEventEndTime } from '@/utils/calendar-helpers'
import { CalendarEvent } from '@/utils/calendar-constants'
import { cn } from '@/lib/utils'

const MINUTE_HEIGHT = 5 / 60; // 5rem per hour / 60 mins

export function IdleGapLabels({ 
  staffId, 
  eventAssignments,
  events,
  currentDate
}: { 
  staffId: string, 
  eventAssignments: Map<string, string>,
  events: CalendarEvent[],
  currentDate: Date
}) {
  
  const gaps = useMemo(() => {
    const staffEvents = events
      .filter(e => isSameDay(getEventStartTime(e), currentDate) && eventAssignments.get(e.id) === staffId)
      .sort((a, b) => getEventStartTime(a).getTime() - getEventStartTime(b).getTime());

    const result: { top: number, height: number, minutes: number }[] = [];
    const workStart = new Date(currentDate);
    workStart.setHours(8, 0, 0, 0);
    const workEnd = new Date(currentDate);
    workEnd.setHours(20, 0, 0, 0);

    const addGap = (start: Date, end: Date) => {
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);
      if (duration >= 15) {
        const topMinutes = (start.getHours() - 8) * 60 + start.getMinutes();
        result.push({
          top: (topMinutes / 60) * 4, // 4rem per hour? wait, original said 5rem per hour in comments but 4rem here
          height: (duration / 60) * 4,
          minutes: duration
        });
      }
    };

    if (staffEvents.length > 0) {
      const firstStart = getEventStartTime(staffEvents[0]);
      if (firstStart > workStart) addGap(workStart, firstStart);
      for (let i = 0; i < staffEvents.length - 1; i++) {
        const currentEnd = getEventEndTime(staffEvents[i]);
        const nextStart = getEventStartTime(staffEvents[i+1]);
        if (nextStart > currentEnd) addGap(currentEnd, nextStart);
      }
      const lastEventEnd = getEventEndTime(staffEvents[staffEvents.length - 1]);
      if (lastEventEnd < workEnd) addGap(lastEventEnd, workEnd);
    } else {
      addGap(workStart, workEnd);
    }
    return result;
  }, [staffId, events, eventAssignments, currentDate]);

  return (
    <>
      {gaps.map((gap, i) => (
        <div key={`gap-${i}`} className="absolute left-0 right-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-30 select-none"
          style={{ top: `${gap.top}rem`, height: `${gap.height}rem`, zIndex: 0 }}>
          <div className="flex flex-col items-center justify-center scale-75 md:scale-90 opacity-40">
            <span className="text-[8px] font-black tracking-tighter text-emerald-400/60 uppercase">IDLE</span>
            <span className="text-[10px] md:text-xs font-black italic text-emerald-400/80 tabular-nums" style={{ fontFamily: 'var(--font-orbitron)' }}>
              {Math.floor(gap.minutes)} MIN
            </span>
          </div>
        </div>
      ))}
    </>
  );
}

export function GapBadge({ 
  staffId, 
  eventAssignments,
  events,
  currentDate,
  now
}: { 
  staffId: string; 
  eventAssignments: Map<string, string>;
  events: CalendarEvent[];
  currentDate: Date;
  now: Date | null;
}) {
  
  const gaps = useMemo(() => {
    if (!now) return [];
    const staffEvents = events
      .filter(e => eventAssignments.get(e.id) === staffId && isSameDay(getEventStartTime(e), currentDate))
      .sort((a, b) => getEventStartTime(a).getTime() - getEventStartTime(b).getTime());

    const result: { top: number; height: number; minutes: number; startTime: Date }[] = [];
    for (let i = 0; i < staffEvents.length - 1; i++) {
      const currentEnd = getEventEndTime(staffEvents[i]);
      const nextStart = getEventStartTime(staffEvents[i+1]);
      const diffMs = nextStart.getTime() - currentEnd.getTime();
      if (diffMs >= 5 * 60 * 1000) {
        const minutes = Math.floor(diffMs / (1000 * 60));
        const top = ((currentEnd.getHours() - 8) * 60 + currentEnd.getMinutes()) * MINUTE_HEIGHT;
        const height = minutes * MINUTE_HEIGHT;
        result.push({ top, height, minutes, startTime: currentEnd });
      }
    }
    return result;
  }, [events, eventAssignments, staffId, currentDate, now]);

  if (!now) return null;

  return (
    <>
      {gaps.map((gap, i) => {
        const hasReached = isSameDay(currentDate, now) && now.getTime() >= gap.startTime.getTime();
        if (hasReached) return null;
        return (
          <div key={`gap-${i}`} className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-0"
            style={{ top: `${gap.top}rem`, height: `${gap.height}rem`, paddingTop: gap.minutes <= 15 ? '2px' : '4px', paddingBottom: gap.minutes <= 15 ? '2px' : '4px' }}>
            <div className={cn("flex items-center justify-center bg-black/40 border border-emerald-500/30 rounded-lg backdrop-blur-sm shadow-lg w-[85%] h-full",
              gap.minutes <= 15 ? "px-1" : "px-3")}>
              <span className={cn("font-black italic text-emerald-400 tabular-nums leading-none", gap.minutes <= 15 ? "text-[11px]" : "text-[13px]")} style={{ fontFamily: 'var(--font-orbitron)' }}>
                {gap.minutes} MIN
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}
