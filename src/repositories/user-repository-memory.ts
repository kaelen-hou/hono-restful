import type { RefreshSessionRow, UserRow } from '../types/user'
import { getMemoryDbStore } from './memory-store'
import type {
  CreateRefreshSessionInput,
  CreateUserRecordInput,
  UserRepository,
} from './user-repository'

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
      expires_at: input.expiresAt,
      revoked_at: null,
      created_at: now(),
    }

    store.refreshSessions.push(row)
  }

  const findRefreshSessionByJti = async (jti: string): Promise<RefreshSessionRow | null> => {
    const row = store.refreshSessions.find((item) => item.jti === jti)
    return row ?? null
  }

  const revokeRefreshSession = async (jti: string): Promise<void> => {
    const row = store.refreshSessions.find((item) => item.jti === jti)
    if (!row) {
      return
    }

    row.revoked_at = now()
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
