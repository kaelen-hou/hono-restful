import { parseRuntimeBindings } from '@/config/env'
import { createTodoRepositoryFromEnv } from '@/infrastructure/persistence/todo/repository-factory'
import { createUserRepositoryFromEnv } from '@/infrastructure/persistence/user/repository-factory'
import { type AuthService, createAuthService } from '@/services/auth-service'
import { createTodoService, type TodoService } from '@/services/todo-service'
import type { Bindings } from '@/types/env'

export type RequestServices = {
  authService: AuthService
  todoService: TodoService
}

export const createRequestServices = (bindings: Bindings): RequestServices => {
  const config = parseRuntimeBindings(bindings)
  const normalizedBindings: Bindings = {
    DB_DRIVER: config.DB_DRIVER,
    APP_ENV: config.APP_ENV,
    JWT_SECRET: config.JWT_SECRET,
    ...(config.DB ? { DB: config.DB } : {}),
  }
  const todoRepository = createTodoRepositoryFromEnv(normalizedBindings)
  const userRepository = createUserRepositoryFromEnv(normalizedBindings)

  return {
    authService: createAuthService(userRepository, config.JWT_SECRET),
    todoService: createTodoService(todoRepository),
  }
}
