import { ApiError } from '@/lib/errors'
import type { TodoRepository } from '@/repositories/todo-repository'
import type {
  CreateTodoInput,
  ListTodosQuery,
  ListTodosResult,
  PatchTodoInput,
  PutTodoInput,
  Todo,
  TodoRow,
} from '@/types/todo'
import type { AuthUser } from '@/types/user'

const toTodo = (row: TodoRow): Todo => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  completed: row.completed === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const resolveScopeUserId = (
  currentUser: AuthUser,
  requestedUserId?: number,
): number | undefined => {
  if (currentUser.role === 'admin') {
    return requestedUserId
  }

  if (requestedUserId !== undefined && requestedUserId !== currentUser.id) {
    throw new ApiError(403, 'FORBIDDEN', 'insufficient permissions')
  }

  return currentUser.id
}

export const createTodoService = (repository: TodoRepository) => {
  const listTodos = async (
    query: ListTodosQuery,
    currentUser: AuthUser,
  ): Promise<ListTodosResult> => {
    const scopeUserId = resolveScopeUserId(currentUser, query.userId)
    const rows = await repository.list(query, scopeUserId)

    return {
      items: rows.items.map(toTodo),
      page: {
        limit: query.limit,
        offset: query.offset,
        total: rows.total,
      },
    }
  }

  const getTodoById = async (id: number, currentUser: AuthUser): Promise<Todo> => {
    const scopeUserId = currentUser.role === 'admin' ? undefined : currentUser.id
    const row = await repository.findById(id, scopeUserId)
    if (!row) {
      throw new ApiError(404, 'NOT_FOUND', 'todo not found')
    }

    return toTodo(row)
  }

  const createTodo = async (input: CreateTodoInput, currentUser: AuthUser): Promise<Todo> => {
    const id = await repository.create(input, currentUser.id)
    if (!id) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'failed to create todo')
    }

    const row = await repository.findById(id, currentUser.id)
    if (!row) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'failed to fetch created todo')
    }

    return toTodo(row)
  }

  const replaceTodo = async (
    id: number,
    input: PutTodoInput,
    currentUser: AuthUser,
  ): Promise<Todo> => {
    const scopeUserId = currentUser.role === 'admin' ? undefined : currentUser.id
    const changes = await repository.update(id, input, scopeUserId)
    if (changes === 0) {
      throw new ApiError(404, 'NOT_FOUND', 'todo not found')
    }

    const row = await repository.findById(id, scopeUserId)
    if (!row) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'failed to fetch updated todo')
    }

    return toTodo(row)
  }

  const patchTodo = async (
    id: number,
    input: PatchTodoInput,
    currentUser: AuthUser,
  ): Promise<Todo> => {
    const scopeUserId = currentUser.role === 'admin' ? undefined : currentUser.id
    const changes = await repository.update(id, input, scopeUserId)
    if (changes === 0) {
      throw new ApiError(404, 'NOT_FOUND', 'todo not found')
    }

    const row = await repository.findById(id, scopeUserId)
    if (!row) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'failed to fetch updated todo')
    }

    return toTodo(row)
  }

  const deleteTodo = async (id: number, currentUser: AuthUser): Promise<void> => {
    const scopeUserId = currentUser.role === 'admin' ? undefined : currentUser.id
    const changes = await repository.remove(id, scopeUserId)
    if (changes === 0) {
      throw new ApiError(404, 'NOT_FOUND', 'todo not found')
    }
  }

  const checkReady = async (): Promise<void> => {
    try {
      await repository.ping()
    } catch {
      throw new ApiError(503, 'INTERNAL_ERROR', 'dependency not ready')
    }
  }

  return {
    listTodos,
    getTodoById,
    createTodo,
    replaceTodo,
    patchTodo,
    deleteTodo,
    checkReady,
  }
}

export type TodoService = ReturnType<typeof createTodoService>
