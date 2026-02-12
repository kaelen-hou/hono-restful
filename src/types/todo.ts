export type TodoRow = {
  id: number
  user_id: number
  title: string
  completed: number
  created_at: string
  updated_at: string
}

export type Todo = {
  id: number
  userId: number
  title: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

export type CreateTodoInput = {
  title: string
  completed: boolean
}

export type PatchTodoInput = {
  title?: string
  completed?: boolean
}

export type PutTodoInput = {
  title: string
  completed: boolean
}

export type ListTodosQuery = {
  limit: number
  offset: number
  userId?: number
}

export type ListTodosResult = {
  items: Todo[]
  page: {
    limit: number
    offset: number
    total: number
  }
}
