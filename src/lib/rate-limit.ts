import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '@/types/env'
import { ApiError } from './errors'

type RateLimitOptions = {
  namespace: string
  max: number
  windowMs: number
}

type Bucket = {
  count: number
  resetAt: number
}

const stores = new Map<string, Map<string, Bucket>>()
const MAX_EXPIRED_DELETES_PER_REQUEST = 128

const getStore = (namespace: string): Map<string, Bucket> => {
  const existing = stores.get(namespace)
  if (existing) {
    return existing
  }

  const created = new Map<string, Bucket>()
  stores.set(namespace, created)
  return created
}

const getClientKey = (c: Parameters<MiddlewareHandler<AppEnv>>[0]): string => {
  const cfIp = c.req.header('cf-connecting-ip')
  if (cfIp) {
    return cfIp
  }

  const forwarded = c.req.header('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown'
  }

  const realIp = c.req.header('x-real-ip')
  if (realIp) {
    return realIp
  }

  return 'unknown'
}

const cleanupExpiredBuckets = (store: Map<string, Bucket>, now: number): void => {
  let deleted = 0
  for (const [key, bucket] of store) {
    if (now < bucket.resetAt) {
      continue
    }

    store.delete(key)
    deleted += 1
    if (deleted >= MAX_EXPIRED_DELETES_PER_REQUEST) {
      break
    }
  }
}

export const createRateLimitMiddleware = (options: RateLimitOptions): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    const now = Date.now()
    const key = getClientKey(c)
    const store = getStore(options.namespace)
    cleanupExpiredBuckets(store, now)
    const current = store.get(key)

    if (!current || now >= current.resetAt) {
      store.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      })
      await next()
      return
    }

    if (current.count >= options.max) {
      throw new ApiError(429, 'TOO_MANY_REQUESTS', 'rate limit exceeded')
    }

    current.count += 1
    await next()
  }
}

export const resetRateLimitStore = (): void => {
  stores.clear()
}
