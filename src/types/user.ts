export type UserRole = 'admin' | 'user'

export type UserRow = {
  id: number
  email: string
  password_hash: string
  role: UserRole
  created_at: string
  updated_at: string
}

export type RefreshSessionRow = {
  jti: string
  user_id: number
  family_id: string
  device_id: string
  expires_at: string
  revoked_at: string | null
  revoked_reason: string | null
  replaced_by_jti: string | null
  created_at: string
}

export type RefreshRevokeReason = 'logout' | 'rotated' | 'reuse_detected' | 'security_event'

export type User = {
  id: number
  email: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export type AuthUser = {
  id: number
  email: string
  role: UserRole
}

export type RegisterInput = {
  email: string
  password: string
}

export type LoginInput = {
  email: string
  password: string
}

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}
