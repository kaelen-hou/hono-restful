import type { Todo, TodoRow } from '@/types/todo'

export const toTodo = (row: TodoRow): Todo => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  completed: row.completed === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})
