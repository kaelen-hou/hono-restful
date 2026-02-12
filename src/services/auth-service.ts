import { createTokenPair, verifyRefreshToken } from '../features/auth/token'
import { ApiError } from '../lib/errors'
import { logAudit } from '../lib/logger'
import { hashPassword, verifyPassword } from '../lib/password'
import type { UserRepository } from '../repositories/user-repository'
import type { AuthTokens, LoginInput, RegisterInput, User, UserRow } from '../types/user'

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  role: row.role,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const isExpired = (expiresAtIso: string): boolean => new Date(expiresAtIso).getTime() <= Date.now()

const toMaskedEmail = (email: string): string => {
  const normalized = email.trim().toLowerCase()
  const [local = '', domain = ''] = normalized.split('@')
  if (!domain) {
    return '***'
  }

  const prefix = local.slice(0, 2)
  return `${prefix}***@${domain}`
}

export const createAuthService = (userRepository: UserRepository, jwtSecret?: string) => {
  const issueTokenPair = async (user: UserRow): Promise<AuthTokens> => {
    const tokenPair = await createTokenPair(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
    )

    await userRepository.createRefreshSession({
      jti: tokenPair.jti,
      userId: user.id,
      expiresAt: tokenPair.refreshExpiresAt,
    })

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    }
  }

  const register = async (input: RegisterInput): Promise<AuthTokens & { user: User }> => {
    const maskedEmail = toMaskedEmail(input.email)
    const existing = await userRepository.findByEmail(input.email)
    if (existing) {
      logAudit('auth_register_conflict', {
        email: maskedEmail,
      })
      throw new ApiError(409, 'CONFLICT', 'email already exists')
    }

    const passwordHash = await hashPassword(input.password)
    const userId = await userRepository.create({
      email: input.email,
      passwordHash,
      role: 'user',
    })

    if (!userId) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'failed to create user')
    }

    const created = await userRepository.findById(userId)
    if (!created) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'failed to fetch created user')
    }

    const tokens = await issueTokenPair(created)
    logAudit('auth_register_success', {
      userId: created.id,
      email: toMaskedEmail(created.email),
      role: created.role,
    })
    return { ...tokens, user: toUser(created) }
  }

  const login = async (input: LoginInput): Promise<AuthTokens & { user: User }> => {
    const maskedEmail = toMaskedEmail(input.email)
    const user = await userRepository.findByEmail(input.email)
    if (!user) {
      logAudit('auth_login_failed', {
        email: maskedEmail,
        reason: 'user_not_found',
      })
      throw new ApiError(401, 'UNAUTHORIZED', 'invalid credentials')
    }

    const ok = await verifyPassword(input.password, user.password_hash)
    if (!ok) {
      logAudit('auth_login_failed', {
        email: maskedEmail,
        reason: 'bad_password',
      })
      throw new ApiError(401, 'UNAUTHORIZED', 'invalid credentials')
    }

    const tokens = await issueTokenPair(user)
    logAudit('auth_login_success', {
      userId: user.id,
      email: toMaskedEmail(user.email),
      role: user.role,
    })
    return { ...tokens, user: toUser(user) }
  }

  const refresh = async (refreshToken: string): Promise<AuthTokens> => {
    let payload: Awaited<ReturnType<typeof verifyRefreshToken>>
    try {
      payload = await verifyRefreshToken(refreshToken, jwtSecret)
    } catch {
      logAudit('auth_refresh_failed', {
        reason: 'token_verification_failed',
      })
      throw new ApiError(401, 'UNAUTHORIZED', 'invalid refresh token')
    }

    const session = await userRepository.findRefreshSessionByJti(payload.jti)

    if (!session || session.revoked_at || isExpired(session.expires_at)) {
      logAudit('auth_refresh_failed', {
        userId: payload.id,
        reason: 'session_invalid',
      })
      throw new ApiError(401, 'UNAUTHORIZED', 'invalid refresh token')
    }

    const user = await userRepository.findById(payload.id)
    if (!user) {
      logAudit('auth_refresh_failed', {
        userId: payload.id,
        reason: 'user_not_found',
      })
      throw new ApiError(401, 'UNAUTHORIZED', 'invalid refresh token')
    }

    await userRepository.revokeRefreshSession(payload.jti)
    const tokens = await issueTokenPair(user)
    logAudit('auth_refresh_success', {
      userId: user.id,
      email: toMaskedEmail(user.email),
    })
    return tokens
  }

  const logout = async (refreshToken: string): Promise<void> => {
    let payload: Awaited<ReturnType<typeof verifyRefreshToken>>
    try {
      payload = await verifyRefreshToken(refreshToken, jwtSecret)
    } catch {
      logAudit('auth_logout_failed', {
        reason: 'token_verification_failed',
      })
      throw new ApiError(401, 'UNAUTHORIZED', 'invalid refresh token')
    }

    await userRepository.revokeRefreshSession(payload.jti)
    logAudit('auth_logout_success', {
      userId: payload.id,
    })
  }

  return {
    register,
    login,
    refresh,
    logout,
  }
}

export type AuthService = ReturnType<typeof createAuthService>
