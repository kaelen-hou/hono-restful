import type { SQL } from 'drizzle-orm'
import { desc, eq, sql } from 'drizzle-orm'
import { createDb } from '../db/client'
import { todosTable } from '../db/schema'
import type {
  CreateTodoInput,
  ListTodosQuery,
  PatchTodoInput,
  PutTodoInput,
  TodoRow,
} from '../types/todo'
import type { TodoListRows, TodoRepository } from './todo-repository'

const toTodoRow = (row: typeof todosTable.$inferSelect): TodoRow => ({
  id: row.id,
  title: row.title,
  completed: row.completed,
  created_at: row.createdAt,
  updated_at: row.updatedAt,
})

export const createD1TodoRepository = (d1: D1Database): TodoRepository => {
  const db = createDb(d1)

  const list = async (query: ListTodosQuery): Promise<TodoListRows> => {
    const rows = await db
      .select()
      .from(todosTable)
      .orderBy(desc(todosTable.id))
      .limit(query.limit)
      .offset(query.offset)

    const countRows = await db.select({ total: sql<number>`count(*)` }).from(todosTable)

    return {
      items: rows.map(toTodoRow),
      total: countRows[0]?.total ?? 0,
    }
  }

  const findById = async (id: number): Promise<TodoRow | null> => {
    const rows = await db.select().from(todosTable).where(eq(todosTable.id, id)).limit(1)
    const row = rows[0]
    return row ? toTodoRow(row) : null
  }

  const create = async (input: CreateTodoInput): Promise<number | null> => {
    const inserted = await db
      .insert(todosTable)
      .values({
        title: input.title,
        completed: input.completed ? 1 : 0,
      })
      .returning({ id: todosTable.id })

    return inserted[0]?.id ?? null
  }

  const update = async (id: number, input: PutTodoInput | PatchTodoInput): Promise<number> => {
    if (input.title === undefined && input.completed === undefined) {
      return 0
    }

    const values: { title?: string; completed?: number; updatedAt?: SQL } = {
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }

    if (input.title !== undefined) {
      values.title = input.title
    }

    if (input.completed !== undefined) {
      values.completed = input.completed ? 1 : 0
    }

    const result = await db.update(todosTable).set(values).where(eq(todosTable.id, id))

    return result.meta.changes ?? 0
  }

  const remove = async (id: number): Promise<number> => {
    const result = await db.delete(todosTable).where(eq(todosTable.id, id))
    return result.meta.changes ?? 0
  }

  const ping = async (): Promise<void> => {
    await db.select({ one: sql<number>`1` }).from(todosTable).limit(1)
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
