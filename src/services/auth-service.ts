import { createTokenPair } from '@/features/auth/token'
import { ApiError } from '@/lib/errors'
import { logAudit } from '@/lib/logger'
import { hashPassword, verifyPassword } from '@/lib/password'
import type { UserRepository } from '@/repositories/user-repository'
import type { AuthTokens, LoginInput, RegisterInput, User, UserRow } from '@/types/user'
import { toMaskedEmail, toUser } from './auth/mappers'
import { assertRefreshSessionValid, verifyRefreshTokenOrThrow } from './auth/refresh-policy'

export const createAuthService = (userRepository: UserRepository, jwtSecret?: string) => {
  const issueTokenPair = async (
    user: UserRow,
    options: { deviceId: string; familyId?: string },
  ): Promise<AuthTokens & { jti: string; familyId: string; deviceId: string }> => {
    const tokenPair = await createTokenPair(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      options.familyId
        ? { familyId: options.familyId, deviceId: options.deviceId }
        : { deviceId: options.deviceId },
    )

    await userRepository.createRefreshSession({
      jti: tokenPair.jti,
      userId: user.id,
      familyId: tokenPair.familyId,
      deviceId: tokenPair.deviceId,
      expiresAt: tokenPair.refreshExpiresAt,
    })

    return tokenPair
  }

  const register = async (
    input: RegisterInput,
    deviceId: string,
  ): Promise<AuthTokens & { user: User }> => {
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

    const tokens = await issueTokenPair(created, { deviceId })
    logAudit('auth_register_success', {
      userId: created.id,
      email: toMaskedEmail(created.email),
      role: created.role,
    })
    return { ...tokens, user: toUser(created) }
  }

  const login = async (
    input: LoginInput,
    deviceId: string,
  ): Promise<AuthTokens & { user: User }> => {
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

    const tokens = await issueTokenPair(user, { deviceId })
    logAudit('auth_login_success', {
      userId: user.id,
      email: toMaskedEmail(user.email),
      role: user.role,
    })
    return { ...tokens, user: toUser(user) }
  }

  const refresh = async (refreshToken: string): Promise<AuthTokens> => {
    const payload = await verifyRefreshTokenOrThrow(refreshToken, jwtSecret, 'auth_refresh_failed')
    await assertRefreshSessionValid(userRepository, payload)

    const user = await userRepository.findById(payload.id)
    if (!user) {
      logAudit('auth_refresh_failed', {
        userId: payload.id,
        reason: 'user_not_found',
      })
      throw new ApiError(401, 'UNAUTHORIZED', 'invalid refresh token')
    }

    const next = await issueTokenPair(user, {
      deviceId: payload.deviceId,
      familyId: payload.familyId,
    })
    await userRepository.markRefreshSessionRotated(payload.jti, next.jti)
    logAudit('auth_refresh_success', {
      userId: user.id,
      email: toMaskedEmail(user.email),
      familyId: payload.familyId,
      deviceId: payload.deviceId,
    })
    return {
      accessToken: next.accessToken,
      refreshToken: next.refreshToken,
    }
  }

  const logout = async (refreshToken: string): Promise<void> => {
    const payload = await verifyRefreshTokenOrThrow(refreshToken, jwtSecret, 'auth_logout_failed')

    await userRepository.revokeRefreshSessionFamily(payload.familyId, 'logout')
    logAudit('auth_logout_success', {
      userId: payload.id,
      familyId: payload.familyId,
      deviceId: payload.deviceId,
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
