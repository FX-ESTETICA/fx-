import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ 缺少 Supabase 环境变量。请使用 --env-file=.env.local 运行");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runChaosEngine() {
  console.log("🔥 [GX 零号混沌协议] 启动...");

  // 1. 获取一个真实的 Shop ID
  const { data: shops, error: shopError } = await supabase.from('shops').select('id, name').limit(1);
  if (shopError || !shops || shops.length === 0) {
    console.error("❌ 无法获取门店信息，请确保数据库中有至少一家门店", shopError);
    process.exit(1);
  }
  
  const shopId = shops[0].id;
  console.log(`🎯 锁定目标门店: ${shops[0].name} (${shopId})`);

  // 今天的日期，格式 YYYY-MM-DD
  const today = new Date();
  // 考虑到时区，这里简单取本地日期字符串
  const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  
  console.log(`📅 锁定攻击日期: ${dateStr}`);

  // 获取真实的 resource_id (UUID) 从 profiles 表
  const { data: resources, error: resourcesError } = await supabase.from('profiles').select('id').limit(2);
  let staff1 = null;
  let staff2 = null;
  
  if (resourcesError) {
    console.error("❌ 无法获取资源信息:", resourcesError);
    process.exit(1);
  }
  
  if (resources && resources.length > 0) {
    staff1 = resources[0].id;
    if (resources.length > 1) {
      staff2 = resources[1].id;
    } else {
      staff2 = resources[0].id;
    }
  } else {
    console.log("⚠️ 该店铺没有 resources (员工/资源)，使用 null 作为 resource_id...");
  }

  // 构造极端数据包
  const chaosPayloads = [
    // --- 雷区一：金额精度的浮点与溢出 ---
    {
      shop_id: shopId,
      date: dateStr,
      start_time: "09:00",
      duration_min: 60,
      resource_id: staff1,
      status: "PENDING",
      data: {
        customerName: "浮点数毁灭者",
        customerPhone: "13800000001",
        services: [{ id: "s1", name: "纳米级剪发", prices: [0.0000001], duration: 60 }],
        totalPrice: 0.0000001,
        notes: "测试超小浮点数金额"
      }
    },
    {
      shop_id: shopId,
      date: dateStr,
      start_time: "10:00",
      duration_min: 60,
      resource_id: staff2,
      status: "CONFIRMED",
      data: {
        customerName: "大数溢出巨兽",
        customerPhone: "13800000002",
        services: [{ id: "s2", name: "星际级染发", prices: [99999999999999.99], duration: 60 }],
        totalPrice: 99999999999999.99,
        notes: "测试极限大数溢出"
      }
    },

    // --- 雷区二：幽灵时长与跨日切割 ---
    {
      shop_id: shopId,
      date: dateStr,
      start_time: "23:50",
      duration_min: 120, // 跨越到第二天凌晨 01:50
      resource_id: staff1,
      status: "PENDING",
      data: {
        customerName: "午夜幽灵单",
        customerPhone: "13800000003",
        services: [{ id: "s3", name: "跨日修仙", prices: [198], duration: 120 }],
        notes: "测试日历底层矩阵是否会撑爆或无限滚动"
      }
    },
    {
      shop_id: shopId,
      date: dateStr,
      start_time: "12:00",
      duration_min: 1, // 极小时长
      resource_id: staff2,
      status: "PENDING",
      data: {
        customerName: "一瞬即逝者",
        customerPhone: "13800000004",
        services: [{ id: "s4", name: "微秒服务", prices: [100], duration: 1 }],
        notes: "测试高度极小时的 UI 堆叠"
      }
    },

    // --- 雷区三：JSONB 空指针与残缺数据 ---
    {
      shop_id: shopId,
      date: dateStr,
      start_time: "14:00",
      duration_min: 45,
      resource_id: staff1,
      status: "PENDING",
      data: {
        // 故意漏掉 customerName, customerPhone
        // 故意让 services 为空数组或 null
        services: [], 
        notes: "数据黑洞测试，极度残缺的 JSONB"
      }
    },

    // --- 雷区四：微秒级并发与寻位击穿 ---
    // 下面三条记录同时抢占 16:00 的 staff_2 资源
    {
      shop_id: shopId,
      date: dateStr,
      start_time: "16:00",
      duration_min: 30,
      resource_id: staff2,
      status: "PENDING",
      data: {
        customerName: "并发冲击 Alpha",
        services: [{ id: "s5", name: "冲突检测A", prices: [50], duration: 30 }]
      }
    },
    {
      shop_id: shopId,
      date: dateStr,
      start_time: "16:00",
      duration_min: 45,
      resource_id: staff2,
      status: "CONFIRMED",
      data: {
        customerName: "并发冲击 Beta",
        services: [{ id: "s6", name: "冲突检测B", prices: [80], duration: 45 }]
      }
    },
    {
      shop_id: shopId,
      date: dateStr,
      start_time: "16:00",
      duration_min: 60,
      resource_id: staff2,
      status: "PENDING",
      data: {
        customerName: "并发冲击 Gamma",
        services: [{ id: "s7", name: "冲突检测C", prices: [100], duration: 60 }]
      }
    }
  ];

  console.log("⚔️ 开始向物理表注入极端畸形数据...");
  
  // 使用 Promise.all 并发注入，模拟极端的真实网络情况
  const results = await Promise.allSettled(
    chaosPayloads.map(payload => 
      supabase.from('bookings').insert([payload])
    )
  );

  let successCount = 0;
  let failCount = 0;

  results.forEach((res, index) => {
    if (res.status === 'fulfilled' && !res.value.error) {
      successCount++;
    } else {
      failCount++;
      console.error(`❌ 注入失败 [记录 ${index}]:`, res.status === 'fulfilled' ? res.value.error : res.reason);
    }
  });

  console.log(`\n✅ 混沌注入完成! 成功: ${successCount}, 失败: ${failCount}`);
  console.log("==========================================");
  console.log("🚨 请立即打开浏览器查看以下组件是否崩溃：");
  console.log("1. MerchantDashboard (看控制台是否因为服务为空、浮点数导致白屏或数字乱码)");
  console.log("2. EliteResourceMatrix (看 23:50 跨日订单、负数时长订单、16:00 连环撞车订单是否导致日历撑爆遮挡)");
  console.log("==========================================");
}

runChaosEngine();
