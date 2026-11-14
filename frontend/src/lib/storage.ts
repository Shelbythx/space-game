// localStorage can be missing or throw (private mode, blocked site data). Every access is
// guarded so the game still runs without it.

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Not critical: the value simply is not remembered.
  }
}

const PLAYER_ID_KEY = 'smdg.playerId'
let sessionPlayerId: string | null = null

/** Anonymous player id for saving attempts without registration (D60). */
export function getPlayerId(): string {
  const stored = readStorage(PLAYER_ID_KEY)
  if (stored) return stored
  sessionPlayerId ??= crypto.randomUUID()
  writeStorage(PLAYER_ID_KEY, sessionPlayerId)
  return sessionPlayerId
}
