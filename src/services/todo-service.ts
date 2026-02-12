import { ApiError } from '../lib/errors'
import type { TodoRepository } from '../repositories/todo-repository'
import type { CreateTodoInput, Todo, TodoRow, UpdateTodoInput } from '../types/todo'

const toTodo = (row: TodoRow): Todo => ({
  id: row.id,
  title: row.title,
  completed: row.completed === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const createTodoService = (repository: TodoRepository) => {
  const listTodos = async (): Promise<Todo[]> => {
    const rows = await repository.list()
    return rows.map(toTodo)
  }

  const getTodoById = async (id: number): Promise<Todo> => {
    const row = await repository.findById(id)
    if (!row) {
      throw new ApiError(404, 'todo not found')
    }

    return toTodo(row)
  }

  const createTodo = async (input: CreateTodoInput): Promise<Todo> => {
    const id = await repository.create(input)
    if (!id) {
      throw new ApiError(500, 'failed to create todo')
    }

    const row = await repository.findById(id)
    if (!row) {
      throw new ApiError(500, 'failed to fetch created todo')
    }

    return toTodo(row)
  }

  const updateTodo = async (id: number, input: UpdateTodoInput): Promise<Todo> => {
    const changes = await repository.update(id, input)
    if (changes === 0) {
      throw new ApiError(404, 'todo not found')
    }

    const row = await repository.findById(id)
    if (!row) {
      throw new ApiError(500, 'failed to fetch updated todo')
    }

    return toTodo(row)
  }

  const deleteTodo = async (id: number): Promise<void> => {
    const changes = await repository.remove(id)
    if (changes === 0) {
      throw new ApiError(404, 'todo not found')
    }
  }

  return {
    listTodos,
    getTodoById,
    createTodo,
    updateTodo,
    deleteTodo,
  }
}
