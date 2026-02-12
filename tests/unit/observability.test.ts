import { afterEach, describe, expect, it, vi } from 'vitest'
import { createConsoleObservability } from '../../src/observability/console-observability'

describe('console observability', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should record trace span with duration', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const obs = createConsoleObservability()

    const span = obs.trace.startSpan('http.request', { requestId: 'r1' })
    span.end({ status: 200 })

    expect(logSpy).toHaveBeenCalled()
    const line = String(logSpy.mock.calls.at(-1)?.[0] ?? '')
    expect(line).toContain('"type":"trace_span"')
    expect(line).toContain('"span":"http.request"')
    expect(line).toContain('"requestId":"r1"')
  })

  it('should record metric with latency bucket', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const obs = createConsoleObservability()

    obs.metrics.recordHttpRequest({
      requestId: 'r2',
      method: 'POST',
      path: '/api/v1/auth/login',
      status: 401,
      durationMs: 10,
      errorCode: 'UNAUTHORIZED',
    })

    const line = String(logSpy.mock.calls.at(-1)?.[0] ?? '')
    expect(line).toContain('"type":"metric_http_request"')
    expect(line).toContain('"latencyBucket":"lt_50ms"')
    expect(line).toContain('"errorCode":"UNAUTHORIZED"')
  })
})
