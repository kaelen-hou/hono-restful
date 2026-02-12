import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLogEntry, logAudit, logError, logInfo } from '../../src/lib/logger'

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create log entry with context', () => {
    const entry = createLogEntry('info', 'request', { requestId: 'r1', status: 200 })

    expect(entry.level).toBe('info')
    expect(entry.type).toBe('request')
    expect(entry.requestId).toBe('r1')
    expect(entry.status).toBe(200)
    expect(typeof entry.timestamp).toBe('string')
  })

  it('should attach serialized error', () => {
    const err = new Error('boom')
    const entry = createLogEntry('error', 'unhandled_error', { requestId: 'r2' }, err)

    expect(entry.error?.message).toBe('boom')
    expect(entry.error?.name).toBe('Error')
    expect(typeof entry.error?.stack).toBe('string')
  })

  it('should log info and audit via console.log', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    logInfo('request', { requestId: 'a' })
    logAudit('auth_login', { requestId: 'b' })

    expect(logSpy).toHaveBeenCalledTimes(2)
    expect(logSpy.mock.calls[0]?.[0]).toContain('"level":"info"')
    expect(logSpy.mock.calls[1]?.[0]).toContain('"level":"audit"')
  })

  it('should log error via console.error', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logError('api_error', { requestId: 'e1' }, new Error('failed'))

    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy.mock.calls[0]?.[0]).toContain('"level":"error"')
    expect(errorSpy.mock.calls[0]?.[0]).toContain('"type":"api_error"')
  })
})
