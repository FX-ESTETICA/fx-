/**
 * 行业类型：决定日历的展示逻辑与数据字段
 * 扩展支持：牙医、生活服务、专家咨询等
 */
export type IndustryType = 
  | "beauty"      // 美业
  | "dining"      // 餐饮
  | "hotel"       // 酒店
  | "medical"     // 医疗/牙医
  | "expert"      // 专家/咨询
  | "fitness"     // 健身/私教
  | "other";      // 常规预约

/**
 * 布局基轴 (Pivot Mode)
 * 决定日历如何组织横向与纵向维度
 */
export type PivotMode = 
  | "resource"  // 以人为中心 (技师/医生/专家) - 横向 Resource, 纵向 Time
  | "spatial"   // 以空间为中心 (桌号/诊室/场地) - 横向 Space, 纵向 Time
  | "timeline"  // 以时间流为中心 (长跨度日期) - 横向 Date, 纵向 Resource
  | "capacity";  // 以容量为中心 (健身房/课程) - 纵向 Time, 显示人数

/**
 * 资源实体 (Resource Entity)
 * 用于 Matrix 布局的横向表头
 */
export interface MatrixResource {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  themeColor?: string; // 专属配色，用于快速识别
  status?: "available" | "busy" | "away";
  metadata?: Record<string, unknown>;
}

/**
 * 行业 DNA 配置 (Industry DNA)
 */
export interface IndustryDNA {
  type: IndustryType;
  pivot: PivotMode;
  label: string;
  themeColor: string; // 样式类名或色值
  accent: "purple" | "cyan" | "gold" | "red" | "none";
  icon: string;       // Lucide icon name
  slotUnit: number;   // 时间槽单位 (分钟)
  features: string[]; // 行业特有功能
  // Elite 升级版扩展
  metadata?: {
    spatialDensity?: number;  // 空间密度 (0-1), 餐饮行业用于雷达
    flowThreshold?: number;   // 流量阈值, 健身行业用于潮汐
    specializationLabel?: string; // 专家列的专业称号 (专家/医生/发型师)
    columnHeader?: string;        // 矩阵列标题
    rowHeader?: string;           // 矩阵行标题
    matrixStyle?: string;         // 矩阵渲染风格 (audio_track, clinical_grid 等)
  };
}

/**
 * 预约状态
 */
export type BookingStatus = 
  | "pending"     // 待确认
  | "confirmed"   // 已确认
  | "check_in"    // 已到店/进行中
  | "completed"   // 已完成/结算
  | "cancelled";  // 已取消

/**
 * 通用预约条目接口
 */
export interface BaseBooking {
  id: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  customerName: string;
  customerPhone?: string;
  status: BookingStatus;
  note?: string;
  price?: number;
  currency?: string;
}

/**
 * 医疗/牙医扩展 (Medical)
 */
export interface MedicalBooking extends BaseBooking {
  doctorName: string;
  department: string;
  treatmentType: string; // 诊疗项目
  teethIds?: string[];   // 关联牙位 (牙医特有)
  roomNumber?: string;
}

/**
 * 美发业态扩展 (Beauty)
 */
export interface BeautyBooking extends BaseBooking {
  serviceName: string; // 如：剪发、染发
  stylistName: string; // 技师/发型师
  stationNumber?: string; // 工位
}

/**
 * 餐饮业态扩展 (Dining)
 */
export interface DiningBooking extends BaseBooking {
  tableNumber: string;
  guestCount: number;
  billSummary?: string; // 账单摘要
}

/**
 * 住宿业态扩展 (Hotel)
 */
export interface HotelBooking extends BaseBooking {
  roomNumber: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
}

/**
 * 联合预约类型
 */
export type Booking = 
  | BeautyBooking 
  | DiningBooking 
  | HotelBooking 
  | MedicalBooking;

/**
 * 日历配置项
 */
export interface CalendarConfig {
  industry: IndustryType;
  pivot: PivotMode;
  viewMode: "day" | "week" | "month" | "year";
  showWeekends: boolean;
  workingHours: {
    start: string; // "09:00"
    end: string;   // "22:00"
  };
}
