import type { TodoRow } from '../types/todo'
import type { UserRow } from '../types/user'

export type MemoryDbStore = {
  todos: TodoRow[]
  users: UserRow[]
  nextTodoId: number
  nextUserId: number
}

const createMemoryDbStore = (): MemoryDbStore => ({
  todos: [],
  users: [],
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
