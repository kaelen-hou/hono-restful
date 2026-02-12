import { describe, expect, it } from 'vitest'
import { createTodoRepositoryFromEnv } from '../../src/infrastructure/persistence/todo/repository-factory'
import { createUserRepositoryFromEnv } from '../../src/infrastructure/persistence/user/repository-factory'
import { ApiError } from '../../src/lib/errors'

describe('repository factories', () => {
  it('should return memory repositories in development', () => {
    const todoRepo = createTodoRepositoryFromEnv({
      DB_DRIVER: 'memory',
      APP_ENV: 'development',
      JWT_SECRET: 'test',
    })
    const userRepo = createUserRepositoryFromEnv({
      DB_DRIVER: 'memory',
      APP_ENV: 'development',
      JWT_SECRET: 'test',
    })

    expect(todoRepo).toBeTruthy()
    expect(userRepo).toBeTruthy()
  })

  it('should forbid memory repositories outside development', () => {
    expect(() =>
      createTodoRepositoryFromEnv({
        DB_DRIVER: 'memory',
        APP_ENV: 'production',
        JWT_SECRET: 'test',
      }),
    ).toThrowError(ApiError)

    expect(() =>
      createUserRepositoryFromEnv({ DB_DRIVER: 'memory', APP_ENV: 'staging', JWT_SECRET: 'test' }),
    ).toThrowError(ApiError)
  })

  it('should require d1 binding for d1 driver', () => {
    expect(() =>
      createTodoRepositoryFromEnv({ DB_DRIVER: 'd1', APP_ENV: 'development', JWT_SECRET: 'test' }),
    ).toThrowError(ApiError)

    expect(() =>
      createUserRepositoryFromEnv({ DB_DRIVER: 'd1', APP_ENV: 'development', JWT_SECRET: 'test' }),
    ).toThrowError(ApiError)
  })
})
