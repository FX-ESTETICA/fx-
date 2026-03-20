export type UserRole = "user" | "merchant" | "boss";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  privileges?: string[];
  stats: {
    label: string;
    value: string | number;
    trend?: "up" | "down" | "stable";
  }[];
}
