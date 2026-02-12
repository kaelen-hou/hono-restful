import type {
  CreateTodoInput,
  ListTodosQuery,
  PatchTodoInput,
  PutTodoInput,
  TodoRow,
} from '@/types/todo'

export type TodoListRows = {
  items: TodoRow[]
  total: number
}

export interface TodoRepository {
  list(query: ListTodosQuery, scopeUserId?: number): Promise<TodoListRows>
  findById(id: number, scopeUserId?: number): Promise<TodoRow | null>
  create(input: CreateTodoInput, userId: number): Promise<number | null>
  update(id: number, input: PutTodoInput | PatchTodoInput, scopeUserId?: number): Promise<number>
  remove(id: number, scopeUserId?: number): Promise<number>
  ping(): Promise<void>
}
