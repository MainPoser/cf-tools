import { type Context,type  Next } from 'hono';
import { type Variables } from '../types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const corsMiddleware = async (c: Context<{ Variables: Variables }>, next: Next) => {
  // 设置 CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    c.header(key, value);
  });

  // 处理预检请求
  if (c.req.method === 'OPTIONS') {
   return c.body(null, 204);
  }

  // 将 corsHeaders 存储到变量中供后续使用
  c.set('corsHeaders', corsHeaders);
  
  await next();
};