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
npm run dev
```

默认 `DB_DRIVER=d1`（见 `wrangler.toml`）。

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

- `GET /` 健康检查
- `GET /health` 健康检查（含时间戳）
- `GET /todos` 获取全部 to-do
- `GET /todos/:id` 获取单个 to-do
- `POST /todos` 创建 to-do
- `PUT /todos/:id` 更新 to-do（支持更新 `title` 和/或 `completed`）
- `DELETE /todos/:id` 删除 to-do

## 请求示例

创建：

```bash
curl -X POST http://127.0.0.1:8787/todos \
  -H 'Content-Type: application/json' \
  -d '{"title":"学习 Hono", "completed": false}'
```

更新：

```bash
curl -X PUT http://127.0.0.1:8787/todos/1 \
  -H 'Content-Type: application/json' \
  -d '{"completed": true}'
```

## 工程结构

```text
src/
  app.ts                  # 应用装配与全局错误处理
  index.ts                # Workers 入口
  lib/
    errors.ts             # 统一业务错误
    validators.ts         # 请求参数校验
  repositories/
    todo-repository.ts            # 仓库接口
    todo-repository-d1.ts         # Drizzle + D1 实现
    todo-repository-memory.ts     # Memory 实现
    todo-repository-factory.ts    # 根据环境选择实现
  db/
    client.ts               # Drizzle D1 client
    schema.ts               # Drizzle schema
  routes/
    system-routes.ts      # / 与 /health
    todo-routes.ts        # /todos REST 路由
  services/
    todo-service.ts       # 业务逻辑层
  types/
    env.ts                # Cloudflare bindings 类型
    todo.ts               # Todo 领域与 DTO 类型
```

## DB 实现方案

- `d1`（默认，生产建议）：基于 Drizzle + D1，持久化存储，适合线上环境。
- `memory`（开发/测试）：进程内存存储，重启后数据丢失。

切换方式：
- Cloudflare（线上）：在 `wrangler.toml` 的 `[vars]` 中设置 `DB_DRIVER`
- 本地开发：在 `.dev.vars` 中设置 `DB_DRIVER=memory` 或 `DB_DRIVER=d1`
