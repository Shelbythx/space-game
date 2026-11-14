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

const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) })

export const api = {
  health: (timeoutMs?: number) => request<Health>('/api/health', { timeoutMs }),
  missions: () => request<MissionSummary[]>('/api/missions'),
  mission: (id: string) => request<Mission>(`/api/missions/${encodeURIComponent(id)}`),
  evaluate: (design: Design) => post<Evaluation>('/api/evaluate', design),
  simulate: (body: SimulationRequest) => post<SimulationResult>('/api/simulate', body),
  saveAttempt: (body: { playerId: string; design: Design; seed: number }) =>
    post<AttemptSummary>('/api/attempts', body),
  attempts: (playerId: string) =>
    request<AttemptSummary[]>(`/api/attempts?playerId=${encodeURIComponent(playerId)}`),
  attempt: (id: string) => request<Attempt>(`/api/attempts/${encodeURIComponent(id)}`),
}
