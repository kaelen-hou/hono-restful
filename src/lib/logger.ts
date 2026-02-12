type LogLevel = 'info' | 'error' | 'audit'

type LogContext = Record<string, unknown>

type SerializableError = {
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

const toSerializableError = (err: unknown): SerializableError => {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
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

export const logInfo = (type: string, context: LogContext = {}): void => {
  console.log(JSON.stringify(createLogEntry('info', type, context)))
}

export const logAudit = (type: string, context: LogContext = {}): void => {
  console.log(JSON.stringify(createLogEntry('audit', type, context)))
}

export const logError = (type: string, context: LogContext = {}, err?: unknown): void => {
  console.error(JSON.stringify(createLogEntry('error', type, context, err)))
}
