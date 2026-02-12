import { Hono } from 'hono'
import { requireAuth } from '../lib/auth-middleware'
import { loginBodySchema, registerBodySchema } from '../lib/schemas/auth'
import { validate } from '../lib/validation'
import { createUserRepositoryFromEnv } from '../repositories/user-repository-factory'
import { createAuthService } from '../services/auth-service'
import type { AppEnv } from '../types/env'

export const authRoutes = new Hono<AppEnv>()

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

authRoutes.get('/auth/me', requireAuth, async (c) => {
  return c.json({ user: c.get('currentUser') })
})
