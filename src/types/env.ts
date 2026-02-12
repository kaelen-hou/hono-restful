import type { TodoService } from '../services/todo-service'
import type { AuthUser } from './user'

export type Bindings = {
  DB?: D1Database
  DB_DRIVER?: 'd1' | 'memory'
  APP_ENV?: 'development' | 'staging' | 'production'
  JWT_SECRET?: string
}

export type AppVariables = {
  requestId: string
  todoService: TodoService
  currentUser: AuthUser
}

export type AppEnv = {
  Bindings: Bindings
  Variables: AppVariables
}
