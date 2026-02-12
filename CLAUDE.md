# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # 本地开发服务器 (wrangler dev)
npm run deploy       # 部署到 Cloudflare Workers
npm run migrate      # 本地 D1 迁移
npm run typecheck    # TypeScript 类型检查
```

D1 迁移（远程）：
```bash
npx wrangler d1 migrations apply todo-db --remote
```

## Architecture

Hono RESTful API on Cloudflare Workers，采用分层架构：

```
Routes → Services → Repositories → DB (Drizzle/D1)
```

- **Repository Pattern**: `TodoRepository` 接口定义在 `repositories/todo-repository.ts`，有两个实现：
  - `todo-repository-d1.ts`: Drizzle + D1（生产）
  - `todo-repository-memory.ts`: 内存存储（开发/测试）
  - `todo-repository-factory.ts`: 根据 `DB_DRIVER` 环境变量选择实现

- **Environment Bindings**: `types/env.ts` 定义 `Bindings` 类型（DB、DB_DRIVER）

- **Error Handling**: `lib/errors.ts` 的 `ApiError` 类，在 `app.ts` 统一捕获处理

## DB Driver 切换

- 默认 `DB_DRIVER=d1`（见 wrangler.toml）
- 本地使用内存：创建 `.dev.vars` 文件，设置 `DB_DRIVER=memory`
