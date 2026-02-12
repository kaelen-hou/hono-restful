import { Hono } from 'hono'
import { requireAuth } from '../lib/auth-middleware'
import { createRateLimitMiddleware } from '../lib/rate-limit'
import { loginBodySchema, refreshBodySchema, registerBodySchema } from '../lib/schemas/auth'
import { validate } from '../lib/validation'
import { createUserRepositoryFromEnv } from '../repositories/user-repository-factory'
import { createAuthService } from '../services/auth-service'
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
  const userRepository = createUserRepositoryFromEnv(c.env)
  const authService = createAuthService(userRepository, c.env.JWT_SECRET)
  const input = c.req.valid('json')
  const result = await authService.register(input)

  return c.json(result, 201)
})

authRoutes.post('/auth/login', validate('json', loginBodySchema), async (c) => {
  const userRepository = createUserRepositoryFromEnv(c.env)
  const authService = createAuthService(userRepository, c.env.JWT_SECRET)
  const input = c.req.valid('json')
  const result = await authService.login(input)

  return c.json(result)
})

authRoutes.post('/auth/refresh', validate('json', refreshBodySchema), async (c) => {
  const userRepository = createUserRepositoryFromEnv(c.env)
  const authService = createAuthService(userRepository, c.env.JWT_SECRET)
  const { refreshToken } = c.req.valid('json')
  const result = await authService.refresh(refreshToken)

  return c.json(result)
})

authRoutes.post('/auth/logout', validate('json', refreshBodySchema), async (c) => {
  const userRepository = createUserRepositoryFromEnv(c.env)
  const authService = createAuthService(userRepository, c.env.JWT_SECRET)
  const { refreshToken } = c.req.valid('json')
  await authService.logout(refreshToken)

  return c.body(null, 204)
})

authRoutes.get('/auth/me', requireAuth, async (c) => {
  return c.json({ user: c.get('currentUser') })
})
