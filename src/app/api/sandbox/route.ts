import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// 初始化 Redis 客户端 (需要防范构建时的空环境变量)
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || 'https://mock.url',
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || 'mock_token',
});

// 存储在 Redis 中的 Key
const DB_KEY = 'gx_sandbox_db';
// 数据防爆阈值：最大保存 2000 条预约记录 (约 1MB)
const MAX_BOOKINGS = 2000;

export async function GET() {
  try {
    // 从云端拉取数据，如果没有则返回默认结构 (新增 shop_configs)
    const db = await redis.get(DB_KEY) || { bookings: [], bindings: {}, shop_configs: {} };
    return NextResponse.json(db);
  } catch (error) {
    console.error('Failed to read from Redis:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, payload } = await request.json();
    
    // 先获取当前数据
    const currentDb: any = await redis.get(DB_KEY) || { bookings: [], bindings: {}, shop_configs: {} };

    if (action === 'update_bookings') {
      // LRU 数据防爆策略：如果超过 2000 条，剔除最旧的数据
      let newBookings = payload;
      if (Array.isArray(newBookings) && newBookings.length > MAX_BOOKINGS) {
        const overflow = newBookings.length - MAX_BOOKINGS;
        newBookings = newBookings.slice(overflow);
      }
      currentDb.bookings = newBookings;
    } else if (action === 'update_bindings') {
      if (!currentDb.bindings) currentDb.bindings = {};
      currentDb.bindings[payload.userId] = payload.shopId;
    } else if (action === 'clear_bindings') {
       if (!currentDb.bindings) currentDb.bindings = {};
       delete currentDb.bindings[payload.userId];
    } else if (action === 'update_shop_config') {
       // payload: { shopId: 'shop_f', industry: 'beauty' }
       if (!currentDb.shop_configs) currentDb.shop_configs = {};
       currentDb.shop_configs[payload.shopId] = payload.industry;
    } else {
      // 兼容旧的全量覆盖逻辑 (带防爆)
      if (payload && Array.isArray(payload)) {
        let newBookings = payload;
        if (newBookings.length > MAX_BOOKINGS) {
          newBookings = newBookings.slice(newBookings.length - MAX_BOOKINGS);
        }
        currentDb.bookings = newBookings;
      }
    }
    
    // 将更新后的数据写回云端 Redis 桶
    await redis.set(DB_KEY, currentDb);
    
    return NextResponse.json({ success: true, db: currentDb });
  } catch (error) {
    console.error('Failed to write to Redis:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
