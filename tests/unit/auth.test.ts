import { describe, expect, it } from 'vitest'
import {
  createTokenPair,
  extractBearerToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../src/features/auth/token'
import { ApiError } from '../../src/lib/errors'

describe('auth utils', () => {
  it('should sign and verify access and refresh tokens', async () => {
    const tokens = await createTokenPair(
      {
        id: 1,
        email: 'user@example.com',
        role: 'user',
      },
      'unit-secret',
      {
        deviceId: 'test-device',
      },
    )

    const accessPayload = await verifyAccessToken(tokens.accessToken, 'unit-secret')
    const refreshPayload = await verifyRefreshToken(tokens.refreshToken, 'unit-secret')

    expect(accessPayload).toMatchObject({ id: 1, email: 'user@example.com', role: 'user' })
    expect(refreshPayload).toMatchObject({ id: 1, email: 'user@example.com', role: 'user' })
    expect(refreshPayload.jti).toBe(tokens.jti)
    expect(refreshPayload.familyId).toBe(tokens.familyId)
    expect(refreshPayload.deviceId).toBe('test-device')
  })

  it('should throw when jwt secret is missing', async () => {
    await expect(
      createTokenPair({ id: 1, email: 'user@example.com', role: 'user' }),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('should throw on invalid token', async () => {
    await expect(verifyAccessToken('invalid-token', 'unit-secret')).rejects.toBeInstanceOf(ApiError)
    await expect(verifyRefreshToken('invalid-token', 'unit-secret')).rejects.toBeInstanceOf(
      ApiError,
    )
  })

  it('should reject wrong token type', async () => {
    const tokens = await createTokenPair(
      {
        id: 1,
        email: 'user@example.com',
        role: 'user',
      },
      'unit-secret',
    )

    await expect(verifyAccessToken(tokens.refreshToken, 'unit-secret')).rejects.toBeInstanceOf(
      ApiError,
    )
    await expect(verifyRefreshToken(tokens.accessToken, 'unit-secret')).rejects.toBeInstanceOf(
      ApiError,
    )
  })

  it('should parse bearer token', () => {
    expect(extractBearerToken('Bearer abc.def')).toBe('abc.def')
  })

  it('should reject malformed auth header', () => {
    expect(() => extractBearerToken('Basic abc')).toThrow(ApiError)
    expect(() => extractBearerToken()).toThrow(ApiError)
  })
})
