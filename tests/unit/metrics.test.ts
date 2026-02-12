import { afterEach, describe, expect, it, vi } from 'vitest'
import { recordHttpMetric } from '../../src/lib/metrics'
import { resetObservability, setObservability } from '../../src/observability'

describe('metrics', () => {
  afterEach(() => {
    resetObservability()
  })

  it('should forward http metric context to observability reporter', () => {
    const recordHttpRequest = vi.fn()
    setObservability({
      logger: { log: vi.fn() },
      metrics: { recordHttpRequest },
      trace: { startSpan: vi.fn(() => ({ end: vi.fn() })) },
    })

    recordHttpMetric({
      requestId: 'r1',
      method: 'GET',
      path: '/todos',
      status: 200,
      durationMs: 120,
      userId: 10,
    })

    expect(recordHttpRequest).toHaveBeenCalledTimes(1)
    expect(recordHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'r1',
        method: 'GET',
        path: '/todos',
        status: 200,
        durationMs: 120,
        userId: 10,
      }),
    )
  })
})
