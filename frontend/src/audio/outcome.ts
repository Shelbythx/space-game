// How the last mission ended, as far as the music cares: the report plays the failure
// track after a failed mission. The report stage calls setReportOutcome (optional).

let reportOutcome: 'success' | 'failure' | null = null
const listeners = new Set<() => void>()

export function setReportOutcome(outcome: 'success' | 'failure' | null): void {
  reportOutcome = outcome
  listeners.forEach((listener) => listener())
}

export function getReportOutcome(): 'success' | 'failure' | null {
  return reportOutcome
}

export function onReportOutcome(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
