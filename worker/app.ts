import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { type CloudFlareEnv } from './types';
import indexRoutes from './routes/index';
import analyticsRoutes from './routes/analytics';
import proxyRoutes from './routes/proxy';
import p2pRoutes from './routes/p2p';

const app = new Hono<{ Bindings: CloudFlareEnv }>();

// 应用 CORS 中间件
app.use('*', corsMiddleware);

// 注册路由
app.route('/', indexRoutes);
app.route('/', analyticsRoutes);
app.route('/', proxyRoutes);
app.route('/', p2pRoutes);

// 404 处理
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error('App error:', err);
  return c.json({ 
    error: 'Internal server error',
    details: err.message 
  }, 500);
});

export default app;