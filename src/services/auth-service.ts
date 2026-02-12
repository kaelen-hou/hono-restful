import { createTokenPair, verifyRefreshToken } from '../lib/auth'
import { ApiError } from '../lib/errors'
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
    const existing = await userRepository.findByEmail(input.email)
    if (existing) {
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
    return { ...tokens, user: toUser(created) }
  }

  const login = async (input: LoginInput): Promise<AuthTokens & { user: User }> => {
    const user = await userRepository.findByEmail(input.email)
    if (!user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'invalid credentials')
    }

    const ok = await verifyPassword(input.password, user.password_hash)
    if (!ok) {
      throw new ApiError(401, 'UNAUTHORIZED', 'invalid credentials')
    }

    const tokens = await issueTokenPair(user)
    return { ...tokens, user: toUser(user) }
  }

  const refresh = async (refreshToken: string): Promise<AuthTokens> => {
    const payload = await verifyRefreshToken(refreshToken, jwtSecret)
    const session = await userRepository.findRefreshSessionByJti(payload.jti)

    if (!session || session.revoked_at || isExpired(session.expires_at)) {
      throw new ApiError(401, 'UNAUTHORIZED', 'invalid refresh token')
    }

    const user = await userRepository.findById(payload.id)
    if (!user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'invalid refresh token')
    }

    await userRepository.revokeRefreshSession(payload.jti)
    return issueTokenPair(user)
  }

  const logout = async (refreshToken: string): Promise<void> => {
    const payload = await verifyRefreshToken(refreshToken, jwtSecret)
    await userRepository.revokeRefreshSession(payload.jti)
  }

  return {
    register,
    login,
    refresh,
    logout,
  }
}
