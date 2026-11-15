import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, api } from '../api/client'
import type { Design, Role } from '../api/types'
import { getPlayerId, readStorage, writeStorage } from '../lib/storage'
import { mergeOwned } from './ownership'
import type { RoomState } from './types'

// One co-op room (docs/api.md 2.2, D109): the state is polled about once a second with
// `since`, so an unchanged room costs a 204. Design edits are sent ~300 ms after the last
// click with the full design; the server keeps only the fields of this player's roles.

const POLL_MS = 1000
/** Hidden tab: poll rarely but keep the player «online» (the window is 30 s). */
const POLL_HIDDEN_MS = 10000
const SEND_DELAY_MS = 300
const NAME_KEY = 'smdg.name'

export const savedName = () => readStorage(NAME_KEY) ?? ''
export const saveName = (name: string) => writeStorage(NAME_KEY, name.trim())

/** Message code of a failed room call: `room.*`, `design.*`, or `coop.offline`. */
function problemOf(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'coop.offline'
    const first = Object.values(error.errors)[0]?.[0]
    return first ?? error.message
  }
  return 'coop.offline'
}

export function useRoom(code: string) {
  const playerId = useMemo(() => getPlayerId(), [])
  const [room, setRoom] = useState<RoomState | null>(null)
  const [gone, setGone] = useState(false)
  const [offline, setOffline] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /** This player's unsent or in-flight design (its own fields over the room's). */
  const [local, setLocal] = useState<Design | null>(null)
  const revision = useRef<number | undefined>(undefined)
  const latestLocal = useRef<Design | null>(null)
  const sendTimer = useRef<number | undefined>(undefined)

  const apply = useCallback((next: RoomState | undefined) => {
    if (!next) return
    // An older answer that arrived late must not roll the room back.
    if (revision.current !== undefined && next.revision < revision.current) return
    revision.current = next.revision
    setRoom(next)
    setOffline(false)
  }, [])

  // Polling.
  useEffect(() => {
    let stopped = false
    let timer: number | undefined
    const tick = async () => {
      try {
        apply(await api.rooms.get(code, playerId, revision.current))
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          setGone(true)
          return
        }
        setOffline(true)
      }
      if (!stopped) timer = window.setTimeout(tick, document.hidden ? POLL_HIDDEN_MS : POLL_MS)
    }
    const wake = () => {
      if (document.hidden || stopped) return
      window.clearTimeout(timer)
      void tick()
    }
    void tick()
    document.addEventListener('visibilitychange', wake)
    return () => {
      stopped = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', wake)
    }
  }, [code, playerId, apply])

  const run = useCallback(
    async (call: () => Promise<RoomState>): Promise<boolean> => {
      setBusy(true)
      setProblem(null)
      try {
        apply(await call())
        return true
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) setGone(true)
        setProblem(problemOf(error))
        return false
      } finally {
        setBusy(false)
      }
    },
    [apply],
  )

  const send = useCallback(() => {
    const design = latestLocal.current
    if (!design) return
    api.rooms
      .design(code, playerId, design)
      .then((next) => {
        apply(next)
        setProblem(null)
      })
      .catch((error: unknown) => setProblem(problemOf(error)))
      .finally(() => {
        // Newer clicks are waiting for their own send.
        if (latestLocal.current === design) {
          latestLocal.current = null
          setLocal(null)
        }
      })
  }, [code, playerId, apply])

  const you = room?.you?.slot ?? null
  const myRoles = useMemo(
    () => new Set<Role>(room && you !== null ? (Object.keys(room.roles) as Role[]).filter((r) => room.roles[r] === you) : []),
    [room, you],
  )
  const design = room ? (local ? mergeOwned(room.design, local, myRoles) : room.design) : null

  const actions = {
    join: (name: string) => {
      saveName(name)
      return run(() => api.rooms.join(code, playerId, name.trim() || null))
    },
    leave: () => run(() => api.rooms.leave(code, playerId)),
    assign: (role: Role, slot: number | null) => run(() => api.rooms.assign(code, playerId, role, slot)),
    launch: (seed?: number) => run(() => api.rooms.launch(code, playerId, seed)),
    reset: () => run(() => api.rooms.reset(code, playerId)),
    /** Same design, new seed (D65) — «fly again» for everyone. */
    again: async () => {
      if (await run(() => api.rooms.reset(code, playerId)))
        await run(() => api.rooms.launch(code, playerId, Math.floor(Math.random() * 2_000_000_000) + 1))
    },
    editDesign: (next: Design) => {
      latestLocal.current = next
      setLocal(next)
      window.clearTimeout(sendTimer.current)
      sendTimer.current = window.setTimeout(send, SEND_DELAY_MS)
    },
    clearProblem: () => setProblem(null),
  }

  useEffect(() => () => window.clearTimeout(sendTimer.current), [])

  const nameOf = (slot: number | null | undefined) => {
    const player = room?.players.find((p) => p.slot === slot)
    return player?.name ?? null
  }

  return { code, playerId, room, gone, offline, problem, busy, you, myRoles, design, sending: local !== null, nameOf, actions }
}

export type RoomHandle = ReturnType<typeof useRoom>

export const RoomContext = createContext<RoomHandle | null>(null)

export function useRoomContext(): RoomHandle {
  const value = useContext(RoomContext)
  if (!value) throw new Error('useRoomContext must be used inside <CoopRoom>')
  return value
}
