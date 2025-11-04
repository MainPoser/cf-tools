import { Hono } from 'hono';
import { type CloudFlareEnv } from '../types';

const proxy = new Hono<{ Bindings: CloudFlareEnv }>();

// Cloudflare AI API 代理处理
proxy.all('/api/proxies/cloudflare/*', async (c) => {
  const url = new URL(c.req.url);

  // 直接提取 /api/proxies/cloudflare/ 后面的路径部分
  const apiPath = url.pathname.substring(24); // 移除 "/api/proxies/cloudflare/" 前缀

  if (!apiPath) {
    return c.json({ error: 'Invalid AI API path' }, 400);
  }

  // 构建 Cloudflare AI API URL
  const cfApiUrl = `https://api.cloudflare.com/${apiPath}`;

  try {
    // 获取请求体（如果是 POST 请求）
    let body: RequestInit | undefined;
    if (c.req.method === 'POST') {
      const requestBody = await c.req.text();
      body = {
        method: 'POST',
        headers: {
          'Authorization': c.req.header('Authorization') || '',
          'Content-Type': 'application/json',
        },
        body: requestBody
      };
    } else {
      body = {
        method: 'GET',
        headers: {
          'Authorization': c.req.header('Authorization') || '',
          'Content-Type': 'application/json',
        }
      };
    }

    // 代理请求到 Cloudflare AI API
    const response = await fetch(cfApiUrl, body);

    // 检查响应类型
    const contentType = response.headers.get('Content-Type') || '';
    let responseData;
    if (contentType.includes('image/')) {
      // 如果是图像响应，直接返回二进制数据
      responseData = await response.arrayBuffer();
    } else {
      // 如果是JSON或其他文本响应，使用text
      responseData = await response.text();
    }

    // 返回响应，保持原始状态码和内容
    // CORS headers 已经通过中间件设置，这里只需要设置 Content-Type
    return new Response(responseData, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      }
    });

  } catch (error) {
    console.error('AI Proxy error:', error);
    return c.json({
      error: 'Failed to proxy AI request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default proxy;