import { Hono } from 'hono'
import { ApiError } from './lib/errors'
import { logError, logInfo } from './lib/logger'
import { createDocsHtml, createOpenApiDocument } from './openapi'
import { authRoutes } from './routes/auth-routes'
import { systemRoutes } from './routes/system-routes'
import { todoRoutes } from './routes/todo-routes'
import type { AppEnv } from './types/env'

export const createApp = () => {
  const app = new Hono<AppEnv>()

  app.use('*', async (c, next) => {
    const start = Date.now()
    const requestId = c.req.header('x-request-id') ?? crypto.randomUUID()
    const path = new URL(c.req.url).pathname
    c.set('requestId', requestId)

    await next()

    const durationMs = Date.now() - start
    c.header('x-request-id', requestId)

    logInfo('request', {
      requestId,
      method: c.req.method,
      path,
      status: c.res.status,
      durationMs,
    })
  })

  app.get('/openapi.json', (c) => c.json(createOpenApiDocument(c.req.url)))
  app.get('/docs', (c) => c.html(createDocsHtml('/openapi.json')))
  app.route('/', systemRoutes)
  app.route('/', authRoutes)
  app.route('/', todoRoutes)

  app.notFound((c) =>
    c.json(
      {
        code: 'NOT_FOUND',
        message: 'route not found',
        requestId: c.get('requestId'),
      },
      404,
    ),
  )

  app.onError((err, c) => {
    const requestId = c.get('requestId')

    if (err instanceof ApiError) {
      logError(
        'api_error',
        {
          requestId,
          code: err.code,
          status: err.status,
          message: err.message,
        },
        err,
      )

      return c.json(
        {
          code: err.code,
          message: err.message,
          requestId,
        },
        err.status,
      )
    }

    logError(
      'unhandled_error',
      {
        requestId,
      },
      err,
    )

    return c.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'internal server error',
        requestId,
      },
      500,
    )
  })

  return app
}
