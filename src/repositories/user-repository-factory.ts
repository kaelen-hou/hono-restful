import { ApiError } from '../lib/errors'
import type { Bindings } from '../types/env'
import type { UserRepository } from './user-repository'
import { createD1UserRepository } from './user-repository-d1'
import { createMemoryUserRepository } from './user-repository-memory'

const isProductionLike = (env?: string): boolean => env === 'production' || env === 'staging'

let memoryUserRepositorySingleton: UserRepository | null = null

export const createUserRepositoryFromEnv = (bindings: Bindings): UserRepository => {
  const driver = bindings.DB_DRIVER ?? 'd1'

  if (driver === 'memory') {
    if (isProductionLike(bindings.APP_ENV)) {
      throw new ApiError(500, 'CONFIG_ERROR', 'memory db driver is forbidden outside development')
    }

    if (!memoryUserRepositorySingleton) {
      memoryUserRepositorySingleton = createMemoryUserRepository()
    }

    return memoryUserRepositorySingleton
  }

  if (!bindings.DB) {
    throw new ApiError(500, 'CONFIG_ERROR', 'D1 binding is required when DB_DRIVER=d1')
  }

  return createD1UserRepository(bindings.DB)
}
