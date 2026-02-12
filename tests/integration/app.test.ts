import { describe, expect, it } from 'vitest'
import { createApp } from '../../src/app'

const devEnv = {
  DB_DRIVER: 'memory' as const,
  APP_ENV: 'development' as const,
}

describe('app integration', () => {
  it('should return request id header', async () => {
    const app = createApp()
    const res = await app.request('/health', {}, devEnv)

    expect(res.status).toBe(200)
    expect(res.headers.get('x-request-id')).toBeTruthy()
  })

  it('should return unified error payload for bad request', async () => {
    const app = createApp()
    const res = await app.request(
      '/todos/1',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
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

    await app.request(
      '/todos',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'task-1' }),
      },
      devEnv,
    )

    const res = await app.request('/todos?limit=1&offset=0', {}, devEnv)
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

  it('ready should fail when memory driver used in production', async () => {
    const app = createApp()
    const res = await app.request('/ready', {}, { DB_DRIVER: 'memory', APP_ENV: 'production' })

    expect(res.status).toBe(500)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('CONFIG_ERROR')
  })
})
