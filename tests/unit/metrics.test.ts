import { afterEach, describe, expect, it, vi } from 'vitest'
import * as logger from '../../src/lib/logger'
import { recordHttpMetric } from '../../src/lib/metrics'

describe('metrics', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should record http metric with latency bucket and context', () => {
    const spy = vi.spyOn(logger, 'logInfo').mockImplementation(() => {})

    recordHttpMetric({
      requestId: 'r1',
      method: 'GET',
      path: '/todos',
      status: 200,
      durationMs: 120,
      userId: 10,
    })

    expect(spy).toHaveBeenCalledTimes(1)
    const [, payload] = spy.mock.calls[0] ?? []
    expect(payload).toMatchObject({
      requestId: 'r1',
      method: 'GET',
      path: '/todos',
      status: 200,
      durationMs: 120,
      latencyBucket: '100_300ms',
      userId: 10,
    })
  })

  it('should include error code when provided', () => {
    const spy = vi.spyOn(logger, 'logInfo').mockImplementation(() => {})

    recordHttpMetric({
      requestId: 'r2',
      method: 'POST',
      path: '/auth/login',
      status: 401,
      durationMs: 10,
      errorCode: 'UNAUTHORIZED',
    })

    const [, payload] = spy.mock.calls[0] ?? []
    expect(payload).toMatchObject({
      errorCode: 'UNAUTHORIZED',
      latencyBucket: 'lt_50ms',
    })
  })
})
