export interface AnalyticsData {
  totalVisits: number;
  todayVisits: number;
  lastResetDate: string;
}

export interface ToolAnalytics {
  [toolName: string]: AnalyticsData;
}

export interface CloudFlareEnv {
  ANALYTICS: KVNamespace;
}

export interface Variables {
  corsHeaders: Record<string, string>;
}