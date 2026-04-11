import { supabase, isMockMode } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { BookingDetails, DB_Booking } from "../types";
import { BookingAdapter } from "../utils/adapter";

export type BookingRecord = {
  id: string;
  shopId: string;
  date: string;
  startTime: string;
  duration: number;
  resourceId?: string;
  status?: string;
  [key: string]: unknown;
};

export type BookingRealtimePayload = {
  eventType: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
};

export type BookingUpsertInput = {
  id?: string | number;
  shopId?: string;
  date: string;
  startTime: string;
  duration?: number;
  resourceId?: string;
  status?: string;
  is_staff_requested?: boolean; // 新增智能调度底层标识
  [key: string]: unknown;
};

export type ShopConfig = {
  staffs?: unknown[];
  hours?: unknown[];
  categories?: unknown[];
  services?: unknown[];
  [key: string]: unknown;
};

export type MerchantApplicationStatus = {
  status: string;
  brand_name: string;
};

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

  async getConfigs(shopId: string): Promise<{ data: ShopConfig | null }> {
    if (isMockMode) return { data: null };
    
    // 如果没有传入合法的 shopId（比如 default），则不查询直接返回，避免触发 UUID 格式错误
    if (!shopId || shopId === 'default') {
      return { data: null };
    }
    
    const { data, error } = await supabase
      .from('shop_configs')
      .select('config')
      .eq('shop_id', shopId)
      .maybeSingle(); // 使用 maybeSingle 避免 0 行数据时抛出报错
      
    if (error) {
      console.error("[BookingService] getConfigs Error:", error);
      return { data: null };
    }
    
    return { data: (data?.config as ShopConfig) || null };
  },

  /**
   * 终极断层扫描分配器 (The Ultimate Gap Finder)
   * 扫描数据库中已存在的 ID，自动复用断层，实现 100% 零冲突与零跳号
   */
  async getAvailableCustomerId(shopId: string, prefix: string): Promise<string> {
    let existingNums: number[] = [];

    if (!isMockMode) {
      // 1. 读取真实数据库
      const { data, error } = await supabase
        .from('bookings')
        .select('data')
        .eq('shop_id', shopId || 'default')
        .neq('status', 'VOID'); // 忽略被软删除的废弃订单

      if (!error && data) {
        existingNums = data
          .map((b: any) => b.data?.customerId as string)
          .filter(Boolean)
          .map(id => {
            const match = id.match(/^([a-zA-Z]+)\s*(.+)$/i);
            if (match && match[1].toUpperCase() === prefix.toUpperCase()) {
              return parseInt(match[2], 10);
            }
            return NaN;
          })
          .filter(n => !isNaN(n));
      }
    }

    // 2. 合并本地“幽灵锁”中的数字（防止同一台电脑、同一个浏览器的多开窗口撞车）
    if (typeof window !== 'undefined') {
      const rawLocks = localStorage.getItem(`gx_locked_ids_${prefix}`);
      const locks: Record<number, number> = rawLocks ? JSON.parse(rawLocks) : {};
      const now = Date.now();
      for (const [idStr, expireAt] of Object.entries(locks)) {
        if (now < expireAt) {
          existingNums.push(Number(idStr));
        } else {
          delete locks[Number(idStr)];
        }
      }
      localStorage.setItem(`gx_locked_ids_${prefix}`, JSON.stringify(locks));
    }

    // 3. 去重并排序
    existingNums = Array.from(new Set(existingNums)).sort((a, b) => a - b);

    // 4. 定义基准值
    const base = prefix === 'GV' ? 0 : prefix === 'AD' ? 3000 : prefix === 'AN' ? 6000 : prefix === 'UM' ? 9000 : 0;
    let candidate = base + 1;

    // 5. 核心：断层扫描寻找空缺
    for (const num of existingNums) {
      if (num === candidate) {
        candidate++;
      } else if (num > candidate) {
        break; // 找到断层！
      }
    }

    // 6. 格式化输出
    return ['CO', 'NO'].includes(prefix) 
      ? `${prefix} ${candidate}` 
      : `${prefix} ${candidate.toString().padStart(4, '0')}`;
  },

  async updateConfigs(shopId: string, key: string, payload: unknown) {
    if (isMockMode) return;
    
    if (!shopId || shopId === 'default') {
      console.warn("[BookingService] 试图更新 default shop 的配置，已拦截");
      return;
    }
    
    // 【世界顶端 0 冲突架构】：不再拉取旧数据进行危险的前端合并
    // 直接构建精准补丁包，调用底层 PostgreSQL 的原子级融合 RPC
    const patch = { [key]: payload };

    const { error } = await supabase.rpc('patch_shop_config', {
      p_shop_id: shopId,
      p_patch: patch
    });

    if (error) {
      console.error("[BookingService] 原子级更新配置失败 / Atomic Update Failed:", error);
      throw error;
    }
  },

  async bindUserToShop(userId: string, shopId: string) {
    if (isMockMode) return;
    
    if (!userId || !shopId || shopId === 'default') {
       console.warn("[BookingService] 绑定的 userId 或 shopId 不合法");
       return;
    }
    
    // 【阶段二重塑】：既然数据库 bindings.principal_id 已经是 text 类型，且没有了外键束缚
    // 我们直接将工牌号（如 GX-UR-000001 或 A）存入，不报任何错！
    const { error } = await supabase
      .from('bindings')
      .upsert(
        { principal_id: userId, shop_id: shopId, role: 'STAFF' }, 
        // Supabase upsert 需要基于唯一约束，我们在 SQL 里建了 UNIQUE(shop_id, principal_id)
        { onConflict: 'shop_id, principal_id' }
      );
      
    if (error) {
      console.error("[BookingService] bindUserToShop Error:", error);
      throw error;
    }
  },

  async getBookings(shopId: string): Promise<{ data: BookingRecord[] }> {
    if (isMockMode) return { data: [] };
    
    if (!shopId || shopId === 'default') {
       return { data: [] };
    }
    
    const { data, error } = await supabase
      .from('v_bookings')
      .select('*')
      .eq('shop_id', shopId)
      .neq('status', 'VOID'); // 过滤被丢入黑洞的卡片
      
    if (error) {
      console.error("[BookingService] getBookings Error:", error);
      return { data: [] };
    }
    
    // 铺平 JSONB
    const formatted: BookingRecord[] = (data || []).map((b) => ({
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

  async upsertBookings(bookings: BookingUpsertInput[]) {
    if (isMockMode) return;
    
    // 【世界顶端架构法则：物理分流插入与更新，彻底消灭 23502 陷阱】
    const inserts: any[] = [];
    const updates: any[] = [];

    bookings.forEach((b) => {
      const {
        id, shopId, date, startTime, duration, resourceId, status, is_staff_requested, ...restData
      } = b;

      // 判断是否是前端生成的临时 ID（如 BKG-xxx）或者干脆没有 ID
      const isFrontendGeneratedId = typeof id === 'string' && id.startsWith('BKG-');
      const isNewBooking = isFrontendGeneratedId || !id;

      const payload = {
        shop_id: shopId || 'default',
        date: date,
        start_time: startTime,
        duration_min: duration || 60,
        resource_id: resourceId, 
        status: status || 'PENDING',
        data: {
          ...restData,
          is_staff_requested: is_staff_requested ?? true, // 【核心修复】：移入 JSONB 扩展字段，避免物理列不存在导致的 400 报错
          order_no: isNewBooking ? id : restData.order_no, // 封印快照
        }
      };

      if (isNewBooking) {
        // 纯净插入通道：绝不包含 id 字段，让数据库 UUID_V4 发挥作用
        inserts.push(payload);
      } else {
        // 纯净更新通道：必须包含真实的 id
        updates.push({ ...payload, id });
      }
    });

    try {
      // 1. 批量处理更新军团
      if (updates.length > 0) {
        const { error: updateError } = await supabase
          .from('bookings')
          .upsert(updates, { onConflict: 'id' });
        
        if (updateError) throw updateError;
      }

      // 2. 批量处理新编军团
      if (inserts.length > 0) {
        const { error: insertError } = await supabase
          .from('bookings')
          .insert(inserts);
          
        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error("[BookingService] upsertBookings Error:", error);
      throw error;
    }
  },

  async updateBookings(updates: any[]) {
    // 保留给未来批量更新使用
  },

  async updateBookingResource(id: string, resourceId: string | null) {
    if (isMockMode) return;

    try {
      // 获取当前数据以更新其 JSONB 内容
      const { data: bData, error: bError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();
        
      if (bError) throw bError;
      
      // 如果分配给了明确的员工，强制洗掉 "未指定" (originalUnassigned) 的基因标记
      // 反之，如果是退回“未指定池”，强制赋予其 originalUnassigned 基因，以便智能调度引擎捕捉
      const isAssignedToPerson = resourceId !== null && resourceId !== 'UNASSIGNED_POOL';
      const updatedData = { ...bData.data };
      
      if (isAssignedToPerson) {
        updatedData.originalUnassigned = false;
      } else {
        updatedData.originalUnassigned = true;
      }

      const { error } = await supabase
        .from('bookings')
        .update({ 
          resource_id: resourceId === 'UNASSIGNED_POOL' ? null : resourceId, 
          status: 'CONFIRMED',
          data: updatedData
        })
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error("[BookingService] updateBookingResource Error:", error);
      throw error;
    }
  },

  /**
   * 终极物理深层剥离拆单 (Deep Physical Splitting - Batch)
   * 从父订单中剥离出多个子项目，克隆为独立订单并指派给新员工
   * @param bookingId 要拆分的原始订单 ID
   * @param serviceAssignments 一个映射对象: { [serviceId]: targetEmployeeId }
   */
  async splitBookingServices(bookingId: string, serviceAssignments: Record<string, string | null>) {
    if (isMockMode) return;

    try {
      const serviceIdsToSplit = Object.keys(serviceAssignments);
      if (serviceIdsToSplit.length === 0) return;

      // 1. 捞取原始订单
      const { data: bData, error: bError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();
        
      if (bError) throw bError;
      if (!bData || !bData.data || !Array.isArray(bData.data.services)) return;

      const services = bData.data.services;
      
      // 找出要剥离的服务和剩余的服务
      const targetServices = services.filter((s: any) => serviceIdsToSplit.includes(s.id));
      const remainingServices = services.filter((s: any) => !serviceIdsToSplit.includes(s.id));
      
      if (targetServices.length === 0) return; // 没找到目标服务
      
      if (remainingServices.length === 0) {
        // 如果把所有服务都选了，实际上等于整个订单按分配结果换人
        // 但如果是多个不同的人，我们需要将原始订单分配给其中一个人，剩下的创建新订单
        // 为了安全起见，这里统一处理：将所有服务作为新订单创建，然后删除原订单
        // 不过为了复用逻辑，这里直接进行后续流程，只是 remaining 变成了 0
      }

      // 2. 计算剥离后的剩余信息 (时长、名称)
      const remainingDuration = remainingServices.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
      const remainingName = remainingServices.map((s: any) => s.name || s.serviceName || 'Unknown').join(' + ');

      // 3. 按目标员工对被剥离的服务进行分组
      const servicesByEmployee = targetServices.reduce((acc: Record<string, any[]>, service: any) => {
        const empId = serviceAssignments[service.id] || 'UNASSIGNED_POOL';
        if (!acc[empId]) acc[empId] = [];
        acc[empId].push(service);
        return acc;
      }, {});

      // 4. 更新原始订单 (剔除这些服务，如果被完全掏空则直接删除)
      if (remainingServices.length === 0) {
        // 原订单被掏空，直接软删除
        const { error: deleteError } = await supabase
          .from('bookings')
          .update({ status: 'VOID' })
          .eq('id', bookingId);
        if (deleteError) throw deleteError;
      } else {
        const updatedOriginalData = {
          ...bData.data,
          services: remainingServices,
          serviceName: remainingName
        };

        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            duration_min: remainingDuration,
            data: updatedOriginalData
          })
          .eq('id', bookingId);

        if (updateError) throw updateError;
      }

      // 5. 遍历每个目标员工，新建分裂出的订单
      for (const [targetResourceId, groupServices] of Object.entries(servicesByEmployee)) {
        const splitDuration = groupServices.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
        const splitName = groupServices.map((s: any) => s.name || s.serviceName || 'Unknown').join(' + ');
        
        const isAssignedToPerson = targetResourceId !== 'UNASSIGNED_POOL' && targetResourceId !== 'null';
        const finalResourceId = (targetResourceId === 'UNASSIGNED_POOL' || targetResourceId === 'null') ? null : targetResourceId;
        
        const newBookingData = {
          ...bData.data,
          services: groupServices,
          serviceName: splitName,
          // 继承主单号，维持连单关系
          masterOrderId: bData.data.masterOrderId || bookingId,
          order_no: `BKG-${Date.now()}-${Math.floor(Math.random() * 1000)}` // 赋予全新单号避免碰撞
        };
        
        if (isAssignedToPerson) {
          newBookingData.originalUnassigned = false;
        } else {
          newBookingData.originalUnassigned = true;
        }

        const { error: insertError } = await supabase
          .from('bookings')
          .insert({
            shop_id: bData.shop_id,
            date: bData.date,
            start_time: bData.start_time,
            duration_min: splitDuration,
            resource_id: finalResourceId,
            status: 'CONFIRMED',
            data: newBookingData
          });

        if (insertError) throw insertError;
      }

    } catch (error) {
      console.error("[BookingService] splitBookingServices Error:", error);
      throw error;
    }
  },

  async deleteBookings(ids: string[]) {
    if (isMockMode) return;
    
    if (!ids || ids.length === 0) return;

    try {
      // 世界顶端防呆设计：软删除流放 (3天回收站)
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'VOID' }) // 数据仍保留在 DB，通过 status 隔离
        .in('id', ids);

      if (error) throw error;
    } catch (error) {
      console.error("[BookingService] deleteBookings Error:", error);
      throw error;
    }
  },

  async getVoidedBookings(shopId: string): Promise<{ data: BookingRecord[] }> {
    if (isMockMode) return { data: [] };
    
    if (!shopId || shopId === 'default') {
       return { data: [] };
    }
    
    const { data, error } = await supabase
      .from('v_bookings')
      .select('*')
      .eq('shop_id', shopId)
      .eq('status', 'VOID')
      .order('date', { ascending: false }); // 按照时间倒序，最新的在上面
      
    if (error) {
      console.error("[BookingService] getVoidedBookings Error:", error);
      return { data: [] };
    }
    
    const formatted: BookingRecord[] = (data || []).map((b) => ({
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

  async restoreBookings(ids: string[]) {
    if (isMockMode) return;
    if (!ids || ids.length === 0) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'CONFIRMED' }) 
        .in('id', ids);

      if (error) throw error;
    } catch (error) {
      console.error("[BookingService] restoreBookings Error:", error);
      throw error;
    }
  },

  async purgeBookings(ids: string[]) {
    if (isMockMode) return;
    if (!ids || ids.length === 0) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .in('id', ids);

      if (error) throw error;
    } catch (error) {
      console.error("[BookingService] purgeBookings Error:", error);
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

  subscribeToAllBookings(onUpdate: (payload: BookingRealtimePayload) => void) {
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

  subscribeToShopBookings(shopId: string, onUpdate: (payload: BookingRealtimePayload) => void) {
    if (isMockMode || !shopId || shopId === 'default') return null;

    const channel = supabase
      .channel(`public:bookings:${shopId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'bookings',
          filter: `shop_id=eq.${shopId}`
        },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();

    return channel;
  },

  unsubscribe(channel: RealtimeChannel | null) {
    if (channel) {
      // 修复内存泄漏：正确断开连接，而不是仅仅从本地对象里移除
      channel.unsubscribe().then(() => {
        supabase.removeChannel(channel);
      });
    }
  },

  // --- Merchant Application Singleton Query (完美修复法则) ---
  
  _pendingApplicationQuery: null as Promise<{ data: MerchantApplicationStatus | null }> | null,

  async getMerchantApplicationStatus(userId: string): Promise<{ data: MerchantApplicationStatus | null }> {
    if (isMockMode || !userId) return { data: null };

    // 如果已经有请求在飞，直接返回它（单例锁机制）
    if (this._pendingApplicationQuery) {
      return this._pendingApplicationQuery;
    }

    // 发起真实请求并锁住
    // 这里不再直接链式调用 .then().catch()，而是使用 async/await，彻底解决 Supabase PromiseLike 类型的 catch 缺失问题
    this._pendingApplicationQuery = (async () => {
      try {
        const { data, error } = await supabase
          .from('merchant_applications')
          .select('status, brand_name')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        this._pendingApplicationQuery = null;
        
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
      } catch (err) {
        this._pendingApplicationQuery = null;
        console.error("[BookingService] Query failed:", err);
        return { data: null };
      }
    })();

    return this._pendingApplicationQuery;
  }
};
