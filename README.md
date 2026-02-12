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

- `GET /` 服务状态
- `GET /health` liveness（进程存活）
- `GET /ready` readiness（检查依赖可用）
- `GET /todos?limit=20&offset=0` 获取分页 to-do
- `GET /todos/:id` 获取单个 to-do
- `POST /todos` 创建 to-do
- `PUT /todos/:id` 全量替换（需要 `title` 和 `completed`）
- `PATCH /todos/:id` 部分更新
- `DELETE /todos/:id` 删除 to-do

## 响应格式

`GET /todos` 返回：

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
- 每个响应包含 `x-request-id`
- `memory` 驱动在 `staging/production` 环境会被禁止，避免误配置
- `GET /todos` 强制分页与最大限制（limit 最大 100）

## 工程结构

```text
src/
  app.ts                         # 应用装配、日志与统一错误处理
  index.ts                       # Workers 入口
  lib/
    errors.ts                    # 统一业务错误模型（status/code/message）
    validation.ts                # zod 校验中间件封装
    schemas/
      todo.ts                    # 请求参数 schema
  repositories/
    todo-repository.ts           # 仓库接口
    todo-repository-d1.ts        # Drizzle + D1 实现
    todo-repository-memory.ts    # Memory 实现
    todo-repository-factory.ts   # 根据环境选择实现
  db/
    client.ts                    # Drizzle D1 client
    schema.ts                    # Drizzle schema
  routes/
    system-routes.ts             # / /health /ready
    todo-routes.ts               # /todos REST 路由
  services/
    todo-service.ts              # 业务逻辑层
  types/
    env.ts                       # Cloudflare bindings + request variables
    todo.ts                      # Todo 领域与 DTO 类型
```
