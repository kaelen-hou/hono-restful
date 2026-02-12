import { createTodoRepositoryFromEnv } from '../infrastructure/persistence/todo/repository-factory'
import { createUserRepositoryFromEnv } from '../infrastructure/persistence/user/repository-factory'
import { type AuthService, createAuthService } from '../services/auth-service'
import { createTodoService, type TodoService } from '../services/todo-service'
import type { Bindings } from '../types/env'

export type RequestServices = {
  authService: AuthService
  todoService: TodoService
}

export const createRequestServices = (bindings: Bindings): RequestServices => {
  const todoRepository = createTodoRepositoryFromEnv(bindings)
  const userRepository = createUserRepositoryFromEnv(bindings)

  return {
    authService: createAuthService(userRepository, bindings.JWT_SECRET),
    todoService: createTodoService(todoRepository),
  }
}
