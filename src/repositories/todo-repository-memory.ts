import type {
  CreateTodoInput,
  ListTodosQuery,
  PatchTodoInput,
  PutTodoInput,
  TodoRow,
} from '../types/todo'
import type { TodoListRows, TodoRepository } from './todo-repository'

export type MemoryStore = {
  rows: TodoRow[]
  nextId: number
}

export const createMemoryStore = (): MemoryStore => ({
  rows: [],
  nextId: 1,
})

const now = () => new Date().toISOString()

export const createMemoryTodoRepository = (
  store: MemoryStore = createMemoryStore(),
): TodoRepository => {
  const list = async (query: ListTodosQuery): Promise<TodoListRows> => {
    const sorted = [...store.rows].sort((a, b) => b.id - a.id)
    const items = sorted.slice(query.offset, query.offset + query.limit)

    return {
      items,
      total: sorted.length,
    }
  }

  const findById = async (id: number): Promise<TodoRow | null> => {
    const row = store.rows.find((item) => item.id === id)
    return row ?? null
  }

  const create = async (input: CreateTodoInput): Promise<number | null> => {
    const id = store.nextId
    store.nextId += 1

    const timestamp = now()
    const row: TodoRow = {
      id,
      title: input.title,
      completed: input.completed ? 1 : 0,
      created_at: timestamp,
      updated_at: timestamp,
    }

    store.rows.push(row)
    return id
  }

  const update = async (id: number, input: PutTodoInput | PatchTodoInput): Promise<number> => {
    const row = store.rows.find((item) => item.id === id)
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

  const remove = async (id: number): Promise<number> => {
    const index = store.rows.findIndex((item) => item.id === id)
    if (index === -1) {
      return 0
    }

    store.rows.splice(index, 1)
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
