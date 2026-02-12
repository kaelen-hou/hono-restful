import { eq, sql } from 'drizzle-orm'
import { createDb } from '@/db/client'
import { refreshSessionsTable, usersTable } from '@/db/schema'
import type {
  CreateRefreshSessionInput,
  CreateUserRecordInput,
  UserRepository,
} from '@/repositories/user-repository'
import type { RefreshRevokeReason, RefreshSessionRow, UserRow } from '@/types/user'

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
  family_id: row.familyId,
  device_id: row.deviceId,
  expires_at: row.expiresAt,
  revoked_at: row.revokedAt,
  revoked_reason: row.revokedReason,
  replaced_by_jti: row.replacedByJti,
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
      familyId: input.familyId,
      deviceId: input.deviceId,
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

  const markRefreshSessionRotated = async (jti: string, replacedByJti: string): Promise<void> => {
    await db
      .update(refreshSessionsTable)
      .set({
        revokedAt: sql`CURRENT_TIMESTAMP`,
        revokedReason: 'rotated',
        replacedByJti,
      })
      .where(eq(refreshSessionsTable.jti, jti))
  }

  const revokeRefreshSession = async (jti: string, reason: RefreshRevokeReason): Promise<void> => {
    await db
      .update(refreshSessionsTable)
      .set({ revokedAt: sql`CURRENT_TIMESTAMP`, revokedReason: reason })
      .where(eq(refreshSessionsTable.jti, jti))
  }

  const revokeRefreshSessionFamily = async (
    familyId: string,
    reason: RefreshRevokeReason,
  ): Promise<void> => {
    await db
      .update(refreshSessionsTable)
      .set({ revokedAt: sql`CURRENT_TIMESTAMP`, revokedReason: reason })
      .where(eq(refreshSessionsTable.familyId, familyId))
  }

  return {
    findById,
    findByEmail,
    create,
    createRefreshSession,
    findRefreshSessionByJti,
    markRefreshSessionRotated,
    revokeRefreshSession,
    revokeRefreshSessionFamily,
  }
}
