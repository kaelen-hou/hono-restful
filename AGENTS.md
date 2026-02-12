# AGENTS.md

## 1. Runtime & Tooling

- Use Node.js `24.12.0` (see `.nvmrc`) for local development and CI.
- Use npm `11.6.0`.
- Keep dependency changes explicit and committed with `package-lock.json`.

## 2. Development Workflow

- Start local dev with `npm run dev`.
- Before opening PR or merging, run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run test:coverage`
- Preferred single command for full checks: `npm run ci`.

## 3. Code Quality Rules

- Keep API layers separated:
  - `routes`: HTTP concerns only (validation, status code, response)
  - `services`: business logic and authorization checks
  - `repositories`: data access only
- Reuse middleware for cross-cutting concerns (auth, request id, logging, error format).
- Keep error responses consistent: `{ code, message, requestId }`.
- Prefer schema validation (Zod) over ad-hoc manual checks.

## 4. Testing Rules

- Add or update tests for every behavior change.
- Coverage thresholds are enforced by Vitest config:
  - statements >= 90
  - branches >= 75
  - functions >= 95
  - lines >= 90
- Use unit tests for services/repositories and integration tests for route contracts.

## 5. Database & Migrations

- Create migration files for every schema change.
- Apply local migrations during development:
  - `npx wrangler d1 migrations apply todo-db --local`
- Apply remote migrations only when releasing:
  - `npx wrangler d1 migrations apply todo-db --remote`

## 6. Cloudflare Deployment

- Deploy with `npm run deploy`.
- Ensure `wrangler.toml` bindings and environment variables are correct before deploy.
- For production rollout: migrate first, then deploy, then verify `/health` and `/ready`.

## 7. Security Baseline

- Never hardcode secrets in source code.
- Keep `JWT_SECRET` configured per environment.
- Auth-sensitive changes must include negative-path tests (invalid token, expired/revoked token, permission checks).
