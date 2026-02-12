import { getObservability } from '@/observability'
import type { HttpMetricContext } from '@/observability/types'

export type MetricContext = HttpMetricContext

export const recordHttpMetric = (ctx: MetricContext): void => {
  getObservability().metrics.recordHttpRequest(ctx)
}
