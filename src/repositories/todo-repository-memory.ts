import type {
  CreateTodoInput,
  ListTodosQuery,
  PatchTodoInput,
  PutTodoInput,
  TodoRow,
} from '../types/todo'
import { getMemoryDbStore } from './memory-store'
import type { TodoListRows, TodoRepository } from './todo-repository'

const now = () => new Date().toISOString()

export const createMemoryTodoRepository = (): TodoRepository => {
  const store = getMemoryDbStore()

  const list = async (query: ListTodosQuery, scopeUserId?: number): Promise<TodoListRows> => {
    const filtered =
      scopeUserId === undefined
        ? store.todos
        : store.todos.filter((item) => item.user_id === scopeUserId)

    const sorted = [...filtered].sort((a, b) => b.id - a.id)
    const items = sorted.slice(query.offset, query.offset + query.limit)

    return {
      items,
      total: sorted.length,
    }
  }

  const findById = async (id: number, scopeUserId?: number): Promise<TodoRow | null> => {
    const row = store.todos.find((item) => item.id === id)
    if (!row) {
      return null
    }

    if (scopeUserId !== undefined && row.user_id !== scopeUserId) {
      return null
    }

    return row
  }

  const create = async (input: CreateTodoInput, userId: number): Promise<number | null> => {
    const id = store.nextTodoId
    store.nextTodoId += 1

    const timestamp = now()
    store.todos.push({
      id,
      user_id: userId,
      title: input.title,
      completed: input.completed ? 1 : 0,
      created_at: timestamp,
      updated_at: timestamp,
    })

    return id
  }

  const update = async (
    id: number,
    input: PutTodoInput | PatchTodoInput,
    scopeUserId?: number,
  ): Promise<number> => {
    const row = await findById(id, scopeUserId)
    if (!row) {
      return 0
    }

    if (input.title !== undefined) {
      row.title = input.title
    }

    if (input.completed !== undefined) {
      row.completed = input.completed ? 1 : 0
    }

    row.updated_at = now()
    return 1
  }

  const remove = async (id: number, scopeUserId?: number): Promise<number> => {
    const row = await findById(id, scopeUserId)
    if (!row) {
      return 0
    }

    const index = store.todos.findIndex((item) => item.id === row.id)
    if (index === -1) {
      return 0
    }

    store.todos.splice(index, 1)
    return 1
  }

  const ping = async (): Promise<void> => {
    return
  }

  return {
    list,
    findById,
    create,
    update,
    remove,
    ping,
  }
}
