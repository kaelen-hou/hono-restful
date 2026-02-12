import { getObservability } from '@/observability'
import { createLogEntry } from '@/observability/console-observability'
import type { LogContext, LogEntry } from '@/observability/types'

export type { LogEntry }

export { createLogEntry }

export const logInfo = (type: string, context: LogContext = {}): void => {
  getObservability().logger.log('info', type, context)
}

export const logAudit = (type: string, context: LogContext = {}): void => {
  getObservability().logger.log('audit', type, context)
}

export const logError = (type: string, context: LogContext = {}, err?: unknown): void => {
  getObservability().logger.log('error', type, context, err)
}
