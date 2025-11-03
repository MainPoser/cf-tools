interface AnalyticsData {
  totalVisits: number;
  todayVisits: number;
  lastResetDate: string;
}

interface ToolAnalytics {
  [toolName: string]: AnalyticsData;
}

export interface ClouldFlareEnv {
  ANALYTICS: KVNamespace;
}


// Cloudflare AI API 代理处理
async function handleAIProxy(request: Request, url: URL, corsHeaders: Record<string, string>) {
  // 预期的路径格式: /api/{account}/ai/run/{modelId}
  // 直接提取 /api/ 后面的路径部分
  const apiPath = url.pathname.substring(5); // 移除 "/api/" 前缀
  
  if (!apiPath || !apiPath.includes('/')) {
    return Response.json({ error: 'Invalid AI API path' }, {
      status: 400,
      headers: corsHeaders
    });
  }
  
  // 构建 Cloudflare AI API URL
  const cfApiUrl = `https://api.cloudflare.com/client/v4/accounts/${apiPath}`;
  
  try {
    // 获取请求体（如果是 POST 请求）
    let body: RequestInit | undefined;
    if (request.method === 'POST') {
      const requestBody = await request.text();
      body = {
        method: 'POST',
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Content-Type': 'application/json',
        },
        body: requestBody
      };
    } else {
      body = {
        method: 'GET',
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Content-Type': 'application/json',
        }
      };
    }

    // 代理请求到 Cloudflare AI API
    const response = await fetch(cfApiUrl, body);
    
    // 获取响应数据
    const responseData = await response.text();
    
    // 返回响应，保持原始状态码和内容
    return new Response(responseData, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      }
    });
    
  } catch (error) {
    console.error('AI Proxy error:', error);
    return Response.json({ 
      error: 'Failed to proxy AI request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

export default {
  async fetch(request, env: ClouldFlareEnv) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // 处理CORS预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (url.pathname === "/api/") {
        return Response.json({
          name: "CF Tools",
          version: "1.0.0"
        }, { headers: corsHeaders });
      }

      // Cloudflare AI API 代理
      if (url.pathname.startsWith('/api/') && url.pathname.includes('/ai/run/')) {
        return handleAIProxy(request, url, corsHeaders);
      }

      // 记录访问
      if (url.pathname === "/api/analytics/track" && request.method === 'POST') {
        const { toolName } = await request.json() as { toolName: string };

        if (!toolName) {
          return Response.json({ error: 'toolName is required' }, {
            status: 400,
            headers: corsHeaders
          });
        }

        const today = new Date().toISOString().split('T')[0];

        // 获取现有数据
        const existingData = await env.ANALYTICS.get(toolName);
        let analytics: AnalyticsData = existingData ? JSON.parse(existingData) : {
          totalVisits: 0,
          todayVisits: 0,
          lastResetDate: today
        };

        // 检查是否需要重置今日访问次数
        if (analytics.lastResetDate !== today) {
          analytics.todayVisits = 0;
          analytics.lastResetDate = today;
        }

        // 更新访问次数
        analytics.totalVisits++;
        analytics.todayVisits++;

        // 保存数据
        await env.ANALYTICS.put(toolName, JSON.stringify(analytics));

        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // 获取访问统计
      if (url.pathname === "/api/analytics/stats" && request.method === 'GET') {
        const toolName = url.searchParams.get('tool');
        const today = new Date().toISOString().split('T')[0];
        if (toolName) {
          let analytics: AnalyticsData = {
            totalVisits: 0,
            todayVisits: 0,
            lastResetDate: new Date().toISOString().split('T')[0]
          };
          // 获取特定工具的统计
          const data = await env.ANALYTICS.get(toolName);
          if (data) {
            analytics = JSON.parse(data);
          }
          if (analytics.lastResetDate !== today) {
            analytics.todayVisits = 0;
            analytics.lastResetDate = today;
          }
          return Response.json(analytics, { headers: corsHeaders });
        } else {
          // 获取所有工具的统计
          const keys = await env.ANALYTICS.list();
          const allStats: ToolAnalytics = {};

          for (const key of keys.keys) {
            const data = await env.ANALYTICS.get(key.name);
            if (data) {
              allStats[key.name] = JSON.parse(data);
              if (allStats[key.name].lastResetDate !== today) {
                allStats[key.name].todayVisits = 0;
                allStats[key.name].lastResetDate = today;
              }
            }
          }

          // 计算网站总访问量
          const totalSiteVisits = Object.values(allStats).reduce((sum, stats) => sum + stats.totalVisits, 0);
          const todaySiteVisits = Object.values(allStats).reduce((sum, stats) => sum + stats.todayVisits, 0);

          return Response.json({
            tools: allStats,
            siteTotal: totalSiteVisits,
            siteToday: todaySiteVisits
          }, { headers: corsHeaders });
        }
      }

      return new Response(null, { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Worker error:', error);
      return Response.json({ error: 'Internal server error' }, {
        status: 500,
        headers: corsHeaders
      });
    }
  },
} satisfies ExportedHandler<Env>;