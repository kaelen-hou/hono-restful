import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app'
import { resetMemoryDbStore } from '../../src/repositories/memory-store'

const devEnv = {
  DB_DRIVER: 'memory' as const,
  APP_ENV: 'development' as const,
  JWT_SECRET: 'test-secret',
}

type AuthPayload = {
  accessToken: string
  refreshToken: string
}

const registerAndGetTokens = async (app: ReturnType<typeof createApp>): Promise<AuthPayload> => {
  const email = `${crypto.randomUUID()}@example.com`
  const registerRes = await app.request(
    '/auth/register',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123!' }),
    },
    devEnv,
  )

  expect(registerRes.status).toBe(201)
  const registerBody = (await registerRes.json()) as AuthPayload
  return registerBody
}

describe('app integration', () => {
  beforeEach(() => {
    resetMemoryDbStore()
  })

  it('should return request id header', async () => {
    const app = createApp()
    const res = await app.request('/health', {}, devEnv)

    expect(res.status).toBe(200)
    expect(res.headers.get('x-request-id')).toBeTruthy()
  })

  it('should reject protected route without token', async () => {
    const app = createApp()
    const res = await app.request('/todos', {}, devEnv)

    expect(res.status).toBe(401)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('UNAUTHORIZED')
  })

  it('should return unified error payload for bad request', async () => {
    const app = createApp()
    const { accessToken } = await registerAndGetTokens(app)

    const res = await app.request(
      '/todos/1',
      {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ title: 'missing completed' }),
      },
      devEnv,
    )

    expect(res.status).toBe(400)
    const body = (await res.json()) as { code: string; message: string; requestId: string }
    expect(body.code).toBe('BAD_REQUEST')
    expect(typeof body.message).toBe('string')
    expect(body.requestId).toBeTruthy()
  })

  it('should support paginated todos response', async () => {
    const app = createApp()
    const { accessToken } = await registerAndGetTokens(app)

    await app.request(
      '/todos',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ title: 'task-1' }),
      },
      devEnv,
    )

    const res = await app.request(
      '/todos?limit=1&offset=0',
      {
        headers: { authorization: `Bearer ${accessToken}` },
      },
      devEnv,
    )
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      items: Array<{ id: number; title: string }>
      page: { limit: number; offset: number; total: number }
    }

    expect(body.page.limit).toBe(1)
    expect(body.page.offset).toBe(0)
    expect(body.page.total).toBeGreaterThanOrEqual(1)
    expect(body.items.length).toBe(1)
  })

  it('should rotate refresh token', async () => {
    const app = createApp()
    const { refreshToken } = await registerAndGetTokens(app)

    const refreshRes = await app.request(
      '/auth/refresh',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      },
      devEnv,
    )

    expect(refreshRes.status).toBe(200)
    const refreshed = (await refreshRes.json()) as AuthPayload
    expect(refreshed.accessToken).toBeTruthy()
    expect(refreshed.refreshToken).toBeTruthy()
    expect(refreshed.refreshToken).not.toBe(refreshToken)

    const oldRefreshRes = await app.request(
      '/auth/refresh',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      },
      devEnv,
    )

    expect(oldRefreshRes.status).toBe(401)
  })

  it('ready should fail when memory driver used in production', async () => {
    const app = createApp()
    const res = await app.request(
      '/ready',
      {},
      { DB_DRIVER: 'memory', APP_ENV: 'production', JWT_SECRET: 'test-secret' },
    )

    expect(res.status).toBe(500)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('CONFIG_ERROR')
  })
})
