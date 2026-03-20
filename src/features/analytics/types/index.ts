export type Platform = "douyin" | "ctrip" | "58tc" | "xiaohongshu";

export interface PlatformMetric {
  id: string;
  platform: Platform;
  metricName: string;
  value: string | number;
  trend: number; // 增长百分比
  status: "growing" | "declining" | "stable";
}

export interface AIInsight {
  id: string;
  type: "opportunity" | "warning" | "info";
  content: string;
  source: Platform[];
  confidence: number;
}

export interface AnalyticsData {
  lastUpdated: string;
  metrics: PlatformMetric[];
  insights: AIInsight[];
}
