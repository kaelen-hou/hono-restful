import { ApiError } from '../lib/errors'
import type { TodoRepository } from '../repositories/todo-repository'
import type {
  CreateTodoInput,
  ListTodosQuery,
  ListTodosResult,
  PatchTodoInput,
  PutTodoInput,
  Todo,
  TodoRow,
} from '../types/todo'

const toTodo = (row: TodoRow): Todo => ({
  id: row.id,
  title: row.title,
  completed: row.completed === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const createTodoService = (repository: TodoRepository) => {
  const listTodos = async (query: ListTodosQuery): Promise<ListTodosResult> => {
    const rows = await repository.list(query)

    return {
      items: rows.items.map(toTodo),
      page: {
        limit: query.limit,
        offset: query.offset,
        total: rows.total,
      },
    }
  }

  const getTodoById = async (id: number): Promise<Todo> => {
    const row = await repository.findById(id)
    if (!row) {
      throw new ApiError(404, 'NOT_FOUND', 'todo not found')
    }

    return toTodo(row)
  }

  const createTodo = async (input: CreateTodoInput): Promise<Todo> => {
    const id = await repository.create(input)
    if (!id) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'failed to create todo')
    }

    const row = await repository.findById(id)
    if (!row) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'failed to fetch created todo')
    }

    return toTodo(row)
  }

  const replaceTodo = async (id: number, input: PutTodoInput): Promise<Todo> => {
    const changes = await repository.update(id, input)
    if (changes === 0) {
      throw new ApiError(404, 'NOT_FOUND', 'todo not found')
    }

    const row = await repository.findById(id)
    if (!row) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'failed to fetch updated todo')
    }

    return toTodo(row)
  }

  const patchTodo = async (id: number, input: PatchTodoInput): Promise<Todo> => {
    const changes = await repository.update(id, input)
    if (changes === 0) {
      throw new ApiError(404, 'NOT_FOUND', 'todo not found')
    }

    const row = await repository.findById(id)
    if (!row) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'failed to fetch updated todo')
    }

    return toTodo(row)
  }

  const deleteTodo = async (id: number): Promise<void> => {
    const changes = await repository.remove(id)
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
