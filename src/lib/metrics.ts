import { logInfo } from './logger'

type MetricContext = {
  requestId: string
  method: string
  path: string
  status: number
  durationMs: number
  errorCode?: string
  userId?: number
}

const toLatencyBucket = (durationMs: number): string => {
  if (durationMs < 50) {
    return 'lt_50ms'
  }
  if (durationMs < 100) {
    return '50_100ms'
  }
  if (durationMs < 300) {
    return '100_300ms'
  }
  if (durationMs < 1000) {
    return '300ms_1s'
  }
  return 'gte_1s'
}

export const recordHttpMetric = (ctx: MetricContext): void => {
  logInfo('metric_http_request', {
    requestId: ctx.requestId,
    method: ctx.method,
    path: ctx.path,
    status: ctx.status,
    durationMs: ctx.durationMs,
    latencyBucket: toLatencyBucket(ctx.durationMs),
    errorCode: ctx.errorCode,
    userId: ctx.userId,
  })
}
