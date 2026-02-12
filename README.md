# Hono To-do RESTful API (Cloudflare Workers)

使用 Hono + Cloudflare Workers + D1 构建的 to-do RESTful API。

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
