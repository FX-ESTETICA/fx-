import { supabase, isMockMode } from "@/lib/supabase";
import { BookingDetails, DB_Booking } from "../types";
import { BookingAdapter } from "../utils/adapter";

/**
 * BookingService - 预约模块 API 交互层
 * 封装 Supabase 增删改查逻辑，实现 UI 与 物理数据库的震荡隔离
 */
export const BookingService = {
  /**
   * 通过手机号查询 C 端用户档案 (用于日历右侧双轨 ID 面板匹配)
   */
  async getProfileByPhone(phone: string) {
    if (isMockMode) {
      console.log("[BookingService] isMockMode=true, skipping real DB call");
      if (phone === "6667767" || phone === "3758376") {
        return {
          data: {
            gx_id: "GX-UR-100024",
            name: "赛博浪客 (Mock)",
            avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=gx-vip",
            role: "user"
          }
        };
      }
      return { data: null };
    }

    if (!phone) return { data: null };

    console.log("[BookingService] Querying real DB for phone:", phone);
    const { data, error } = await supabase
      .from('profiles')
      .select('gx_id, name, avatar_url, role')
      .eq('phone', phone)
      .maybeSingle();

    console.log("[BookingService] DB Response:", data, error);

    if (error) {
      console.error("[BookingService] getProfileByPhone Error:", error);
      return { data: null };
    }

    return { data };
  },

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

  // --- 零束缚架构扩展方法 ---

  async getConfigs(shopId: string) {
    if (isMockMode) return { data: null };
    
    // 如果没有传入合法的 shopId（比如 default），则不查询直接返回，避免触发 UUID 格式错误
    if (!shopId || shopId === 'default') {
      return { data: null };
    }
    
    const { data, error } = await supabase
      .from('shops')
      .select('config')
      .eq('id', shopId)
      .maybeSingle(); // 使用 maybeSingle 避免 0 行数据时抛出报错
      
    if (error) {
      console.error("[BookingService] getConfigs Error:", error);
      return { data: null };
    }
    
    return { data: data?.config };
  },

  async updateConfigs(shopId: string, key: string, payload: any) {
    if (isMockMode) return;
    
    if (!shopId || shopId === 'default') {
      console.warn("[BookingService] 试图更新 default shop 的配置，已拦截");
      return;
    }
    
    // 获取当前 config
    const { data: shopData } = await supabase
      .from('shops')
      .select('config')
      .eq('id', shopId)
      .maybeSingle();
      
    const currentConfig = shopData?.config || {};
    currentConfig[key] = payload;

    const { error } = await supabase
      .from('shops')
      .update({ config: currentConfig })
      .eq('id', shopId);

    if (error) {
      console.error("[BookingService] updateConfigs Error:", error);
      throw error;
    }
  },

  async bindUserToShop(userId: string, shopId: string) {
    if (isMockMode) return;
    
    if (!userId || !shopId || shopId === 'default') {
       console.warn("[BookingService] 绑定的 userId 或 shopId 不合法");
       return;
    }
    
    const { error } = await supabase
      .from('bindings')
      .upsert({ principal_id: userId, shop_id: shopId, role: 'STAFF' }, { onConflict: 'principal_id, shop_id' });
      
    if (error) {
      console.error("[BookingService] bindUserToShop Error:", error);
      throw error;
    }
  },

  async getBookings(shopId: string) {
    if (isMockMode) return { data: [] };
    
    if (!shopId || shopId === 'default') {
       return { data: [] };
    }
    
    const { data, error } = await supabase
      .from('v_bookings')
      .select('*')
      .eq('shop_id', shopId);
      
    if (error) {
      console.error("[BookingService] getBookings Error:", error);
      return { data: [] };
    }
    
    // 铺平 JSONB
    const formatted = (data || []).map(b => ({
      id: b.id,
      shopId: b.shop_id,
      date: b.date,
      startTime: b.start_time,
      duration: b.duration_min,
      resourceId: b.resource_id,
      status: b.status,
      ...(b.data || {})
    }));
    
    return { data: formatted };
  },

  async upsertBookings(bookings: any[]) {
    if (isMockMode) return;
    
    const bookingsToUpsert = bookings.map(b => {
      const {
        id, shopId, date, startTime, duration, resourceId, status, ...restData
      } = b;

      const isDbId = id && String(id).includes('-');

      return {
        ...(isDbId ? { id } : {}),
        shop_id: shopId || 'default',
        date: date,
        start_time: startTime,
        duration_min: duration || 60,
        resource_id: resourceId,
        status: status || 'PENDING',
        data: {
          ...restData,
          original_frontend_id: id
        }
      };
    });

    const { error } = await supabase
      .from('bookings')
      .upsert(bookingsToUpsert, { onConflict: 'id' });

    if (error) {
      console.error("[BookingService] upsertBookings Error:", error);
      throw error;
    }
  },

  async clearAllBookings(shopId: string) {
    if (isMockMode) return;
    
    if (!shopId || shopId === 'default') {
       return;
    }
    
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('shop_id', shopId);
      
    if (error) {
      console.error("[BookingService] clearAllBookings Error:", error);
      throw error;
    }
  },

  subscribeToAllBookings(onUpdate: (payload: any) => void) {
    if (isMockMode) return null;

    const channel = supabase
      .channel('public:bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();

    return channel;
  },

  unsubscribe(channel: any) {
    if (channel) {
      supabase.removeChannel(channel);
    }
  },

  // --- Merchant Application Singleton Query (完美修复法则) ---
  
  _pendingApplicationQuery: null as Promise<any> | null,

  async getMerchantApplicationStatus(userId: string): Promise<{ data: any | null }> {
    if (isMockMode || !userId) return { data: null };

    // 如果已经有请求在飞，直接返回它（单例锁机制）
    if (this._pendingApplicationQuery) {
      return this._pendingApplicationQuery;
    }

    // 发起真实请求并锁住
    this._pendingApplicationQuery = supabase
      .from('merchant_applications')
      .select('status, brand_name')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data, error }) => {
        // 请求完成，清除锁
        this._pendingApplicationQuery = null;
        
        // 静默吞噬：找不到数据 (PGRST116) 或 AbortError (Lock broken)
        if (error) {
          if (
            error.code === 'PGRST116' || 
            Object.keys(error).length === 0 || 
            error.message?.includes('AbortError') ||
            error.message?.includes('Lock')
          ) {
            return { data: null };
          }
          console.error("[BookingService] getMerchantApplicationStatus Error:", error);
          return { data: null };
        }
        
        return { data };
      })
      .catch((err) => {
        this._pendingApplicationQuery = null;
        console.error("[BookingService] Query failed:", err);
        return { data: null };
      });

    return this._pendingApplicationQuery;
  }
};
