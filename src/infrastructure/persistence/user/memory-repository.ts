import type {
  CreateRefreshSessionInput,
  CreateUserRecordInput,
  UserRepository,
} from '@/repositories/user-repository'
import type { RefreshRevokeReason, RefreshSessionRow, UserRow } from '@/types/user'
import { getMemoryDbStore } from '../memory-store'

const now = () => new Date().toISOString()

export const createMemoryUserRepository = (): UserRepository => {
  const store = getMemoryDbStore()

  const findById = async (id: number): Promise<UserRow | null> => {
    const user = store.users.find((item) => item.id === id)
    return user ?? null
  }

  const findByEmail = async (email: string): Promise<UserRow | null> => {
    const normalized = email.trim().toLowerCase()
    const user = store.users.find((item) => item.email.toLowerCase() === normalized)
    return user ?? null
  }

  const create = async (input: CreateUserRecordInput): Promise<number | null> => {
    const id = store.nextUserId
    store.nextUserId += 1

    const timestamp = now()
    store.users.push({
      id,
      email: input.email,
      password_hash: input.passwordHash,
      role: input.role,
      created_at: timestamp,
      updated_at: timestamp,
    })

    return id
  }

  const createRefreshSession = async (input: CreateRefreshSessionInput): Promise<void> => {
    const row: RefreshSessionRow = {
      jti: input.jti,
      user_id: input.userId,
      family_id: input.familyId,
      device_id: input.deviceId,
      expires_at: input.expiresAt,
      revoked_at: null,
      revoked_reason: null,
      replaced_by_jti: null,
      created_at: now(),
    }

    store.refreshSessions.push(row)
  }

  const findRefreshSessionByJti = async (jti: string): Promise<RefreshSessionRow | null> => {
    const row = store.refreshSessions.find((item) => item.jti === jti)
    return row ?? null
  }

  const markRefreshSessionRotated = async (jti: string, replacedByJti: string): Promise<void> => {
    const row = store.refreshSessions.find((item) => item.jti === jti)
    if (!row) {
      return
    }

    row.revoked_at = now()
    row.revoked_reason = 'rotated'
    row.replaced_by_jti = replacedByJti
  }

  const revokeRefreshSession = async (jti: string, reason: RefreshRevokeReason): Promise<void> => {
    const row = store.refreshSessions.find((item) => item.jti === jti)
    if (!row) {
      return
    }

    row.revoked_at = now()
    row.revoked_reason = reason
  }

  const revokeRefreshSessionFamily = async (
    familyId: string,
    reason: RefreshRevokeReason,
  ): Promise<void> => {
    const revokedAt = now()
    for (const row of store.refreshSessions) {
      if (row.family_id !== familyId) {
        continue
      }

      row.revoked_at = revokedAt
      row.revoked_reason = reason
    }
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
