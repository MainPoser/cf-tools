# CF Tools

一个基于 Cloudflare Workers 的全栈 React 工具站，涵盖常用开发与日常实用工具，并内置访问统计与可选的 AI 能力。

- 前端：React 19 + TypeScript + Vite + Ant Design
- 后端：Hono（运行在 Cloudflare Workers）
- 部署：Cloudflare Workers（使用 Wrangler）
- 存储：Cloudflare KV（用于访问统计）
- 演示地址：[https://cf-tools.tianyao.qzz.io/](https://cf-tools.tianyao.qzz.io/)

## 目录

- 概览与功能
- 技术栈与结构
- 快速开始
- 本地开发
- 构建与部署
- KV 配置
- 环境变量与密钥
- API 文档
- 自定义域名（可选）
- 常见问题
- 脚本速查

---

## 概览与功能

已实现的工具页面：
- Base64 编解码（`/tools/base64`）
- 配置格式转换（`/tools/config-formatter`）
- URL 编解码（`/tools/url-codec`）
- 时间戳转换（`/tools/timestamp`）
- 二维码生成（`/tools/qr-code-generator`）
- 颜色选择器（`/tools/color-picker`）
- Markdown 预览（`/tools/markdown`）
- 密码生成器（`/tools/password-generator`）

可选的 AI 工具：
- AI 工具总览、文本生成、图像生成、文本翻译（基于 Cloudflare AI；通过 Worker 代理）

访问统计：
- 每个工具页都会自动记录访问数据（总访问量、当日访问量）到 KV。

---

## 技术栈与结构

项目结构（关键目录）：

```
cf-tools/
├── src/                 # 前端 React 代码
│   ├── components/      # 通用组件
│   ├── hooks/           # 分析埋点等 Hooks
│   ├── pages/           # 各工具页面与 AI 页面
│   └── services/        # 前端服务封装
├── worker/              # Cloudflare Workers 后端 API
│   ├── routes/          # 路由：index / analytics / proxy
│   ├── middleware/      # 中间件：CORS
│   └── types.ts         # 类型定义（KV 绑定等）
├── wrangler.jsonc       # Workers 配置
├── vite.config.ts       # Vite 配置
└── package.json         # 项目脚本与依赖
```

---

## 快速开始

1) 克隆并安装依赖：

```bash
git clone https://github.com/MainPoser/cf-tools.git
cd cf-tools
npm install
```

2) 登入 Cloudflare 并安装 Wrangler：

```bash
npm i -g wrangler
wrangler login
```

3) 创建 KV 命名空间（用于访问统计）：

```bash
wrangler kv namespace create "ANALYTICS"
wrangler kv namespace create "ANALYTICS" --preview  # 可选
```

执行后，`wrangler.jsonc` 的 `kv_namespaces` 通常会自动写入绑定与 `id/preview_id`。如需手动配置，确保如下结构：

```jsonc
"kv_namespaces": [
  {
    "binding": "ANALYTICS",
    "id": "你的实际KV_ID",
    "preview_id": "你的预览KV_ID"
  }
]
```

---

## 本地开发

前端与后端分开运行，默认通过 CORS 允许跨源访问：

- 启动前端开发服务器（Vite）：

```bash
npm run dev
# 访问 http://localhost:5173
```

- 启动 Workers 本地服务：

```bash
wrangler dev
# 默认监听 http://localhost:8787
```

---

## 构建与部署

- 构建前端与 Worker 静态资源：

```bash
npm run build
```

- 预览构建产物（本地预览）：

```bash
npm run preview
```

- 部署到 Cloudflare Workers：

```bash
npm run deploy
# 或者直接：wrangler deploy
```

---

## KV 配置

KV 用于保存工具访问统计数据（键为工具名称）。绑定名为 `ANALYTICS`，类型定义见 `worker/types.ts`：

```ts
export interface CloudFlareEnv {
  ANALYTICS: KVNamespace;
}
```

Wrangler 配置（`wrangler.jsonc`）中需存在：

```jsonc
{
  "main": "worker/index.ts",
  "assets": { "directory": "./dist", "not_found_handling": "single-page-application" },
  "kv_namespaces": [ { "binding": "ANALYTICS", "id": "...", "preview_id": "..." } ]
}
```

---

## 环境变量与密钥

- 普通变量：在 `wrangler.jsonc` 中添加：

```jsonc
"vars": { "API_BASE_URL": "https://your-api.com" }
```

- 密钥变量：通过 Wrangler 管理（不会写入配置文件）：

```bash
wrangler secret put API_SECRET_KEY
```

---

## API 文档

后端基于 Hono 实现，主要路由如下：

1) 根信息

- `GET /api/`
- 响应示例：

```json
{ "name": "CF Tools", "version": "1.0.0" }
```

2) 访问统计（写入）

- `POST /api/analytics/track`
- 请求体：`{ "toolName": "Base64编解码" }`
- 响应：`{ "success": true }`

示例：

```bash
curl -X POST "http://localhost:8787/api/analytics/track" \
  -H "Content-Type: application/json" \
  -d '{"toolName":"Base64编解码"}'
```

3) 访问统计（读取）

- `GET /api/analytics/stats?tool=<工具名>` 获取单个工具统计；不带 `tool` 查询时返回所有工具聚合与站点汇总。

单工具响应示例：

```json
{
  "totalVisits": 12,
  "todayVisits": 3,
  "lastResetDate": "2025-11-06"
}
```

聚合响应示例：

```json
{
  "tools": {
    "Base64编解码": { "totalVisits": 12, "todayVisits": 3, "lastResetDate": "2025-11-06" }
  },
  "siteTotal": 12,
  "siteToday": 3
}
```

4) Cloudflare AI 代理（可选）

- 通过 Worker 代理到 Cloudflare AI API：`/api/proxies/cloudflare/*`
- 示例：列出模型

```bash
curl -H "Authorization: Bearer <CF_API_TOKEN>" \
  "http://localhost:8787/api/proxies/cloudflare/client/v4/accounts/<ACCOUNT_ID>/ai/models"
```

注意：需要有效的 Cloudflare API Token，建议使用账号级别权限最小化原则。

---

## 自定义域名（可选）

在 Cloudflare Dashboard 为 Worker 添加 Routes：
- 进入 "Workers & Pages" → 选择你的 Worker → "Triggers" → "Routes" → "Add route"
- 路由示例：`tools.example.com/*`
- 选择对应 Zone 并保存。

---

## 常见问题

- KV 权限或读写异常：确认 `kv_namespaces` 正确绑定且 `id/preview_id` 有效。
- 构建失败：确保 Node.js ≥ 18 且依赖安装完成（`npm install`）。
- 本地联调跨域：内置 CORS 允许所有来源；若需收紧策略，可修改 `worker/middleware/cors.ts`。
- 部署失败：确认已 `wrangler login` 且账号具有部署权限。

---

## 脚本速查（`package.json`）

- `npm run dev`：启动前端开发服务器（Vite）
- `npm run build`：构建前端与资源（`tsc -b && vite build`）
- `npm run preview`：本地预览构建产物
- `npm run deploy`：构建并部署到 Cloudflare Workers（调用 `wrangler deploy`）
- `npm run lint`：运行 ESLint
- `npm run cf-typegen`：生成 Cloudflare 绑定类型（`wrangler types`）

---

## 更新与发布

当代码更新后：

```bash
npm run build
npm run deploy
```

如需仅本地验证构建效果可使用：

```bash
npm run preview
```

---

感谢使用 CF Tools！如有问题或建议，欢迎提交 Issue 或 PR。

