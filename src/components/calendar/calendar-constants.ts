import { generateTimeSlots } from '@/utils/calendar-helpers';

export const SLOT_INTERVAL = 15; // Minutes per selection block
export const HOUR_HEIGHT = 5; // Height for 1 hour in rem
export const MINUTE_HEIGHT = HOUR_HEIGHT / 60; // Rem per minute
export const SLOT_HEIGHT = (SLOT_INTERVAL / 60) * HOUR_HEIGHT; // Rem per slot (15 min = 1.25rem)

export const TIME_SLOTS = generateTimeSlots(8, 20, SLOT_INTERVAL);
