# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # 本地开发服务器 (wrangler dev)
npm run deploy       # 部署到 Cloudflare Workers
npm run migrate      # 本地 D1 迁移
npm run typecheck    # TypeScript 类型检查
npm test             # 运行测试 (vitest run)
npm run test:watch   # 测试监听模式
npm run lint         # Biome 代码检查
npm run lint:fix     # Biome 自动修复
npm run format       # Biome 格式化
```

D1 迁移（远程）：

```bash
npx wrangler d1 migrations apply todo-db --remote
```

## Architecture

Hono RESTful API on Cloudflare Workers，采用分层架构：

```text
Routes → Services → Repositories → DB (Drizzle/D1)
```

- **Repository Pattern**: Todo 和 User 都采用仓库模式，各有 D1 和 Memory 两种实现
  - `*-repository.ts`: 接口定义
  - `*-repository-d1.ts`: Drizzle + D1（生产）
  - `*-repository-memory.ts`: 内存存储（开发/测试）
  - `*-repository-factory.ts`: 根据 `DB_DRIVER` 环境变量选择实现

- **Authentication**: JWT 认证，`lib/auth-middleware.ts` 提供 `requireAuth` 中间件

- **Environment Bindings**: `types/env.ts` 定义 `Bindings` 类型（DB、DB_DRIVER、JWT_SECRET）

- **Error Handling**: `lib/errors.ts` 的 `ApiError` 类，在 `app.ts` 统一捕获处理

- **Validation**: Zod schema 定义在 `lib/schemas/`，通过 `lib/validation.ts` 中间件校验

## DB Driver 切换

- 默认 `DB_DRIVER=d1`（见 wrangler.toml）
- 本地使用内存：创建 `.dev.vars` 文件，设置 `DB_DRIVER=memory`

## Code Quality

- Biome 用于 lint 和格式化
- Husky + lint-staged 在 commit 前自动检查
- Commitlint 强制 conventional commits 格式
