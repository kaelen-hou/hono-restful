import { Hono } from 'hono'
import { createRequestServices } from './app/services'
import { API_PREFIX } from './constants/api'
import { ApiError } from './lib/errors'
import { logError, logInfo } from './lib/logger'
import { recordHttpMetric } from './lib/metrics'
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
    let errorCode: string | undefined
    if (c.res.status >= 400) {
      try {
        const payload = (await c.res.clone().json()) as { code?: string }
        errorCode = payload.code
      } catch {
        errorCode = undefined
      }
    }

    logInfo('request', {
      requestId,
      method: c.req.method,
      path,
      status: c.res.status,
      durationMs,
    })

    const metricContext = {
      requestId,
      method: c.req.method,
      path,
      status: c.res.status,
      durationMs,
      ...(errorCode ? { errorCode } : {}),
      ...(c.var.currentUser ? { userId: c.var.currentUser.id } : {}),
    }

    recordHttpMetric(metricContext)
  })

  app.use('*', async (c, next) => {
    const services = createRequestServices(c.env)
    c.set('authService', services.authService)
    c.set('todoService', services.todoService)
    await next()
  })

  app.get(`${API_PREFIX}/openapi.json`, (c) => c.json(createOpenApiDocument(c.req.url)))
  app.get(`${API_PREFIX}/docs`, (c) => c.html(createDocsHtml(`${API_PREFIX}/openapi.json`)))
  app.route(API_PREFIX, systemRoutes)
  app.route(API_PREFIX, authRoutes)
  app.route(API_PREFIX, todoRoutes)

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
      logError('api_error', {
        requestId,
        code: err.code,
        status: err.status,
        message: err.message,
      })

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
