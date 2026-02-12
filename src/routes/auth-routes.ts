import { Hono } from 'hono'
import { requireAuth } from '../features/auth/middleware'
import { loginBodySchema, refreshBodySchema, registerBodySchema } from '../features/auth/schemas'
import { createRateLimitMiddleware } from '../lib/rate-limit'
import { validate } from '../lib/validation'
import type { AppEnv } from '../types/env'

export const authRoutes = new Hono<AppEnv>()

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
  const result = await authService.register(input)

  return c.json(result, 201)
})

authRoutes.post('/auth/login', validate('json', loginBodySchema), async (c) => {
  const authService = c.get('authService')
  const input = c.req.valid('json')
  const result = await authService.login(input)

  return c.json(result)
})

authRoutes.post('/auth/refresh', validate('json', refreshBodySchema), async (c) => {
  const authService = c.get('authService')
  const { refreshToken } = c.req.valid('json')
  const result = await authService.refresh(refreshToken)

  return c.json(result)
})

authRoutes.post('/auth/logout', validate('json', refreshBodySchema), async (c) => {
  const authService = c.get('authService')
  const { refreshToken } = c.req.valid('json')
  await authService.logout(refreshToken)

  return c.body(null, 204)
})

authRoutes.get('/auth/me', requireAuth, async (c) => {
  return c.json({ user: c.get('currentUser') })
})
