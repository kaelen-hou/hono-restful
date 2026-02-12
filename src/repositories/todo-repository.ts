import type { CreateTodoInput, TodoRow, UpdateTodoInput } from '../types/todo'

export interface TodoRepository {
  list(): Promise<TodoRow[]>
  findById(id: number): Promise<TodoRow | null>
  create(input: CreateTodoInput): Promise<number | null>
  update(id: number, input: UpdateTodoInput): Promise<number>
  remove(id: number): Promise<number>
}
