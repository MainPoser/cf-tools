import { Hono } from 'hono';
import { type CloudFlareEnv } from '../types';

const index = new Hono<{ Bindings: CloudFlareEnv }>();

// 根路径 API 信息
index.get('/api/', (c) => {
    return c.json({
        name: "CF Tools",
        version: "1.0.0"
    });
});

export default index;