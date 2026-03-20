/**
 * 行业类型：决定日历的展示逻辑与数据字段
 */
export type IndustryType = "beauty" | "dining" | "hotel" | "other";

/**
 * 预约状态
 */
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

/**
 * 通用预约条目接口
 */
export interface BaseBooking {
  id: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  customerName: string;
  status: BookingStatus;
  note?: string;
}

/**
 * 美发业态扩展 (Beauty)
 */
export interface BeautyBooking extends BaseBooking {
  serviceName: string; // 如：剪发、染发
  stylistName: string; // 技师/发型师
}

/**
 * 餐饮业态扩展 (Dining)
 */
export interface DiningBooking extends BaseBooking {
  tableNumber?: string;
  guestCount: number;
}

/**
 * 住宿业态扩展 (Hotel)
 */
export interface HotelBooking extends BaseBooking {
  roomNumber: string;
  roomType: string;
}

/**
 * 联合预约类型
 */
export type Booking = BeautyBooking | DiningBooking | HotelBooking;

/**
 * 日历配置项
 */
export interface CalendarConfig {
  industry: IndustryType;
  viewMode: "day" | "week" | "month";
  showWeekends: boolean;
  workingHours: {
    start: string; // "09:00"
    end: string;   // "22:00"
  };
}
