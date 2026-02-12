import { Hono } from 'hono'
import { ApiError } from './lib/errors'
import { systemRoutes } from './routes/system-routes'
import { todoRoutes } from './routes/todo-routes'
import type { AppEnv } from './types/env'

export const createApp = () => {
  const app = new Hono<AppEnv>()

  app.route('/', systemRoutes)
  app.route('/', todoRoutes)

  app.notFound((c) => c.json({ error: 'not found' }, 404))

  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json({ error: err.message }, err.status)
    }

    console.error(err)
    return c.json({ error: 'internal server error' }, 500)
  })

  return app
}
