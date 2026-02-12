import type { MiddlewareHandler } from 'hono'
import { ApiError } from '@/lib/errors'
import type { AppEnv } from '@/types/env'
import { extractBearerToken, verifyAccessToken } from './token'

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = extractBearerToken(c.req.header('authorization'))
  const currentUser = await verifyAccessToken(token, c.env.JWT_SECRET)
  c.set('currentUser', currentUser)
  await next()
}

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get('currentUser')
  if (user.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'admin permission required')
  }

  await next()
}
