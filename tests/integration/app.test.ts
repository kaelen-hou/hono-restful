import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app'
import { resetMemoryDbStore } from '../../src/infrastructure/persistence/memory-store'
import { resetRateLimitStore } from '../../src/lib/rate-limit'

const devEnv = {
  DB_DRIVER: 'memory' as const,
  APP_ENV: 'development' as const,
  JWT_SECRET: 'test-secret',
}

type AuthPayload = {
  accessToken: string
  refreshToken: string
}

const registerUser = async (
  app: ReturnType<typeof createApp>,
  email: string,
  password = 'Password123!',
) => {
  return app.request(
    '/auth/register',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
    devEnv,
  )
}

const registerAndGetTokens = async (app: ReturnType<typeof createApp>): Promise<AuthPayload> => {
  const email = `${crypto.randomUUID()}@example.com`
  const registerRes = await registerUser(app, email)

  expect(registerRes.status).toBe(201)
  const registerBody = (await registerRes.json()) as AuthPayload
  return registerBody
}

describe('app integration', () => {
  beforeEach(() => {
    resetMemoryDbStore()
    resetRateLimitStore()
  })

  it('should return request id header', async () => {
    const app = createApp()
    const res = await app.request('/health', {}, devEnv)

    expect(res.status).toBe(200)
    expect(res.headers.get('x-request-id')).toBeTruthy()
  })

  it('should return service info on root route', async () => {
    const app = createApp()
    const res = await app.request('/', {}, devEnv)

    expect(res.status).toBe(200)
    const body = (await res.json()) as { service: string; status: string }
    expect(body.service).toBe('todo-api')
    expect(body.status).toBe('ok')
  })

  it('should expose openapi json', async () => {
    const app = createApp()
    const res = await app.request('/openapi.json', {}, devEnv)

    expect(res.status).toBe(200)
    const body = (await res.json()) as { openapi: string; paths: Record<string, unknown> }
    expect(body.openapi).toBe('3.1.0')
    expect(body.paths['/auth/register']).toBeTruthy()
    expect(body.paths['/todos']).toBeTruthy()
  })

  it('should serve api docs page', async () => {
    const app = createApp()
    const res = await app.request('/docs', {}, devEnv)

    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html.includes('redoc')).toBe(true)
    expect(html.includes('/openapi.json')).toBe(true)
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

  it('should support list todos with explicit userId query', async () => {
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
        body: JSON.stringify({ title: 'task-explicit-user' }),
      },
      devEnv,
    )

    const meRes = await app.request(
      '/auth/me',
      { headers: { authorization: `Bearer ${accessToken}` } },
      devEnv,
    )
    expect(meRes.status).toBe(200)
    const meBody = (await meRes.json()) as { user: { id: number } }

    const res = await app.request(
      `/todos?limit=10&offset=0&userId=${meBody.user.id}`,
      { headers: { authorization: `Bearer ${accessToken}` } },
      devEnv,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: Array<{ title: string }> }
    expect(body.items.some((item) => item.title === 'task-explicit-user')).toBe(true)
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

  it('ready should pass in development memory mode', async () => {
    const app = createApp()
    const res = await app.request('/ready', {}, devEnv)

    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; driver: string }
    expect(body.status).toBe('ready')
    expect(body.driver).toBe('memory')
  })

  it('should return 404 for unknown route', async () => {
    const app = createApp()
    const { accessToken } = await registerAndGetTokens(app)
    const res = await app.request(
      '/missing-route',
      { headers: { authorization: `Bearer ${accessToken}` } },
      devEnv,
    )

    expect(res.status).toBe(404)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('NOT_FOUND')
  })

  it('should support auth login me and logout flow', async () => {
    const app = createApp()
    const email = `${crypto.randomUUID()}@example.com`
    await registerUser(app, email)

    const loginRes = await app.request(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password123!' }),
      },
      devEnv,
    )
    expect(loginRes.status).toBe(200)
    const loginBody = (await loginRes.json()) as AuthPayload

    const meRes = await app.request(
      '/auth/me',
      { headers: { authorization: `Bearer ${loginBody.accessToken}` } },
      devEnv,
    )
    expect(meRes.status).toBe(200)
    const meBody = (await meRes.json()) as { user: { email: string } }
    expect(meBody.user.email).toBe(email)

    const logoutRes = await app.request(
      '/auth/logout',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: loginBody.refreshToken }),
      },
      devEnv,
    )
    expect(logoutRes.status).toBe(204)

    const refreshAfterLogout = await app.request(
      '/auth/refresh',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: loginBody.refreshToken }),
      },
      devEnv,
    )
    expect(refreshAfterLogout.status).toBe(401)
  })

  it('should reject login with invalid credentials', async () => {
    const app = createApp()
    const email = `${crypto.randomUUID()}@example.com`
    await registerUser(app, email)

    const loginRes = await app.request(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'wrong-password' }),
      },
      devEnv,
    )

    expect(loginRes.status).toBe(401)
    const body = (await loginRes.json()) as { code: string }
    expect(body.code).toBe('UNAUTHORIZED')
  })

  it('should return 429 when login attempts exceed rate limit', async () => {
    const app = createApp()
    const email = `${crypto.randomUUID()}@example.com`
    await registerUser(app, email)

    const headers = {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.10',
    }

    for (let i = 0; i < 5; i += 1) {
      const res = await app.request(
        '/auth/login',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ email, password: 'wrong-password' }),
        },
        devEnv,
      )
      expect(res.status).toBe(401)
    }

    const limited = await app.request(
      '/auth/login',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, password: 'wrong-password' }),
      },
      devEnv,
    )
    expect(limited.status).toBe(429)

    const body = (await limited.json()) as { code: string; message: string }
    expect(body.code).toBe('TOO_MANY_REQUESTS')
    expect(body.message).toBe('rate limit exceeded')
  })

  it('should support todo crud flow', async () => {
    const app = createApp()
    const { accessToken } = await registerAndGetTokens(app)
    const headers = {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    }

    const createRes = await app.request(
      '/todos',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: 'first task' }),
      },
      devEnv,
    )
    expect(createRes.status).toBe(201)
    const created = (await createRes.json()) as { id: number; completed: boolean }
    expect(created.completed).toBe(false)

    const getRes = await app.request(`/todos/${created.id}`, { headers }, devEnv)
    expect(getRes.status).toBe(200)

    const patchRes = await app.request(
      `/todos/${created.id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ title: 'patched title', completed: true }),
      },
      devEnv,
    )
    expect(patchRes.status).toBe(200)
    const patched = (await patchRes.json()) as { title: string; completed: boolean }
    expect(patched.title).toBe('patched title')
    expect(patched.completed).toBe(true)

    const putRes = await app.request(
      `/todos/${created.id}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ title: 'renamed task', completed: false }),
      },
      devEnv,
    )
    expect(putRes.status).toBe(200)
    const replaced = (await putRes.json()) as { title: string; completed: boolean }
    expect(replaced.title).toBe('renamed task')
    expect(replaced.completed).toBe(false)

    const deleteRes = await app.request(
      `/todos/${created.id}`,
      { method: 'DELETE', headers },
      devEnv,
    )
    expect(deleteRes.status).toBe(204)

    const getDeletedRes = await app.request(`/todos/${created.id}`, { headers }, devEnv)
    expect(getDeletedRes.status).toBe(404)
  })
})
