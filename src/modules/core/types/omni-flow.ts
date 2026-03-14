/**
 * Omni-Flow 原子化核心类型定义
 * 这是整个系统的“共同语言”，确保所有模块对资源、服务和预约的理解一致。
 */

// 0. 行业分类
export type IndustryType = 'beauty' | 'restaurant' | 'car_wash' | 'hotel' | 'generic';

// 1. 资源类型 (Resource) - 涵盖人、空间、设备
export type ResourceType = 'human' | 'space' | 'equipment';

export interface Resource {
  id: string;
  merchant_id: string;
  name: string;
  type: ResourceType; // 之前是 type
  avatar_url?: string;
  commission_rate: number; // 0.1 代表 10%
  is_active: boolean;
  resource_type: ResourceType; // 对应数据库新字段
  industry_metadata: Record<string, any>; // 对应数据库新字段
  commission_contract: Record<string, any>; // 对应数据库新字段
  metadata?: Record<string, any>; // 保持向下兼容
  created_at: string;
}

// 2. 服务项目类型 (Service)
export interface Service {
  id: string;
  merchant_id: string;
  name: string;
  base_price: number; // 基础价格
  price: number; // 冗余字段，保持向下兼容
  duration: number; // 分钟
  industry_type: IndustryType; // 所属行业
  category?: string; // 行业分类（旧）
  industry_category?: string; // 对应数据库新字段：例如“洗美”、“维保”
  ui_color?: string;
  ui_config: Record<string, any>; // 对应数据库新字段：定义颜色、图标、3D模型、桌位图坐标等
  resource_requirements?: Record<string, any>; // 资源需求：例如需要特定的工位或资质
  metadata?: Record<string, any>;
  created_at: string;
}

// 6. 全球服务护照类型 (Global Service Passport)
export interface GlobalPassport {
  id: string; // G-ID (Global ID)
  phone_number: string;
  customer_name?: string;
  avatar_url?: string;
  identity_hash?: string; // 加密标识，用于跨店识别
  home_merchant_id?: string; // 归属商户 ID
  preferences: Record<string, any>; // 全球偏好：过敏史、洗车习惯、口味偏好等
  loyalty_points: number; // 全球通用积分
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

// 3. 预约状态 (Booking Status)
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'deleted';

// 4. 预约主表类型 (Booking/Event)
export interface Booking {
  id: string;
  merchant_id: string;
  merchant_name?: string;
  customer_name: string;
  customer_id?: string;
  global_id?: string;       // 对应数据库新字段：全球通行证 ID
  service_item: string;     // 对应数据库：service_item (之前是 "服务项目")
  service_date: string;    // YYYY-MM-DD
  start_time: string;      // HH:mm:ss
  duration: number;
  status: BookingStatus;
  total_amount: number;
  bg_color: string;         // 对应数据库：bg_color (之前是 "背景颜色")
  notes?: string;           // 对应数据库：notes (之前是 "备注")
  dynamic_price_factor: number; // 对应数据库新字段：动态价格系数
  context_snapshot: Record<string, any>; // 对应数据库新字段：环境快照
  is_settled: boolean;      // 对应数据库新字段：结算锁定
  ai_strategy_id?: string;  // 注入‘自我意识’：AI 策略 ID 关联
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// 7. AI 策略与反馈闭环 (AI Strategy & Feedback Loop)
export interface AIStrategy {
  id: string;
  merchant_id: string;
  name: string;             // 策略名称，如“午后低峰促销”
  description: string;
  trigger_condition: string; // 触发条件，如“预估负载 < 30%”
  action_type: 'discount' | 'notification' | 'pricing_adjustment';
  action_payload: Record<string, any>; // 执行细节
  created_at: string;
}

export interface AIFeedback {
  id: string;
  strategy_id: string;
  booking_id: string;
  original_revenue: number;
  actual_revenue: number;
  conversion_rate: number;
  external_factors?: string[]; // 外部因素：天气、节日等
  ai_reflection?: string;     // AI 自我反思日志
  impact_score: number;       // 影响得分 (-1.0 到 1.0)
  created_at: string;
}

// 8. 分布式共识结算 (Distributed Consensus Settlement)
export interface MerchantCreditPoint {
  merchant_id: string;
  partner_merchant_id: string;
  balance: number;            // 积分余额 (正数代表债权，负数代表债务)
  currency: string;           // 结算币种 (如 EUR)
  last_transaction_id?: string;
  updated_at: string;
}

export interface InterMerchantCreditLedger {
  id: string;
  debtor_merchant_id: string;   // 债务方 (接待店)
  creditor_merchant_id: string; // 债权方 (资源店)
  amount: number;               // 信用积分金额
  transaction_type: 'resource_hedge' | 'fee_sharing' | 'points_redemption';
  booking_id?: string;
  status: 'active' | 'netted' | 'void'; // netted 代表已在轧差中抵消
  netting_id?: string;          // 关联的轧差结算 ID
  created_at: string;
}

export interface NettingSettlement {
  id: string;
  merchant_a_id: string;
  merchant_b_id: string;
  net_amount: number;           // 轧差后的最终支付金额
  payer_id: string;             // 最终支付方
  payee_id: string;             // 最终收款方
  ledger_ids: string[];         // 被抵消的原始账单 ID 列表
  status: 'proposed' | 'confirmed' | 'executed';
  settled_at?: string;
  created_at: string;
}

// 5. 账单明细/分润流水类型 (Booking Item/Financial Ledger)
export interface BookingItem {
  id: string;
  event_id: string;
  merchant_id: string;
  service_id?: string;
  service_name: string;
  staff_id?: string;
  staff_name?: string;
  price_sold: number;
  tax_rate: number; // 对应数据库新字段
  commission_amount: number;
  value_split_detail: Record<string, any>; // 对应数据库新字段：原子分账明细
  settlement_status: 'pending' | 'settled' | 'reversed'; // 对应数据库新字段
  original_merchant_id?: string; // 对应数据库新字段：跨店借调标记
  created_at: string;
}
