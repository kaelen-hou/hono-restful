import { Hono } from 'hono'
import { createTodoRepositoryFromEnv } from '../repositories/todo-repository-factory'
import { createTodoService } from '../services/todo-service'
import type { AppEnv } from '../types/env'

export const systemRoutes = new Hono<AppEnv>()

systemRoutes.get('/', (c) => c.json({ service: 'todo-api', status: 'ok' }))

systemRoutes.get('/health', (c) =>
  c.json({ status: 'ok', timestamp: new Date().toISOString() }),
)

systemRoutes.get('/ready', async (c) => {
  const repository = createTodoRepositoryFromEnv(c.env)
  const service = createTodoService(repository)
  await service.checkReady()

  return c.json({
    status: 'ready',
    driver: c.env.DB_DRIVER ?? 'd1',
    timestamp: new Date().toISOString(),
  })
})
