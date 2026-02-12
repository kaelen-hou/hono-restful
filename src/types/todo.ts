export type TodoRow = {
  id: number
  title: string
  completed: number
  created_at: string
  updated_at: string
}

export type Todo = {
  id: number
  title: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

export type CreateTodoInput = {
  title: string
  completed: boolean
}

export type UpdateTodoInput = {
  title?: string
  completed?: boolean
}
