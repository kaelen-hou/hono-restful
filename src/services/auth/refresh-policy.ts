import { verifyRefreshToken } from '@/features/auth/token'
import { ApiError } from '@/lib/errors'
import { logAudit } from '@/lib/logger'
import type { UserRepository } from '@/repositories/user-repository'
import type { RefreshSessionRow } from '@/types/user'

const isExpired = (expiresAtIso: string): boolean => new Date(expiresAtIso).getTime() <= Date.now()

export type VerifiedRefreshPayload = Awaited<ReturnType<typeof verifyRefreshToken>>

export const verifyRefreshTokenOrThrow = async (
  refreshToken: string,
  jwtSecret: string | undefined,
  failureAuditType: 'auth_refresh_failed' | 'auth_logout_failed',
): Promise<VerifiedRefreshPayload> => {
  try {
    return await verifyRefreshToken(refreshToken, jwtSecret)
  } catch {
    logAudit(failureAuditType, {
      reason: 'token_verification_failed',
    })
    throw new ApiError(401, 'UNAUTHORIZED', 'invalid refresh token')
  }
}

export const assertRefreshSessionValid = async (
  userRepository: UserRepository,
  payload: VerifiedRefreshPayload,
  incomingDeviceId: string,
): Promise<RefreshSessionRow> => {
  const session = await userRepository.findRefreshSessionByJti(payload.jti)

  if (!session || isExpired(session.expires_at)) {
    logAudit('auth_refresh_failed', {
      userId: payload.id,
      reason: 'session_invalid',
    })
    throw new ApiError(401, 'UNAUTHORIZED', 'invalid refresh token')
  }

  if (session.revoked_at) {
    if (session.replaced_by_jti) {
      await userRepository.revokeRefreshSessionFamily(session.family_id, 'reuse_detected')
      logAudit('auth_refresh_reuse_detected', {
        userId: payload.id,
        familyId: session.family_id,
        deviceId: session.device_id,
      })
    }

    logAudit('auth_refresh_failed', {
      userId: payload.id,
      reason: 'session_revoked',
    })
    throw new ApiError(401, 'UNAUTHORIZED', 'invalid refresh token')
  }

  if (
    session.user_id !== payload.id ||
    session.family_id !== payload.familyId ||
    session.device_id !== payload.deviceId ||
    payload.deviceId !== incomingDeviceId
  ) {
    await userRepository.revokeRefreshSessionFamily(session.family_id, 'security_event')
    logAudit('auth_refresh_failed', {
      userId: payload.id,
      reason: 'session_mismatch',
    })
    throw new ApiError(401, 'UNAUTHORIZED', 'invalid refresh token')
  }

  return session
}
