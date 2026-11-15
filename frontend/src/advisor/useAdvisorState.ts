import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, api } from '../api/client'
import { getPlayerId } from '../lib/storage'
import { useMission } from '../mission/context'
import { useReportText } from '../report/reportText'
import type { AdvisorAnswer, AdvisorTurn, ChatEntry } from './types'

// One mentor chat for the whole mission (D111): questions on any stage and the report
// explanation after the flight land in the same conversation. The chat lives while the
// mission is open; the server gets the current design and the last 6 turns.

const HISTORY_TURNS = 6
const TURN_MAX = 2000

function problemOf(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'advisor.tooMany'
    const first = Object.values(error.errors)[0]?.[0]
    if (first?.startsWith('advisor.')) return first
  }
  return 'advisor.error'
}

export function useAdvisorState() {
  const { i18n } = useTranslation()
  const { say } = useReportText()
  const { design } = useMission()
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const nextId = useRef(1)
  const language = i18n.language.startsWith('uk') ? 'uk' : 'en'

  /** The answer as plain text for the history the model reads next time. */
  const answerText = useCallback(
    (answer: AdvisorAnswer) => (answer.text ?? answer.messages.map((m) => say(m)).join('\n')).slice(0, TURN_MAX),
    [say],
  )

  const run = useCallback(
    async (playerText: string, call: (history: AdvisorTurn[]) => Promise<AdvisorAnswer>) => {
      const history: AdvisorTurn[] = entries
        .flatMap((e): AdvisorTurn[] =>
          e.from === 'player'
            ? [{ from: 'player', text: e.text.slice(0, TURN_MAX) }]
            : e.from === 'advisor'
              ? [{ from: 'advisor', text: answerText(e.answer) }]
              : [],
        )
        .slice(-HISTORY_TURNS)
      const playerId = nextId.current++
      const pendingId = nextId.current++
      setEntries((list) => [...list, { id: playerId, from: 'player', text: playerText }, { id: pendingId, from: 'pending' }])
      setOpen(true)
      setBusy(true)
      try {
        const answer = await call(history)
        setEntries((list) => list.map((e) => (e.id === pendingId ? { id: pendingId, from: 'advisor', answer } : e)))
      } catch (error) {
        setEntries((list) => list.map((e) => (e.id === pendingId ? { id: pendingId, from: 'error', code: problemOf(error) } : e)))
      } finally {
        setBusy(false)
      }
    },
    [entries, answerText],
  )

  const ask = useCallback(
    (question: string) => {
      const q = question.trim()
      if (!q || !design || busy) return
      void run(q, (history) => api.advisor.ask({ playerId: getPlayerId(), language, design, question: q, history }))
    },
    [design, busy, run, language],
  )

  /** The report of the flight that used `seed` (the same flight, D65). */
  const explainReport = useCallback(
    (seed: number, playerText: string) => {
      if (!design || busy) return
      void run(playerText, () => api.advisor.report({ playerId: getPlayerId(), language, design, seed }))
    },
    [design, busy, run, language],
  )

  return { entries, open, setOpen, busy, ask, explainReport }
}

export type AdvisorState = ReturnType<typeof useAdvisorState>

export const AdvisorContext = createContext<AdvisorState | null>(null)

/** The mission's mentor chat; null outside a mission frame. */
export const useAdvisor = () => useContext(AdvisorContext)
