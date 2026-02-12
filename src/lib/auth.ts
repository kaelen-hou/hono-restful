import { Jwt } from 'hono/utils/jwt'
import type { AuthUser } from '../types/user'
import { ApiError } from './errors'

const EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7

type AuthTokenPayload = {
  sub: string
  email: string
  role: string
  iat: number
  exp: number
}

const getJwtSecret = (secret?: string): string => {
  if (!secret) {
    throw new ApiError(500, 'CONFIG_ERROR', 'JWT_SECRET is required')
  }
  return secret
}

export const signAccessToken = async (user: AuthUser, jwtSecret?: string): Promise<string> => {
  const secret = getJwtSecret(jwtSecret)
  const now = Math.floor(Date.now() / 1000)
  const payload: AuthTokenPayload = {
    sub: String(user.id),
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + EXPIRES_IN_SECONDS,
  }

  return Jwt.sign(payload, secret, 'HS256')
}

export const verifyAccessToken = async (token: string, jwtSecret?: string): Promise<AuthUser> => {
  const secret = getJwtSecret(jwtSecret)

  let payload: AuthTokenPayload
  try {
    payload = (await Jwt.verify(token, secret, 'HS256')) as AuthTokenPayload
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'invalid token')
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
