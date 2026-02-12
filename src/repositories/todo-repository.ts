import type { CreateTodoInput, ListTodosQuery, PatchTodoInput, PutTodoInput, TodoRow } from '../types/todo'

export type TodoListRows = {
  items: TodoRow[]
  total: number
}

export interface TodoRepository {
  list(query: ListTodosQuery): Promise<TodoListRows>
  findById(id: number): Promise<TodoRow | null>
  create(input: CreateTodoInput): Promise<number | null>
  update(id: number, input: PutTodoInput | PatchTodoInput): Promise<number>
  remove(id: number): Promise<number>
  ping(): Promise<void>
}
