# Hono To-do RESTful API (Cloudflare Workers)

使用 Hono + Cloudflare Workers 构建的 to-do RESTful API，支持可切换的 DB 实现（Drizzle+D1 / Memory）。

## 1. 安装依赖

```bash
npm install
```

## 2. 创建 D1 数据库

```bash
npx wrangler d1 create todo-db
```

执行后会返回数据库信息，请把返回的 `database_id` 填到 `wrangler.toml` 的 `database_id` 字段。

## 3. 执行数据库迁移

本地：

```bash
npx wrangler d1 migrations apply todo-db --local
```

线上：

```bash
npx wrangler d1 migrations apply todo-db --remote
```

## 4. 本地开发

```bash
npm run dev
```

如果想用内存实现（不依赖 D1）：

```bash
echo "DB_DRIVER=memory" > .dev.vars
echo "APP_ENV=development" >> .dev.vars
npm run dev
```

默认 `DB_DRIVER=d1`，线上默认 `APP_ENV=production`（见 `wrangler.toml`）。
本地开发可在 `.dev.vars` 中设置 `JWT_SECRET`。线上请使用 Wrangler Secret 管理：

```bash
npx wrangler secret put JWT_SECRET
```

执行命令后按提示输入高强度随机字符串（长度至少 16）。
运行时会做环境配置校验（fail-fast）：
- `JWT_SECRET` 长度必须 >= 16
- `DB_DRIVER=d1` 时必须提供 `DB` 绑定
- `DB_DRIVER=memory` 仅允许 `APP_ENV=development`

## 5. 部署到 Cloudflare

先登录：

```bash
npx wrangler login
```

部署：

```bash
npm run deploy
```

## API 路由

- `GET /api/v1` 服务状态
- `GET /api/v1/health` liveness（进程存活）
- `GET /api/v1/ready` readiness（检查依赖可用）
- `POST /api/v1/auth/register` 邮箱+密码注册
- `POST /api/v1/auth/login` 邮箱+密码登录
- `POST /api/v1/auth/refresh` 使用 refresh token 刷新双 token
- `POST /api/v1/auth/logout` 撤销 refresh token
- `GET /api/v1/auth/me` 获取当前登录用户
- `GET /api/v1/todos?limit=20&offset=0` 获取分页 to-do（需登录）
- `GET /api/v1/todos/:id` 获取单个 to-do（需登录）
- `POST /api/v1/todos` 创建 to-do（需登录）
- `PUT /api/v1/todos/:id` 全量替换（需登录）
- `PATCH /api/v1/todos/:id` 部分更新（需登录）
- `DELETE /api/v1/todos/:id` 删除 to-do（需登录）

所有 `/api/v1/todos` 路由都需要 `Authorization: Bearer <token>`。
普通用户只能访问自己的 todo，`admin` 可访问全部（并可通过 `GET /api/v1/todos?userId=...` 指定用户）。
`/api/v1/auth/login` 与 `/api/v1/auth/refresh` 启用了基础限流，超限会返回 `429 TOO_MANY_REQUESTS`。
当前实现基于 Worker isolate 内存，仅作为 best-effort 防护；生产环境建议使用 Cloudflare Rate Limiting 或 Durable Objects 做强一致限流。
refresh token 采用“家族旋转”机制，并记录设备会话（可通过 `x-device-id` 传递设备标识；未传时回退到 `user-agent`）。

## 认证示例

注册：

```bash
curl -X POST http://127.0.0.1:8787/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"Password123!"}'
```

登录：

```bash
curl -X POST http://127.0.0.1:8787/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"Password123!"}'
```

刷新 token：

```bash
curl -X POST http://127.0.0.1:8787/api/v1/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refresh_token>"}'
```

退出登录（撤销 refresh token）：

```bash
curl -X POST http://127.0.0.1:8787/api/v1/auth/logout \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refresh_token>"}'
```

## 响应格式

`GET /api/v1/todos` 返回：

```json
{
  "items": [],
  "page": {
    "limit": 20,
    "offset": 0,
    "total": 0
  }
}
```

错误响应统一为：

```json
{
  "code": "BAD_REQUEST",
  "message": "...",
  "requestId": "..."
}
```

## 观测与稳定性

- 所有请求会输出结构化日志（包含 method/path/status/duration/requestId）
- 所有请求会输出结构化指标事件（`metric_http_request`）
- 所有请求会输出结构化 trace 事件（`trace_span`）
- 每个响应包含 `x-request-id`
- `memory` 驱动在 `staging/production` 环境会被禁止，避免误配置
- `GET /api/v1/todos` 强制分页与最大限制（limit 最大 100）

测试中包含 OpenAPI 驱动的 contract test（读取 `/api/v1/openapi.json` 并校验文档化操作的响应码契约）。

可观测性字段与告警建议见：

- `docs/observability.md`

## 工程结构

```text
src/
  app.ts                         # 应用装配、日志与统一错误处理
  app/
    services.ts                  # Composition Root：集中创建 request-scoped services
  index.ts                       # Workers 入口
  infrastructure/
    persistence/
      memory-store.ts            # memory 驱动状态存储（仅开发/测试）
      todo/
        d1-repository.ts         # todo 仓储 D1 实现
        memory-repository.ts     # todo 仓储 Memory 实现
        repository-factory.ts    # todo 仓储实现选择
      user/
        d1-repository.ts         # user 仓储 D1 实现
        memory-repository.ts     # user 仓储 Memory 实现
        repository-factory.ts    # user 仓储实现选择
  features/
    auth/
      token.ts                   # JWT 签发与校验
      middleware.ts              # 鉴权中间件
      schemas.ts                 # auth 请求 schema
  lib/
    errors.ts                    # 统一业务错误模型（status/code/message）
    validation.ts                # zod 校验中间件封装
    password.ts                  # 密码 hash/verify
    schemas/
      todo.ts                    # 请求参数 schema
  repositories/
    user-repository.ts           # 用户仓库接口
    todo-repository.ts           # 仓库接口
  db/
    client.ts                    # Drizzle D1 client
    schema.ts                    # Drizzle schema
  routes/
    auth-routes.ts               # /auth 路由（仅做 HTTP 映射）
    system-routes.ts             # / /health /ready（仅做 HTTP 映射）
    todo-routes.ts               # /todos REST 路由（仅做 HTTP 映射）
  services/
    auth-service.ts              # 认证业务
    todo-service.ts              # 业务逻辑层
  types/
    env.ts                       # Cloudflare bindings + request variables
    todo.ts                      # Todo 领域与 DTO 类型
    user.ts                      # 用户领域类型
```
