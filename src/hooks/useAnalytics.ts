import { useState, useEffect } from 'react';
import { analyticsService, type AnalyticsData, type SiteAnalytics } from '../services/analytics';

export function useToolStats(toolName: string) {
  const [stats, setStats] = useState<AnalyticsData>({
    totalVisits: 0,
    todayVisits: 0,
    lastResetDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await analyticsService.getToolStats(toolName);
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch tool stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [toolName]);

  const trackVisit = () => {
    analyticsService.trackVisit(toolName);
    // 更新本地状态
    setStats(prev => ({
      ...prev,
      totalVisits: prev.totalVisits + 1,
      todayVisits: prev.todayVisits + 1
    }));
  };

  return { stats, loading, trackVisit };
}

export function useSiteStats() {
  const [stats, setStats] = useState<SiteAnalytics>({
    tools: {},
    siteTotal: 0,
    siteToday: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await analyticsService.getSiteStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch site stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading };
}

// 新增：自动在页面加载时统计访问的Hook
export function useAutoTrackVisit(toolName: string) {
  useEffect(() => {
    // 页面加载时自动统计访问
    analyticsService.trackVisit(toolName);
  }, [toolName]);
}