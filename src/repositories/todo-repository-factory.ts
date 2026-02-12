import { ApiError } from '../lib/errors'
import type { Bindings } from '../types/env'
import { createD1TodoRepository } from './todo-repository-d1'
import { createMemoryTodoRepository } from './todo-repository-memory'
import type { TodoRepository } from './todo-repository'

export const createTodoRepositoryFromEnv = (bindings: Bindings): TodoRepository => {
  const driver = bindings.DB_DRIVER ?? 'd1'

  if (driver === 'memory') {
    return createMemoryTodoRepository()
  }

  if (!bindings.DB) {
    throw new ApiError(500, 'D1 binding is required when DB_DRIVER=d1')
  }

  return createD1TodoRepository(bindings.DB)
}
