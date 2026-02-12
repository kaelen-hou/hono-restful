import type { RefreshRevokeReason, RefreshSessionRow, UserRole, UserRow } from '@/types/user'

export type CreateUserRecordInput = {
  email: string
  passwordHash: string
  role: UserRole
}

export type CreateRefreshSessionInput = {
  jti: string
  userId: number
  familyId: string
  deviceId: string
  expiresAt: string
}

export interface UserRepository {
  findById(id: number): Promise<UserRow | null>
  findByEmail(email: string): Promise<UserRow | null>
  create(input: CreateUserRecordInput): Promise<number | null>

  createRefreshSession(input: CreateRefreshSessionInput): Promise<void>
  findRefreshSessionByJti(jti: string): Promise<RefreshSessionRow | null>
  markRefreshSessionRotated(jti: string, replacedByJti: string): Promise<void>
  revokeRefreshSession(jti: string, reason: RefreshRevokeReason): Promise<void>
  revokeRefreshSessionFamily(familyId: string, reason: RefreshRevokeReason): Promise<void>
}
