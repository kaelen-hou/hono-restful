# 10 分钟上手指南

本文面向第一次接触本项目的开发者，目标是在 10 分钟内完成本地启动、核心链路理解和质量门禁验证。

## 1. 环境准备（约 1 分钟）

- Node.js: `24.12.0`（见 `.nvmrc`）
- npm: `11.6.0`（见 `package.json` 的 `packageManager`）

建议先确认版本：

```bash
node -v
npm -v
```

## 2. 安装依赖（约 1 分钟）

```bash
cd /Users/sam/code/github/kaelen/hono-restful
npm install
```

## 3. 本地开发（Memory 驱动，约 1 分钟）

为了快速启动，推荐先使用 memory 存储，不依赖 D1：

```bash
printf "DB_DRIVER=memory\nAPP_ENV=development\nJWT_SECRET=dev-secret-at-least-16-chars\n" > .dev.vars
npm run dev
```

服务启动后默认可通过 `http://127.0.0.1:8787` 访问。

## 4. 快速验证接口（约 2 分钟）

- OpenAPI JSON：`GET /api/v1/openapi.json`
- 文档页面：`GET /api/v1/docs`
- 健康检查：`GET /api/v1/health`
- 就绪检查：`GET /api/v1/ready`

可直接访问：

- `http://127.0.0.1:8787/api/v1/openapi.json`
- `http://127.0.0.1:8787/api/v1/docs`

## 5. 先读这几个文件（约 3 分钟）

### 应用入口与中间件

- `src/index.ts`：Workers 入口
- `src/app.ts`：全局中间件、路由挂载、统一错误处理、requestId/日志/指标/trace

### 分层结构（建议按顺序阅读）

- `src/routes/`：HTTP 层（参数校验、状态码、响应）
- `src/services/`：业务逻辑和授权规则
- `src/repositories/`：数据访问接口定义
- `src/infrastructure/persistence/`：D1/Memory 仓储实现和工厂选择

### 认证与可观测性

- `src/features/auth/token.ts`：JWT 签发与校验（含 refresh token 旋转相关字段）
- `src/features/auth/middleware.ts`：鉴权中间件
- `src/observability/console-observability.ts`：结构化日志、指标事件、`trace_span`

## 6. 提交前必跑质量门禁（约 2 分钟）

```bash
npm run typecheck && npm run lint && npm test
```

或一键执行完整检查：

```bash
npm run ci
```

## 7. 发布前流程（D1 模式）

本地迁移：

```bash
npx wrangler d1 migrations apply todo-db --local
```

远端迁移（发布时）：

```bash
npx wrangler d1 migrations apply todo-db --remote
```

部署：

```bash
npm run deploy
```

## 8. 首要安全注意事项

不要在 `wrangler.toml` 明文存储 `JWT_SECRET`。请使用 Wrangler Secret：

```bash
npx wrangler secret put JWT_SECRET
```

本地开发继续通过 `.dev.vars` 管理 `JWT_SECRET`，线上通过 Wrangler Secret 注入。
