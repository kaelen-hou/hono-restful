import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { requireAdmin } from '../../src/features/auth/middleware'
import type { AppEnv } from '../../src/types/env'

const env = {
  DB_DRIVER: 'memory' as const,
  APP_ENV: 'development' as const,
  JWT_SECRET: 'test-secret',
}

describe('requireAdmin middleware', () => {
  it('should allow admin user', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', (c, next) => {
      c.set('currentUser', { id: 1, email: 'admin@example.com', role: 'admin' })
      return next()
    })
    app.use('*', requireAdmin)
    app.get('/admin', (c) => c.json({ ok: true }))

    const res = await app.request('/admin', {}, env)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
  })

  it('should reject non-admin user', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', (c, next) => {
      c.set('currentUser', { id: 2, email: 'user@example.com', role: 'user' })
      return next()
    })
    app.use('*', requireAdmin)
    app.onError((err, c) =>
      c.json(
        {
          message: err.message,
        },
        403,
      ),
    )
    app.get('/admin', (c) => c.json({ ok: true }))

    const res = await app.request('/admin', {}, env)
    expect(res.status).toBe(403)
    const body = (await res.json()) as { message: string }
    expect(body.message).toBe('admin permission required')
  })
})
