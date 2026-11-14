import { useEffect, useState } from 'react'
import { api } from './client'

export type ServerState = 'waking' | 'ready' | 'unreachable'

// Render's free tier sleeps; the first request can take about a minute (D61).
const ATTEMPTS = 8
const ATTEMPT_TIMEOUT_MS = 12000
const RETRY_DELAY_MS = 3000

/** Pings /api/health until the backend answers, so the UI can say "server is waking up". */
export function useServerWake(): ServerState {
  const [state, setState] = useState<ServerState>('waking')

  useEffect(() => {
    let cancelled = false
    let retryTimer = 0

    const attempt = async (n: number) => {
      try {
        await api.health(ATTEMPT_TIMEOUT_MS)
        if (!cancelled) setState('ready')
      } catch {
        if (cancelled) return
        if (n + 1 >= ATTEMPTS) setState('unreachable')
        else retryTimer = window.setTimeout(() => void attempt(n + 1), RETRY_DELAY_MS)
      }
    }
    void attempt(0)

    return () => {
      cancelled = true
      window.clearTimeout(retryTimer)
    }
  }, [])

  return state
}
