import { ApiError } from '../../../lib/errors'
import type { TodoRepository } from '../../../repositories/todo-repository'
import type { Bindings } from '../../../types/env'
import { createD1TodoRepository } from './d1-repository'
import { createMemoryTodoRepository } from './memory-repository'

const isProductionLike = (env?: string): boolean => env === 'production' || env === 'staging'

let memoryRepositorySingleton: TodoRepository | null = null

export const createTodoRepositoryFromEnv = (bindings: Bindings): TodoRepository => {
  const driver = bindings.DB_DRIVER ?? 'd1'

  if (driver === 'memory') {
    if (isProductionLike(bindings.APP_ENV)) {
      throw new ApiError(500, 'CONFIG_ERROR', 'memory db driver is forbidden outside development')
    }

    if (!memoryRepositorySingleton) {
      memoryRepositorySingleton = createMemoryTodoRepository()
    }

    return memoryRepositorySingleton
  }

  if (!bindings.DB) {
    throw new ApiError(500, 'CONFIG_ERROR', 'D1 binding is required when DB_DRIVER=d1')
  }

  return createD1TodoRepository(bindings.DB)
}
