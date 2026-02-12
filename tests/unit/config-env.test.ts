import { describe, expect, it } from 'vitest'
import { parseRuntimeBindings } from '../../src/config/env'
import { ApiError } from '../../src/lib/errors'

describe('config env', () => {
  it('should parse d1 configuration', () => {
    const config = parseRuntimeBindings({
      DB_DRIVER: 'd1',
      APP_ENV: 'production',
      DB: {} as D1Database,
      JWT_SECRET: '0123456789abcdef',
    })

    expect(config.DB_DRIVER).toBe('d1')
    expect(config.APP_ENV).toBe('production')
    expect(config.JWT_SECRET).toBe('0123456789abcdef')
  })

  it('should reject short jwt secret', () => {
    expect(() =>
      parseRuntimeBindings({
        DB_DRIVER: 'memory',
        APP_ENV: 'development',
        JWT_SECRET: 'short',
      }),
    ).toThrow(ApiError)
  })

  it('should reject memory driver outside development', () => {
    expect(() =>
      parseRuntimeBindings({
        DB_DRIVER: 'memory',
        APP_ENV: 'production',
        JWT_SECRET: '0123456789abcdef',
      }),
    ).toThrow(ApiError)
  })
})
