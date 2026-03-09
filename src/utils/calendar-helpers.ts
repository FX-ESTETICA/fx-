import { 
  format, 
  addMinutes,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachMonthOfInterval,
  startOfYear,
  endOfYear
} from 'date-fns'
import { CalendarEvent, ViewType } from './calendar-constants'

/**
 * Parses the start time from a calendar event to a Date object.
 */
export const getEventStartTime = (event: CalendarEvent): Date => {
  if (!event["开始时间"] || !event["服务日期"]) return new Date()
  const [h, m, s] = event["开始时间"].split(':').map(Number)
  const [y, month, d] = event["服务日期"].split('-').map(Number)
  return new Date(y, month - 1, d, h, m, s)
}

/**
 * Calculates the end time of a calendar event.
 */
export const getEventEndTime = (event: CalendarEvent): Date => {
  return addMinutes(getEventStartTime(event), event["持续时间"])
}

/**
 * Generates an array of dates to be displayed in the calendar based on the view type and current date.
 */
export const getCalendarDays = (viewType: ViewType, currentDate: Date): Date[] => {
  if (viewType === 'day') {
    return [currentDate]
  }
  if (viewType === 'week') {
    return eachDayOfInterval({
      start: startOfWeek(currentDate, { weekStartsOn: 1 }),
      end: endOfWeek(currentDate, { weekStartsOn: 1 })
    })
  }
  if (viewType === 'year') {
    return eachMonthOfInterval({
      start: startOfYear(currentDate),
      end: endOfYear(currentDate)
    })
  }
  
  // Month view
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  
  return eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  })
}

/**
 * Helper to generate time slots for the day/week view.
 */
export const generateTimeSlots = (startHour = 8, endHour = 20): string[] => {
  const slots: string[] = []
  for (let hour = startHour; hour <= endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`)
  }
  return slots
}

/**
 * Calculates the total price based on selected items in the title.
 */
export const calculateTotalPrice = (title: string, categories: any[]): number => {
  const selectedItems = title.split(',').map(s => s.trim()).filter(Boolean);
  let total = 0;
  selectedItems.forEach(itemName => {
    for (const cat of categories) {
      const item = cat.items.find((i: any) => i.name === itemName);
      if (item) {
        total += item.price;
        break;
      }
    }
  });
  return total;
}
