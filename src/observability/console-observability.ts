import type {
  HttpMetricContext,
  LogContext,
  LogEntry,
  LogLevel,
  Observability,
  SerializableError,
  TraceSpan,
} from './types'

const toSerializableError = (err: unknown): SerializableError => {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      ...(err.stack ? { stack: err.stack } : {}),
    }
  }

  return {
    message: typeof err === 'string' ? err : JSON.stringify(err),
  }
}

export const createLogEntry = (
  level: LogLevel,
  type: string,
  context: LogContext = {},
  err?: unknown,
): LogEntry => {
  const base: LogEntry = {
    level,
    type,
    timestamp: new Date().toISOString(),
    ...context,
  }

  if (err !== undefined) {
    base.error = toSerializableError(err)
  }

  return base
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

export const createConsoleObservability = (): Observability => {
  const logger = {
    log: (level: LogLevel, type: string, context: LogContext = {}, err?: unknown): void => {
      const entry = createLogEntry(level, type, context, err)
      const line = JSON.stringify(entry)
      if (level === 'error') {
        console.error(line)
      } else {
        console.log(line)
      }
    },
  }

  const metrics = {
    recordHttpRequest: (context: HttpMetricContext): void => {
      logger.log('info', 'metric_http_request', {
        requestId: context.requestId,
        method: context.method,
        path: context.path,
        status: context.status,
        durationMs: context.durationMs,
        latencyBucket: toLatencyBucket(context.durationMs),
        ...(context.errorCode ? { errorCode: context.errorCode } : {}),
        ...(context.userId !== undefined ? { userId: context.userId } : {}),
      })
    },
  }

  const trace = {
    startSpan: (name: string, context: LogContext = {}): TraceSpan => {
      const startedAt = Date.now()
      return {
        end: (endContext: LogContext = {}) => {
          logger.log('info', 'trace_span', {
            span: name,
            durationMs: Date.now() - startedAt,
            ...context,
            ...endContext,
          })
        },
      }
    },
  }

  return { logger, metrics, trace }
}
