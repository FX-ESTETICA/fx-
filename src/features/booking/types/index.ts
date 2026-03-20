import { IndustryType } from "@/features/calendar/types";

export type BookingStep = "form" | "confirmation" | "success" | "failure";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface BookingDetails {
  id?: string;
  industry: IndustryType;
  serviceId: string;
  serviceName: string;
  date: string;
  timeSlot: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  price?: number;
  currency?: string;
  status?: BookingStatus;
  createdAt?: string;
}

/**
 * DB_Booking - Supabase 物理表结构定义
 * 采用下划线命名法与数据库保持一致
 */
export interface DB_Booking {
  id: string;
  industry_type: string;
  service_id: string;
  service_name: string;
  booking_date: string;
  time_slot: string;
  customer_name: string;
  customer_phone: string;
  notes: string | null;
  price: number | null;
  currency: string | null;
  status: BookingStatus;
  created_at: string;
}

export interface BookingState {
  step: BookingStep;
  details: BookingDetails | null;
  error?: string;
}
