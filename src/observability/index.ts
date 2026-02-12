import { createConsoleObservability } from './console-observability'
import type { Observability } from './types'

let current: Observability = createConsoleObservability()

export const getObservability = (): Observability => current

export const setObservability = (next: Observability): void => {
  current = next
}

export const resetObservability = (): void => {
  current = createConsoleObservability()
}
