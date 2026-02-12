import type { TodoRow } from '../types/todo'
import type { RefreshSessionRow, UserRow } from '../types/user'

export type MemoryDbStore = {
  todos: TodoRow[]
  users: UserRow[]
  refreshSessions: RefreshSessionRow[]
  nextTodoId: number
  nextUserId: number
}

const createMemoryDbStore = (): MemoryDbStore => ({
  todos: [],
  users: [],
  refreshSessions: [],
  nextTodoId: 1,
  nextUserId: 1,
})

let memoryDbStoreSingleton: MemoryDbStore | null = null

export const getMemoryDbStore = (): MemoryDbStore => {
  if (!memoryDbStoreSingleton) {
    memoryDbStoreSingleton = createMemoryDbStore()
  }

  return memoryDbStoreSingleton
}

export const resetMemoryDbStore = (): void => {
  memoryDbStoreSingleton = createMemoryDbStore()
}
