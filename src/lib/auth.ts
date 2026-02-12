import { Jwt } from 'hono/utils/jwt'
import type { AuthTokens, AuthUser } from '../types/user'
import { ApiError } from './errors'

const ACCESS_EXPIRES_IN_SECONDS = 60 * 15
const REFRESH_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30

type BaseTokenPayload = {
  sub: string
  email: string
  role: string
  iat: number
  exp: number
}

type AccessTokenPayload = BaseTokenPayload & {
  type: 'access'
}

type RefreshTokenPayload = BaseTokenPayload & {
  type: 'refresh'
  jti: string
}

const getJwtSecret = (secret?: string): string => {
  if (!secret) {
    throw new ApiError(500, 'CONFIG_ERROR', 'JWT_SECRET is required')
  }
  return secret
}

const toUnixSeconds = (date: Date): number => Math.floor(date.getTime() / 1000)

export const createTokenPair = async (
  user: AuthUser,
  jwtSecret?: string,
): Promise<AuthTokens & { jti: string; refreshExpiresAt: string }> => {
  const secret = getJwtSecret(jwtSecret)
  const now = new Date()
  const nowSec = toUnixSeconds(now)

  const accessPayload: AccessTokenPayload = {
    type: 'access',
    sub: String(user.id),
    email: user.email,
    role: user.role,
    iat: nowSec,
    exp: nowSec + ACCESS_EXPIRES_IN_SECONDS,
  }

  const refreshJti = crypto.randomUUID()
  const refreshExpiresAtDate = new Date(now.getTime() + REFRESH_EXPIRES_IN_SECONDS * 1000)
  const refreshPayload: RefreshTokenPayload = {
    type: 'refresh',
    sub: String(user.id),
    email: user.email,
    role: user.role,
    iat: nowSec,
    exp: toUnixSeconds(refreshExpiresAtDate),
    jti: refreshJti,
  }

  const accessToken = await Jwt.sign(accessPayload, secret, 'HS256')
  const refreshToken = await Jwt.sign(refreshPayload, secret, 'HS256')

  return {
    accessToken,
    refreshToken,
    jti: refreshJti,
    refreshExpiresAt: refreshExpiresAtDate.toISOString(),
  }
}

export const verifyAccessToken = async (token: string, jwtSecret?: string): Promise<AuthUser> => {
  const secret = getJwtSecret(jwtSecret)

  let payload: AccessTokenPayload | RefreshTokenPayload
  try {
    payload = (await Jwt.verify(token, secret, 'HS256')) as AccessTokenPayload | RefreshTokenPayload
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'invalid token')
  }

  if (payload.type !== 'access') {
    throw new ApiError(401, 'UNAUTHORIZED', 'invalid token type')
  }

  const id = Number(payload.sub)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(401, 'UNAUTHORIZED', 'invalid token subject')
  }

  if (payload.role !== 'admin' && payload.role !== 'user') {
    throw new ApiError(401, 'UNAUTHORIZED', 'invalid token role')
  }

  return {
    id,
    email: payload.email,
    role: payload.role,
  }
}

export const verifyRefreshToken = async (
  token: string,
  jwtSecret?: string,
): Promise<AuthUser & { jti: string; exp: number }> => {
  const secret = getJwtSecret(jwtSecret)

  let payload: AccessTokenPayload | RefreshTokenPayload
  try {
    payload = (await Jwt.verify(token, secret, 'HS256')) as AccessTokenPayload | RefreshTokenPayload
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'invalid refresh token')
  }

  if (payload.type !== 'refresh') {
    throw new ApiError(401, 'UNAUTHORIZED', 'invalid token type')
  }

  const id = Number(payload.sub)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(401, 'UNAUTHORIZED', 'invalid token subject')
  }

  if (payload.role !== 'admin' && payload.role !== 'user') {
    throw new ApiError(401, 'UNAUTHORIZED', 'invalid token role')
  }

  return {
    id,
    email: payload.email,
    role: payload.role,
    jti: payload.jti,
    exp: payload.exp,
  }
}

export const extractBearerToken = (authorizationHeader?: string): string => {
  if (!authorizationHeader) {
    throw new ApiError(401, 'UNAUTHORIZED', 'missing authorization header')
  }

  const [scheme, token] = authorizationHeader.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new ApiError(401, 'UNAUTHORIZED', 'invalid authorization header')
  }

  return token
}
