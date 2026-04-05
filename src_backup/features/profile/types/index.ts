export type UserRole = "user" | "merchant" | "boss";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  createdAt?: string; // 加入账号创建时间用于计算用户资历
  privileges?: string[];
  stats: {
    label: string;
    value: string | number;
    trend?: "up" | "down" | "stable";
  }[];
}
