export type UserRole = "user" | "merchant" | "boss";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  merchant_phone?: string;
  role: UserRole;
  avatar?: string;
  merchant_name?: string;
  merchant_avatar_url?: string;
  boss_name?: string;
  boss_avatar_url?: string;
  gx_id?: string;
  merchant_gx_id?: string;
  createdAt?: string; // 加入账号创建时间用于计算用户资历
  gender?: string; // 加入性别
  birthday?: string; // 加入生日
  privileges?: string[];
  stats: {
    label: string;
    value: string | number;
    trend?: "up" | "down" | "stable";
  }[];
}
