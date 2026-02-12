export type LogLevel = 'info' | 'error' | 'audit'

export type LogContext = Record<string, unknown>

export type SerializableError = {
  name?: string
  message: string
  stack?: string
}

export type LogEntry = {
  level: LogLevel
  type: string
  timestamp: string
  error?: SerializableError
} & LogContext

export type HttpMetricContext = {
  requestId: string
  method: string
  path: string
  status: number
  durationMs: number
  errorCode?: string
  userId?: number
}

export type TraceSpan = {
  end(context?: LogContext): void
}

export type LoggerReporter = {
  log(level: LogLevel, type: string, context?: LogContext, err?: unknown): void
}

export type MetricsReporter = {
  recordHttpRequest(context: HttpMetricContext): void
}

export type TraceReporter = {
  startSpan(name: string, context?: LogContext): TraceSpan
}

export type Observability = {
  logger: LoggerReporter
  metrics: MetricsReporter
  trace: TraceReporter
}
