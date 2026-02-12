import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app'
import { resetMemoryDbStore } from '../../src/infrastructure/persistence/memory-store'
import { resetRateLimitStore } from '../../src/lib/rate-limit'

const devEnv = {
  DB_DRIVER: 'memory' as const,
  APP_ENV: 'development' as const,
  JWT_SECRET: 'test-secret-long-enough',
}

type OpenApiOperation = {
  security?: unknown
  responses?: Record<string, unknown>
}

type OpenApiDocument = {
  paths: Record<string, Record<string, OpenApiOperation>>
}

const methodList = ['get', 'post', 'put', 'patch', 'delete'] as const

describe('openapi contract', () => {
  beforeEach(() => {
    resetMemoryDbStore()
    resetRateLimitStore()
  })

  it('should satisfy declared response status for every documented operation', async () => {
    const app = createApp()
    const email = `${crypto.randomUUID()}@example.com`
    const password = 'Password123!'
    let accessToken = ''
    let refreshToken = ''
    let todoId = 1

    const register = await app.request(
      '/api/v1/auth/register',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-device-id': 'contract-device' },
        body: JSON.stringify({ email, password }),
      },
      devEnv,
    )
    expect(register.status).toBe(201)
    const registerBody = (await register.json()) as {
      accessToken: string
      refreshToken: string
    }
    accessToken = registerBody.accessToken
    refreshToken = registerBody.refreshToken

    const createTodo = await app.request(
      '/api/v1/todos',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ title: 'contract-seed', completed: false }),
      },
      devEnv,
    )
    expect(createTodo.status).toBe(201)
    const todoBody = (await createTodo.json()) as { id: number }
    todoId = todoBody.id

    const openapiRes = await app.request('/api/v1/openapi.json', {}, devEnv)
    expect(openapiRes.status).toBe(200)
    const doc = (await openapiRes.json()) as OpenApiDocument

    for (const [rawPath, item] of Object.entries(doc.paths)) {
      const path = rawPath.replace('{id}', String(todoId))
      for (const method of methodList) {
        const operation = item[method]
        if (!operation) {
          continue
        }

        const expectedStatuses = new Set(
          Object.keys(operation.responses ?? {}).map((code) => Number.parseInt(code, 10)),
        )
        if (expectedStatuses.size === 0) {
          continue
        }

        const headers: Record<string, string> = {
          'x-device-id': 'contract-device',
        }
        let body: string | undefined

        if (operation.security) {
          headers.authorization = `Bearer ${accessToken}`
        }

        if (method === 'post' && path.endsWith('/auth/register')) {
          body = JSON.stringify({
            email: `${crypto.randomUUID()}@example.com`,
            password: 'Password123!',
          })
          headers['content-type'] = 'application/json'
        } else if (method === 'post' && path.endsWith('/auth/login')) {
          body = JSON.stringify({ email, password })
          headers['content-type'] = 'application/json'
        } else if (method === 'post' && path.endsWith('/auth/refresh')) {
          body = JSON.stringify({ refreshToken })
          headers['content-type'] = 'application/json'
        } else if (method === 'post' && path.endsWith('/auth/logout')) {
          const tempLogin = await app.request(
            '/api/v1/auth/login',
            {
              method: 'POST',
              headers: { 'content-type': 'application/json', 'x-device-id': 'contract-device' },
              body: JSON.stringify({ email, password }),
            },
            devEnv,
          )
          const tempLoginBody = (await tempLogin.json()) as { refreshToken: string }
          body = JSON.stringify({ refreshToken: tempLoginBody.refreshToken })
          headers['content-type'] = 'application/json'
        } else if (method === 'post' && path.endsWith('/todos')) {
          body = JSON.stringify({ title: 'contract-create', completed: false })
          headers['content-type'] = 'application/json'
        } else if (method === 'put' && path.includes('/todos/')) {
          body = JSON.stringify({ title: 'contract-put', completed: true })
          headers['content-type'] = 'application/json'
        } else if (method === 'patch' && path.includes('/todos/')) {
          body = JSON.stringify({ completed: true })
          headers['content-type'] = 'application/json'
        }

        const response = await app.request(
          path,
          {
            method: method.toUpperCase(),
            headers,
            ...(body ? { body } : {}),
          },
          devEnv,
        )

        expect(
          expectedStatuses.has(response.status),
          `${method.toUpperCase()} ${rawPath} returned ${response.status}, expected one of ${Array.from(expectedStatuses).join(',')}`,
        ).toBe(true)

        if (method === 'post' && path.endsWith('/auth/login') && response.status === 200) {
          const loginBody = (await response.clone().json()) as {
            accessToken: string
            refreshToken: string
          }
          accessToken = loginBody.accessToken
          refreshToken = loginBody.refreshToken
        }

        if (method === 'post' && path.endsWith('/auth/refresh') && response.status === 200) {
          const refreshed = (await response.clone().json()) as {
            accessToken: string
            refreshToken: string
          }
          accessToken = refreshed.accessToken
          refreshToken = refreshed.refreshToken
        }

        if (method === 'post' && path.endsWith('/todos') && response.status === 201) {
          const created = (await response.clone().json()) as { id: number }
          todoId = created.id
        }
      }
    }
  })
})
