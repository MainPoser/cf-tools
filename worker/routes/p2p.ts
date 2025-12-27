import { Hono } from 'hono';
import { type CloudFlareEnv } from '../types';

const app = new Hono<{ Bindings: CloudFlareEnv }>();

// 常量定义
const TTL = 3600; // 数据保留 1 小时
const PREFIX = 'p2p_';

// 辅助函数：生成 6 位数字码
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 1. 发送端创建会话
 * POST /api/p2p/session
 * Body: { offer: string } (SDP JSON string)
 * Returns: { code: string }
 */
app.post('/api/p2p/session', async (c) => {
  const body = await c.req.json();
  if (!body.offer) {
    return c.json({ error: 'Offer is required' }, 400);
  }

  // 简单的重试机制确保 Code 唯一（虽然冲突概率很低）
  let code = generateCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await c.env.P2P_KV.get(`${PREFIX}offer_${code}`);
    if (!existing) break;
    code = generateCode();
    attempts++;
  }

  // 存储 Offer
  await c.env.P2P_KV.put(`${PREFIX}offer_${code}`, JSON.stringify(body.offer), { expirationTtl: TTL });
  
  // 初始化 ICE 候选列表
  await c.env.P2P_KV.put(`${PREFIX}ice_offer_${code}`, JSON.stringify([]), { expirationTtl: TTL });
  await c.env.P2P_KV.put(`${PREFIX}ice_answer_${code}`, JSON.stringify([]), { expirationTtl: TTL });

  return c.json({ code });
});

/**
 * 2. 接收端获取会话信息 (Offer)
 * GET /api/p2p/session/:code
 */
app.get('/api/p2p/session/:code', async (c) => {
  const code = c.req.param('code');
  const offer = await c.env.P2P_KV.get(`${PREFIX}offer_${code}`);
  
  if (!offer) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json({ offer: JSON.parse(offer) });
});

/**
 * 3. 接收端提交应答 (Answer)
 * POST /api/p2p/answer/:code
 * Body: { answer: string }
 */
app.post('/api/p2p/answer/:code', async (c) => {
  const code = c.req.param('code');
  const body = await c.req.json();
  
  if (!body.answer) {
    return c.json({ error: 'Answer is required' }, 400);
  }

  // 确保存储了 offer (即会话存在)
  const offer = await c.env.P2P_KV.get(`${PREFIX}offer_${code}`);
  if (!offer) {
    return c.json({ error: 'Session expired or invalid' }, 404);
  }

  await c.env.P2P_KV.put(`${PREFIX}answer_${code}`, JSON.stringify(body.answer), { expirationTtl: TTL });
  return c.json({ success: true });
});

/**
 * 4. 发送端轮询获取应答 (Answer)
 * GET /api/p2p/answer/:code
 */
app.get('/api/p2p/answer/:code', async (c) => {
  const code = c.req.param('code');
  const answer = await c.env.P2P_KV.get(`${PREFIX}answer_${code}`);
  
  if (!answer) {
    return c.json({ answer: null }); // 还没准备好
  }

  return c.json({ answer: JSON.parse(answer) });
});

/**
 * 5. 交换 ICE Candidates
 * POST /api/p2p/ice/:code
 * Body: { candidate: any, type: 'offer' | 'answer' }
 */
app.post('/api/p2p/ice/:code', async (c) => {
  const code = c.req.param('code');
  const body = await c.req.json();
  const { candidate, type } = body; // type 指示是谁发的 candidate

  if (!candidate || !type) return c.json({ error: 'Invalid data' }, 400);

  const key = `${PREFIX}ice_${type}_${code}`;
  
  // 获取现有列表并追加
  const existing = await c.env.P2P_KV.get(key);
  const list = existing ? JSON.parse(existing) : [];
  list.push(candidate);

  await c.env.P2P_KV.put(key, JSON.stringify(list), { expirationTtl: TTL });
  return c.json({ success: true });
});

/**
 * 6. 获取对方的 ICE Candidates
 * GET /api/p2p/ice/:code?type=offer|answer&lastIndex=0
 * type: 我是谁 (如果是 offerer，我要取 answer 的 candidates)
 */
app.get('/api/p2p/ice/:code', async (c) => {
  const code = c.req.param('code');
  const type = c.req.query('type'); // 'offer' or 'answer' (target to fetch)
  const lastIndex = parseInt(c.req.query('lastIndex') || '0');

  if (!type) return c.json({ error: 'Type required' }, 400);

  const key = `${PREFIX}ice_${type}_${code}`;
  const existing = await c.env.P2P_KV.get(key);
  const list = existing ? JSON.parse(existing) : [];

  // 只返回新的 candidates
  const newCandidates = list.slice(lastIndex);
  
  return c.json({ 
    candidates: newCandidates,
    total: list.length 
  });
});

export default app;