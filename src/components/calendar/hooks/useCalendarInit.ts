import { useEffect } from 'react'
import { useCalendarStore } from '../store/useCalendarStore'
import { validateLicense } from '@/utils/supabase/client'

// Helper to get time in Italy (Europe/Rome)
export const getItalyTime = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const dateMap: Record<string, number> = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateMap[part.type] = parseInt(part.value, 10);
    }
  });
  return new Date(dateMap.year, dateMap.month - 1, dateMap.day, dateMap.hour, dateMap.minute, dateMap.second);
};

export function useCalendarInit(initialDate?: Date, initialView?: string) {
  const { 
    setIsMounted, 
    setCurrentDate, 
    setViewType, 
    setIsAuthorized,
    setNow,
    setToday
  } = useCalendarStore()

  useEffect(() => {
    setIsMounted(true)
    if (initialDate) setCurrentDate(initialDate)
    if (initialView) setViewType(initialView as any)

    const checkAuth = async () => {
      const authorized = await validateLicense()
      setIsAuthorized(authorized)
    }
    checkAuth()
  }, [initialDate, initialView, setIsMounted, setCurrentDate, setViewType, setIsAuthorized])

  useEffect(() => {
    const it = getItalyTime()
    setNow(it)
    setToday(it)
    const timer = setInterval(() => setNow(getItalyTime()), 1000)
    return () => clearInterval(timer)
  }, [setNow, setToday])
}
