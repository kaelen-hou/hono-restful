import { Hono } from 'hono'
import { requireAuth } from '@/features/auth/middleware'
import { loginBodySchema, refreshBodySchema, registerBodySchema } from '@/features/auth/schemas'
import { createRateLimitMiddleware } from '@/lib/rate-limit'
import { validate } from '@/lib/validation'
import type { AppEnv } from '@/types/env'

export const authRoutes = new Hono<AppEnv>()

const resolveDeviceId = (raw?: string): string => {
  const value = raw?.trim()
  if (!value) {
    return 'unknown'
  }

  return value.slice(0, 128)
}

const getDeviceId = (headers: Headers): string => {
  const explicit = headers.get('x-device-id')
  if (explicit) {
    return resolveDeviceId(explicit)
  }

  const userAgent = headers.get('user-agent')
  if (userAgent) {
    return resolveDeviceId(userAgent)
  }

  return 'unknown'
}

authRoutes.use(
  '/auth/login',
  createRateLimitMiddleware({
    namespace: 'auth_login',
    max: 5,
    windowMs: 60_000,
  }),
)

authRoutes.use(
  '/auth/refresh',
  createRateLimitMiddleware({
    namespace: 'auth_refresh',
    max: 10,
    windowMs: 60_000,
  }),
)

authRoutes.post('/auth/register', validate('json', registerBodySchema), async (c) => {
  const authService = c.get('authService')
  const input = c.req.valid('json')
  const result = await authService.register(input, getDeviceId(c.req.raw.headers))

  return c.json(result, 201)
})

authRoutes.post('/auth/login', validate('json', loginBodySchema), async (c) => {
  const authService = c.get('authService')
  const input = c.req.valid('json')
  const result = await authService.login(input, getDeviceId(c.req.raw.headers))

  return c.json(result)
})

authRoutes.post('/auth/refresh', validate('json', refreshBodySchema), async (c) => {
  const authService = c.get('authService')
  const { refreshToken } = c.req.valid('json')
  const result = await authService.refresh(refreshToken, getDeviceId(c.req.raw.headers))

  return c.json(result)
})

authRoutes.post('/auth/logout', validate('json', refreshBodySchema), async (c) => {
  const authService = c.get('authService')
  const { refreshToken } = c.req.valid('json')
  await authService.logout(refreshToken, getDeviceId(c.req.raw.headers))

  return c.body(null, 204)
})

authRoutes.get('/auth/me', requireAuth, async (c) => {
  return c.json({ user: c.get('currentUser') })
})
