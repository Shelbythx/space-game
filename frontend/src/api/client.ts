import type {
  Attempt,
  AttemptSummary,
  Design,
  Evaluation,
  Health,
  Mission,
  MissionSummary,
  SimulationRequest,
  SimulationResult,
} from './types'

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5080').replace(/\/$/, '')

/** RFC 7807 problem from the backend, or a network failure (status 0). */
export class ApiError extends Error {
  readonly status: number
  readonly errors: Record<string, string[]>

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

async function request<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), init?.timeoutMs ?? 15000)
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch (cause) {
    throw new ApiError(0, cause instanceof Error ? cause.message : 'network error')
  } finally {
    window.clearTimeout(timer)
  }
  if (!response.ok) {
    let title = response.statusText
    let errors: Record<string, string[]> = {}
    try {
      const problem = (await response.json()) as { title?: string; errors?: Record<string, string[]> }
      title = problem.title ?? title
      errors = problem.errors ?? {}
    } catch {
      // Body was not a problem document.
    }
    throw new ApiError(response.status, title, errors)
  }
  return (await response.json()) as T
}

const post = <T>(path: string, body: unknown, timeoutMs?: number) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body), timeoutMs })

// Demo fallback while the backend does not exist (tasks 002–004). VITE_API_MOCK:
// "always" — never call the server; "never" — no fallback; default "auto" — use the demo
// when the server is unreachable. The UI shows a "demo calculation" badge (useDemoMode).
const MOCK_MODE = (import.meta.env.VITE_API_MOCK ?? 'auto') as 'always' | 'never' | 'auto'
let demo = MOCK_MODE === 'always'
const demoListeners = new Set<() => void>()
const setDemo = (value: boolean) => {
  if (demo === value) return
  demo = value
  demoListeners.forEach((l) => l())
}
export const demoMode = {
  get: () => demo,
  subscribe: (listener: () => void) => {
    demoListeners.add(listener)
    return () => demoListeners.delete(listener)
  },
}

async function withDemo<T>(real: () => Promise<T>, fake: () => Promise<T>): Promise<T> {
  if (MOCK_MODE === 'always') return fake()
  if (demo && MOCK_MODE === 'auto') return fake()
  try {
    const result = await real()
    setDemo(false)
    return result
  } catch (error) {
    if (MOCK_MODE === 'auto' && error instanceof ApiError && (error.status === 0 || error.status === 404)) {
      setDemo(true)
      return fake()
    }
    throw error
  }
}

export const api = {
  health: (timeoutMs?: number) => request<Health>('/api/health', { timeoutMs }),
  missions: () =>
    withDemo(
      () => request<MissionSummary[]>('/api/missions', { timeoutMs: 4000 }),
      async () => (await import('./mock/catalog')).mockMissions,
    ),
  mission: (id: string) =>
    withDemo(
      () => request<Mission>(`/api/missions/${encodeURIComponent(id)}`, { timeoutMs: 4000 }),
      async () => (await import('./mock/catalog')).mockMission,
    ),
  evaluate: (design: Design) =>
    withDemo(
      () => post<Evaluation>('/api/evaluate', design),
      async () => {
        const [{ mockEvaluate }, { mockMission }] = await Promise.all([import('./mock/evaluate'), import('./mock/catalog')])
        return mockEvaluate(design, mockMission)
      },
    ),
  // Simulation may wait for NASA DONKI on the first call (task 021), so it gets more time.
  simulate: (body: SimulationRequest) => post<SimulationResult>('/api/simulate', body, 45000),
  saveAttempt: (body: { playerId: string; design: Design; seed: number }) =>
    post<AttemptSummary>('/api/attempts', body, 45000),
  attempts: (playerId: string) =>
    request<AttemptSummary[]>(`/api/attempts?playerId=${encodeURIComponent(playerId)}`),
  attempt: (id: string) => request<Attempt>(`/api/attempts/${encodeURIComponent(id)}`),
}
