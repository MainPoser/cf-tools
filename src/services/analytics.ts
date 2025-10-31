export interface AnalyticsData {
  totalVisits: number;
  todayVisits: number;
  lastResetDate: string;
}

export interface SiteAnalytics {
  tools: { [toolName: string]: AnalyticsData };
  siteTotal: number;
  siteToday: number;
}

class AnalyticsService {
  private baseUrl = '/api/analytics';

  async trackVisit(toolName: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toolName }),
      });
    } catch (error) {
      console.error('Failed to track visit:', error);
    }
  }

  async getToolStats(toolName: string): Promise<AnalyticsData> {
    try {
      const response = await fetch(`${this.baseUrl}/stats?tool=${encodeURIComponent(toolName)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tool stats');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get tool stats:', error);
      return {
        totalVisits: 0,
        todayVisits: 0,
        lastResetDate: new Date().toISOString().split('T')[0]
      };
    }
  }

  async getSiteStats(): Promise<SiteAnalytics> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch site stats');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get site stats:', error);
      return {
        tools: {},
        siteTotal: 0,
        siteToday: 0
      };
    }
  }
}

export const analyticsService = new AnalyticsService();