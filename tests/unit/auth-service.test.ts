import { describe, expect, it } from 'vitest'
import { ApiError } from '../../src/lib/errors'
import type { UserRepository } from '../../src/repositories/user-repository'
import { createAuthService } from '../../src/services/auth-service'
import type { RefreshSessionRow, UserRow } from '../../src/types/user'

const makeUser = (id = 1): UserRow => ({
  id,
  email: 'user@example.com',
  password_hash:
    '100000:00112233445566778899aabbccddeeff:00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
  role: 'user',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
})

const createRepo = (): UserRepository => {
  const sessions = new Map<string, RefreshSessionRow>()

  return {
    findById: async (id) => (id === 1 ? makeUser(1) : null),
    findByEmail: async (email) => (email === 'user@example.com' ? makeUser(1) : null),
    create: async () => 1,
    createRefreshSession: async (input) => {
      sessions.set(input.jti, {
        jti: input.jti,
        user_id: input.userId,
        expires_at: input.expiresAt,
        revoked_at: null,
        created_at: new Date().toISOString(),
      })
    },
    findRefreshSessionByJti: async (jti) => sessions.get(jti) ?? null,
    revokeRefreshSession: async (jti) => {
      const row = sessions.get(jti)
      if (row) {
        row.revoked_at = new Date().toISOString()
      }
    },
  }
}

describe('auth-service', () => {
  it('register should create user and return token pair', async () => {
    const repo: UserRepository = {
      ...createRepo(),
      findById: async (id) => (id === 2 ? { ...makeUser(2), email: 'new@example.com' } : null),
      findByEmail: async () => null,
      create: async () => 2,
    }

    const service = createAuthService(repo, 'unit-secret')
    const result = await service.register({ email: 'new@example.com', password: 'Password123!' })

    expect(result.user.email).toBe('new@example.com')
    expect(result.accessToken).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
  })

  it('register should throw conflict if email exists', async () => {
    const service = createAuthService(createRepo(), 'unit-secret')
    await expect(
      service.register({ email: 'user@example.com', password: 'Password123!' }),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('login should throw when user is missing', async () => {
    const service = createAuthService(createRepo(), 'unit-secret')
    await expect(
      service.login({ email: 'missing@example.com', password: 'any' }),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('login should throw when password is wrong', async () => {
    const service = createAuthService(createRepo(), 'unit-secret')
    await expect(
      service.login({ email: 'user@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('refresh should rotate token and revoke old session', async () => {
    const repo: UserRepository = {
      ...createRepo(),
      findByEmail: async () => null,
    }
    const service = createAuthService(repo, 'unit-secret')

    const registered = await service.register({
      email: 'refresh@example.com',
      password: 'Password123!',
    })
    const refreshed = await service.refresh(registered.refreshToken)

    expect(refreshed.accessToken).toBeTruthy()
    expect(refreshed.refreshToken).toBeTruthy()
    expect(refreshed.refreshToken).not.toBe(registered.refreshToken)

    await expect(service.refresh(registered.refreshToken)).rejects.toBeInstanceOf(ApiError)
  })

  it('logout should revoke refresh token', async () => {
    const repo: UserRepository = {
      ...createRepo(),
      findByEmail: async () => null,
    }
    const service = createAuthService(repo, 'unit-secret')

    const registered = await service.register({
      email: 'logout@example.com',
      password: 'Password123!',
    })
    await service.logout(registered.refreshToken)

    await expect(service.refresh(registered.refreshToken)).rejects.toBeInstanceOf(ApiError)
  })

  it('register should throw when create returns null', async () => {
    const repo: UserRepository = {
      ...createRepo(),
      findById: async () => null,
      findByEmail: async () => null,
      create: async () => null,
    }

    const service = createAuthService(repo, 'unit-secret')
    await expect(
      service.register({ email: 'new@example.com', password: 'Password123!' }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})
