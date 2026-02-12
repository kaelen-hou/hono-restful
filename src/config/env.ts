import { z } from 'zod'
import { ApiError } from '@/lib/errors'
import type { Bindings } from '@/types/env'

const bindingsSchema = z
  .object({
    DB: z.custom<D1Database | undefined>().optional(),
    DB_DRIVER: z.enum(['d1', 'memory']).default('d1'),
    APP_ENV: z.enum(['development', 'staging', 'production']).default('production'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  })
  .superRefine((value, ctx) => {
    if (value.DB_DRIVER === 'd1' && !value.DB) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'D1 binding is required when DB_DRIVER=d1',
      })
    }

    if (value.DB_DRIVER === 'memory' && value.APP_ENV !== 'development') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'memory db driver is forbidden outside development',
      })
    }
  })

export type RuntimeBindings = z.infer<typeof bindingsSchema>

export const parseRuntimeBindings = (bindings: Bindings): RuntimeBindings => {
  const parsed = bindingsSchema.safeParse(bindings)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    throw new ApiError(500, 'CONFIG_ERROR', first?.message ?? 'invalid runtime configuration')
  }

  return parsed.data
}
