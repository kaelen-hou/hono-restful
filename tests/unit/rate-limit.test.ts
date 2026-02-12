import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { createRateLimitMiddleware, resetRateLimitStore } from '../../src/lib/rate-limit'
import type { AppEnv } from '../../src/types/env'

const env = {
  DB_DRIVER: 'memory' as const,
  APP_ENV: 'development' as const,
  JWT_SECRET: 'test-secret',
}

describe('rate-limit middleware', () => {
  it('should allow requests within limit', async () => {
    resetRateLimitStore()
    const app = new Hono<AppEnv>()
    app.use(
      '/limited',
      createRateLimitMiddleware({
        namespace: 'unit_allow',
        max: 2,
        windowMs: 60_000,
      }),
    )
    app.get('/limited', (c) => c.json({ ok: true }))
    app.onError((err, c) =>
      c.json(
        {
          code: 'ERR',
          message: err.message,
        },
        500,
      ),
    )

    const first = await app.request(
      '/limited',
      { headers: { 'x-forwarded-for': '198.51.100.8' } },
      env,
    )
    const second = await app.request(
      '/limited',
      { headers: { 'x-forwarded-for': '198.51.100.8' } },
      env,
    )

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
  })

  it('should block requests over limit', async () => {
    resetRateLimitStore()
    const app = new Hono<AppEnv>()
    app.use(
      '/limited',
      createRateLimitMiddleware({
        namespace: 'unit_block',
        max: 1,
        windowMs: 60_000,
      }),
    )
    app.get('/limited', (c) => c.json({ ok: true }))
    app.onError((err, c) =>
      c.json(
        {
          message: err.message,
        },
        429,
      ),
    )

    const first = await app.request(
      '/limited',
      { headers: { 'x-forwarded-for': '198.51.100.9' } },
      env,
    )
    const second = await app.request(
      '/limited',
      { headers: { 'x-forwarded-for': '198.51.100.9' } },
      env,
    )

    expect(first.status).toBe(200)
    expect(second.status).toBe(429)
    const body = (await second.json()) as { message: string }
    expect(body.message).toBe('rate limit exceeded')
  })
})
