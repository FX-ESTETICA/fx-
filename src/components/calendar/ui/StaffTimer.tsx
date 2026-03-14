import React, { useMemo } from 'react'
import { isSameDay } from 'date-fns'
import { getEventStartTime, getEventEndTime } from '@/utils/calendar-helpers'
import { cn } from '@/lib/utils'

import { StaffTimerBadge } from '@/modules/core/components/StaffTimerBadge'

const MINUTE_HEIGHT = 5 / 60; // 5rem per hour / 60 mins

import { CalendarEvent } from '@/utils/calendar-constants'

export function StaffTimer({ 
  staffId, 
  eventAssignments,
  events,
  now,
  currentDate
}: { 
  staffId: string; 
  eventAssignments: Map<string, string>;
  events: CalendarEvent[];
  now: Date | null;
  currentDate: Date;
}) {

  const timerData = useMemo(() => {
    if (!now || !isSameDay(currentDate, now)) return null;

    const workStart = new Date(now);
    workStart.setHours(8, 0, 0, 0);
    const workEnd = new Date(now);
    workEnd.setHours(20, 0, 0, 0);

    const staffEvents = events
      .filter(e => eventAssignments.get(e.id) === staffId && isSameDay(getEventStartTime(e), now))
      .sort((a, b) => getEventStartTime(a).getTime() - getEventStartTime(b).getTime());

    const activeEvent = staffEvents.find(e => {
      const start = getEventStartTime(e);
      const end = getEventEndTime(e);
      return now >= start && now < end;
    });

    if (activeEvent) {
      return {
        label: 'BUSY',
        endTime: getEventEndTime(activeEvent),
        color: 'text-rose-400',
        borderColor: 'border-rose-500/30',
        shadowColor: 'rgba(244,63,94,0.2)',
        isCountdown: true
      };
    }

    const nextEvent = staffEvents.find(e => getEventStartTime(e) > now);
    if (nextEvent) {
      const gapEnd = getEventStartTime(nextEvent);
      return {
        label: 'IDLE',
        endTime: gapEnd, 
        color: 'text-emerald-400',
        borderColor: 'border-emerald-500/30',
        shadowColor: 'rgba(52,211,153,0.2)',
        isCountdown: true 
      };
    }

    if (now < workEnd) {
      return {
        label: 'FREE',
        endTime: workEnd,
        color: 'text-sky-400',
        borderColor: 'border-sky-500/30',
        shadowColor: 'rgba(56,189,248,0.2)',
        isCountdown: true
      };
    }
    return null;
  }, [events, eventAssignments, staffId, now, currentDate]);

  const timeStr = useMemo(() => {
    if (!timerData || !timerData.endTime || !now) return '--:--';
    const diff = timerData.endTime.getTime() - now.getTime();
    if (diff <= 0) return '0 MIN';
    const totalMinutes = Math.floor(diff / (1000 * 60));
    return `${totalMinutes} MIN`;
  }, [timerData, now]);

  if (!timerData || !now) return null;

  const top = ((now.getHours() - 8) * 60 + now.getMinutes()) * MINUTE_HEIGHT;

  return (
    <StaffTimerBadge
      label={timerData.label}
      timeStr={timeStr}
      color={timerData.color}
      borderColor={timerData.borderColor}
      shadowColor={timerData.shadowColor}
      top={top}
      isAnimate={timerData.label === 'BUSY'}
    />
  );
}
