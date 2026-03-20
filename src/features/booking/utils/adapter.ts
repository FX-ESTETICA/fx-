import { BookingDetails, DB_Booking, BookingStatus } from "../types";

/**
 * BookingAdapter - 震荡隔离层
 * 负责 UI 数据模型 (CamelCase) 与 数据库数据模型 (SnakeCase) 的双向映射
 */
export const BookingAdapter = {
  /**
   * 将 UI 数据转换为数据库存储格式
   */
  toDB(details: BookingDetails): Partial<DB_Booking> {
    return {
      industry_type: details.industry,
      service_id: details.serviceId,
      service_name: details.serviceName,
      booking_date: details.date,
      time_slot: details.timeSlot,
      customer_name: details.customerName,
      customer_phone: details.customerPhone,
      notes: details.notes || null,
      price: details.price || null,
      currency: details.currency || null,
      status: (details.status as BookingStatus) || "pending",
    };
  },

  /**
   * 将数据库数据还原为 UI 使用格式
   */
  fromDB(db: DB_Booking): BookingDetails {
    return {
      id: db.id,
      industry: db.industry_type as any,
      serviceId: db.service_id,
      serviceName: db.service_name,
      date: db.booking_date,
      timeSlot: db.time_slot,
      customerName: db.customer_name,
      customerPhone: db.customer_phone,
      notes: db.notes || undefined,
      price: db.price || undefined,
      currency: db.currency || undefined,
      status: db.status,
      createdAt: db.created_at,
    };
  }
};
