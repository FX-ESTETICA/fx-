import { supabase, isMockMode } from "@/lib/supabase";
import { BookingDetails, DB_Booking } from "../types";
import { BookingAdapter } from "../utils/adapter";

/**
 * BookingService - 预约模块 API 交互层
 * 封装 Supabase 增删改查逻辑，实现 UI 与 物理数据库的震荡隔离
 */
export const BookingService = {
  /**
   * 提交新预约
   */
  async createBooking(details: BookingDetails): Promise<BookingDetails> {
    if (isMockMode) {
      console.log("[GX-SANDBOX] Mocking createBooking...");
      return { ...details, id: `mock-id-${Date.now()}`, status: "pending", createdAt: new Date().toISOString() };
    }
    const dbData = BookingAdapter.toDB(details);
    
    const { data, error } = await supabase
      .from('bookings')
      .insert([dbData])
      .select()
      .single();

    if (error) {
      console.error("[BookingService] Insert Error:", error);
      throw new Error(error.message || "数据库写入失败 / Database Insertion Failed");
    }

    if (!data) {
      throw new Error("未返回数据 / No data returned");
    }

    return BookingAdapter.fromDB(data as DB_Booking);
  },

  /**
   * 订阅单个预约的状态变更
   */
  subscribeToBooking(bookingId: string, onUpdate: (details: BookingDetails) => void) {
    if (isMockMode || !bookingId) return null;

    const channel = supabase
      .channel(`booking-updates-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`
        },
        (payload) => {
          console.log('[BookingService] Realtime Update Received:', payload);
          const updatedBooking = BookingAdapter.fromDB(payload.new as DB_Booking);
          onUpdate(updatedBooking);
        }
      )
      .subscribe();

    return channel;
  },

  /**
   * 订阅全量预约变更（商家端看板）
   */
  subscribeToAllBookings(onEvent: (payload: any) => void) {
    if (isMockMode) return null;

    const channel = supabase
      .channel('merchant-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          onEvent(payload);
        }
      )
      .subscribe();

    return channel;
  },

  /**
   * 取消订阅
   */
  async unsubscribe(channel: any) {
    if (isMockMode || !channel) return;
    await supabase.removeChannel(channel);
  }
};
