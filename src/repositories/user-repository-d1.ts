import { eq } from 'drizzle-orm'
import { createDb } from '../db/client'
import { usersTable } from '../db/schema'
import type { UserRow } from '../types/user'
import type { CreateUserRecordInput, UserRepository } from './user-repository'

const toUserRow = (row: typeof usersTable.$inferSelect): UserRow => ({
  id: row.id,
  email: row.email,
  password_hash: row.passwordHash,
  role: row.role,
  created_at: row.createdAt,
  updated_at: row.updatedAt,
})

export const createD1UserRepository = (d1: D1Database): UserRepository => {
  const db = createDb(d1)

  const findById = async (id: number): Promise<UserRow | null> => {
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1)
    const row = rows[0]
    return row ? toUserRow(row) : null
  }

  const findByEmail = async (email: string): Promise<UserRow | null> => {
    const normalized = email.trim().toLowerCase()
    const rows = await db.select().from(usersTable).where(eq(usersTable.email, normalized)).limit(1)

    const row = rows[0]
    return row ? toUserRow(row) : null
  }

  const create = async (input: CreateUserRecordInput): Promise<number | null> => {
    const inserted = await db
      .insert(usersTable)
      .values({
        email: input.email.trim().toLowerCase(),
        passwordHash: input.passwordHash,
        role: input.role,
      })
      .returning({ id: usersTable.id })

    return inserted[0]?.id ?? null
  }

  return {
    findById,
    findByEmail,
    create,
  }
}
