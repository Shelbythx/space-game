import type { Message } from '../api/types'

// AI advisor (docs/api.md 2.3, D111, task 049).

export interface AdvisorTurn {
  from: 'player' | 'advisor'
  text: string
}

/** `claude` — `text` from the model; `demo` — `messages` (game message codes), `text` null. */
export interface AdvisorAnswer {
  source: 'claude' | 'demo'
  text: string | null
  messages: Message[]
}

export type ChatEntry =
  | { id: number; from: 'player'; text: string }
  | { id: number; from: 'advisor'; answer: AdvisorAnswer }
  | { id: number; from: 'pending' }
  | { id: number; from: 'error'; code: string }
