import type {
  Attempt,
  AttemptSummary,
  Design,
  Evaluation,
  Health,
  Mission,
  MissionSummary,
  Role,
  SimulationRequest,
  SimulationResult,
} from './types'
import type { RoomState } from '../coop/types'

const RAW_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5080').trim().replace(/\/+$/, '')
// A host without a scheme (as in the repository variable) means HTTPS.
const BASE_URL = /^https?:\/\//.test(RAW_URL) ? RAW_URL : `https://${RAW_URL}`

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
  // 204 — nothing changed (co-op polling, docs/api.md 2.2).
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

const post = <T>(path: string, body: unknown, timeoutMs?: number) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body), timeoutMs })
const put = <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
const room = (code: string) => `/api/rooms/${encodeURIComponent(code)}`

// Offline demo when the mission server cannot be reached (the backend exists since tasks
// 002–006; keeping the demo is an open question in docs/decisions.md). VITE_API_MOCK:
// "always" — never call the server; "never" — no fallback; default "auto" — use the demo
// when the server is unreachable. The UI shows a "demo calculation" badge.
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

// In "auto" the demo is not for the whole session: a server that was asleep (a cold start
// on hosting) or briefly unreachable is asked again after this pause.
const RETRY_SERVER_MS = 20000
let demoSince = 0

async function withDemo<T>(real: () => Promise<T>, fake: () => Promise<T>): Promise<T> {
  if (MOCK_MODE === 'always') return fake()
  if (demo && MOCK_MODE === 'auto' && Date.now() - demoSince < RETRY_SERVER_MS) return fake()
  try {
    const result = await real()
    setDemo(false)
    return result
  } catch (error) {
    if (MOCK_MODE === 'auto' && error instanceof ApiError && (error.status === 0 || error.status === 404)) {
      demoSince = Date.now()
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
      async () => (await import('./mock/catalog')).mockMissionById(id),
    ),
  evaluate: (design: Design) =>
    withDemo(
      () => post<Evaluation>('/api/evaluate', design),
      async () => {
        const [{ mockEvaluate }, { mockMissionById }] = await Promise.all([import('./mock/evaluate'), import('./mock/catalog')])
        return mockEvaluate(design, mockMissionById(design.missionId))
      },
    ),
  // Simulation may wait for NASA DONKI on the first call (task 021), so it gets more time.
  simulate: (body: SimulationRequest) => post<SimulationResult>('/api/simulate', body, 45000),
  saveAttempt: (body: { playerId: string; design: Design; seed: number }) =>
    post<AttemptSummary>('/api/attempts', body, 45000),
  attempts: (playerId: string) =>
    request<AttemptSummary[]>(`/api/attempts?playerId=${encodeURIComponent(playerId)}`),
  attempt: (id: string) => request<Attempt>(`/api/attempts/${encodeURIComponent(id)}`),
  // Co-op rooms (task 045, D109). No demo fallback: co-op needs the server.
  rooms: {
    create: (body: { playerId: string; name: string | null; design: Design }) => post<RoomState>('/api/rooms', body),
    /** undefined — nothing changed since `since` (204). */
    get: (code: string, playerId: string, since?: number) =>
      request<RoomState | undefined>(
        `${room(code)}?playerId=${encodeURIComponent(playerId)}${since === undefined ? '' : `&since=${since}`}`,
        { timeoutMs: 8000 },
      ),
    join: (code: string, playerId: string, name: string | null) => post<RoomState>(`${room(code)}/join`, { playerId, name }),
    leave: (code: string, playerId: string) => post<RoomState>(`${room(code)}/leave`, { playerId }),
    assign: (code: string, playerId: string, role: Role, slot: number | null) =>
      put<RoomState>(`${room(code)}/roles/${role}`, { playerId, slot }),
    design: (code: string, playerId: string, design: Design) => put<RoomState>(`${room(code)}/design`, { playerId, design }),
    // The launch runs the simulation (may wait for NASA DONKI), so it gets more time.
    launch: (code: string, playerId: string, seed?: number) =>
      post<RoomState>(`${room(code)}/launch`, { playerId, seed: seed ?? null }, 45000),
    reset: (code: string, playerId: string) => post<RoomState>(`${room(code)}/reset`, { playerId }),
  },
}
