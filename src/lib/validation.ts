import { zValidator } from '@hono/zod-validator'
import type { ZodType } from 'zod'

export const validate = <T extends ZodType>(target: 'json' | 'query' | 'param', schema: T) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const issue = result.error.issues[0]
      const requestId = (c as unknown as { get: (key: string) => string }).get('requestId')
      return c.json(
        {
          code: 'BAD_REQUEST',
          message: issue?.message ?? 'invalid request',
          requestId,
        },
        400,
      )
    }
  })
