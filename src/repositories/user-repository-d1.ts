import { eq, sql } from 'drizzle-orm'
import { createDb } from '../db/client'
import { refreshSessionsTable, usersTable } from '../db/schema'
import type { RefreshSessionRow, UserRow } from '../types/user'
import type {
  CreateRefreshSessionInput,
  CreateUserRecordInput,
  UserRepository,
} from './user-repository'

const toUserRow = (row: typeof usersTable.$inferSelect): UserRow => ({
  id: row.id,
  email: row.email,
  password_hash: row.passwordHash,
  role: row.role,
  created_at: row.createdAt,
  updated_at: row.updatedAt,
})

const toRefreshSessionRow = (row: typeof refreshSessionsTable.$inferSelect): RefreshSessionRow => ({
  jti: row.jti,
  user_id: row.userId,
  expires_at: row.expiresAt,
  revoked_at: row.revokedAt,
  created_at: row.createdAt,
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

  const createRefreshSession = async (input: CreateRefreshSessionInput): Promise<void> => {
    await db.insert(refreshSessionsTable).values({
      jti: input.jti,
      userId: input.userId,
      expiresAt: input.expiresAt,
    })
  }

  const findRefreshSessionByJti = async (jti: string): Promise<RefreshSessionRow | null> => {
    const rows = await db
      .select()
      .from(refreshSessionsTable)
      .where(eq(refreshSessionsTable.jti, jti))
      .limit(1)

    const row = rows[0]
    return row ? toRefreshSessionRow(row) : null
  }

  const revokeRefreshSession = async (jti: string): Promise<void> => {
    await db
      .update(refreshSessionsTable)
      .set({ revokedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(refreshSessionsTable.jti, jti))
  }

  return {
    findById,
    findByEmail,
    create,
    createRefreshSession,
    findRefreshSessionByJti,
    revokeRefreshSession,
  }
}
