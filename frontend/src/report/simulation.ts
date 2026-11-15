import { createContext, useContext, useEffect, useReducer } from 'react'
import { ApiError, api, demoMode } from '../api/client'
import type { AttemptSummary, Design, SimulationResult } from '../api/types'
import { getPlayerId, readStorage, writeStorage } from '../lib/storage'

// One simulation per design, shared by the flight (task 010) and report (task 011) stages.
// The backend computes the whole flight (D59). The same design and seed give the same flight
// (D65), so the seed is remembered per mission: a reload shows the same flight and does not
// save a second attempt. Every new flight is saved as an attempt (POST /api/attempts), and
// the report compares it with the previous attempt at the same mission.

export type SimulationState =
  | { status: 'loading' }
  | { status: 'ready'; result: SimulationResult }
  /** No mission server (demo mode or network failure): screens show a demo or «needs the server». */
  | { status: 'offline' }
  | { status: 'error'; problem: string }

export type AttemptsState =
  | { status: 'loading' }
  | { status: 'ready'; current: AttemptSummary | null; previous: AttemptSummary | null }
  | { status: 'failed' }

interface Entry {
  sim: SimulationState
  attempts: AttemptsState
  run: number
  started: boolean
  listeners: Set<() => void>
}

interface Flight {
  key: string
  seed: number
  attemptId?: string
}

const entries = new Map<string, Entry>()
const keyOf = (design: Design) => JSON.stringify(design)
const flightKey = (missionId: string) => `smdg.flight.${missionId}`
const attemptsKey = (missionId: string) => `smdg.attempts.${missionId}`

function readJson<T>(key: string): T | null {
  const raw = readStorage(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** Attempt ids saved from this browser for one mission (attempt summaries carry no mission id). */
const missionAttempts = (missionId: string) => readJson<string[]>(attemptsKey(missionId)) ?? []

function entryFor(key: string): Entry {
  let entry = entries.get(key)
  if (!entry) {
    entry = { sim: { status: 'loading' }, attempts: { status: 'loading' }, run: 0, started: false, listeners: new Set() }
    entries.set(key, entry)
  }
  return entry
}

function update(entry: Entry, change: Partial<Pick<Entry, 'sim' | 'attempts'>>) {
  Object.assign(entry, change)
  entry.listeners.forEach((l) => l())
}

async function saveAttempt(entry: Entry, run: number, design: Design, key: string, seed: number) {
  const missionId = design.missionId
  try {
    const flight = readJson<Flight>(flightKey(missionId))
    const playerId = getPlayerId()
    let currentId = flight?.key === key && flight.seed === seed ? flight.attemptId : undefined
    let current: AttemptSummary | null = null
    if (!currentId) {
      current = await api.saveAttempt({ playerId, design, seed })
      currentId = current.id
      writeStorage(flightKey(missionId), JSON.stringify({ key, seed, attemptId: currentId } satisfies Flight))
      writeStorage(attemptsKey(missionId), JSON.stringify([...missionAttempts(missionId), currentId].slice(-50)))
    }
    const list = await api.attempts(playerId)
    if (entry.run !== run) return
    current ??= list.find((a) => a.id === currentId) ?? null
    const mine = new Set(missionAttempts(missionId))
    const previous =
      list.find((a) => a.id !== currentId && mine.has(a.id) && (!current || a.createdAt <= current.createdAt)) ?? null
    update(entry, { attempts: { status: 'ready', current, previous } })
  } catch {
    if (entry.run === run) update(entry, { attempts: { status: 'failed' } })
  }
}

async function start(entry: Entry, design: Design, key: string, seed?: number) {
  const run = ++entry.run
  entry.started = true
  if (demoMode.get()) {
    update(entry, { sim: { status: 'offline' }, attempts: { status: 'failed' } })
    return
  }
  update(entry, { sim: { status: 'loading' }, attempts: { status: 'loading' } })
  try {
    const result = await api.simulate({ design, seed })
    if (entry.run !== run) return
    const flight = readJson<Flight>(flightKey(design.missionId))
    if (!(flight?.key === key && flight.seed === result.seed)) {
      writeStorage(flightKey(design.missionId), JSON.stringify({ key, seed: result.seed } satisfies Flight))
    }
    update(entry, { sim: { status: 'ready', result } })
    void saveAttempt(entry, run, design, key, result.seed)
  } catch (error) {
    if (entry.run !== run) return
    const offline = error instanceof ApiError && (error.status === 0 || error.status === 404)
    update(entry, {
      sim: offline ? { status: 'offline' } : { status: 'error', problem: error instanceof Error ? error.message : String(error) },
      attempts: { status: 'failed' },
    })
  }
}

export interface SimulationSource {
  simulation: SimulationState
  attempts: AttemptsState
  flyAgain: () => void
}

/**
 * Co-op (task 045): the room already holds the launched flight, computed once by the backend
 * for every player — the flight and report stages show it instead of simulating again.
 */
export const RoomSimulationContext = createContext<SimulationSource | null>(null)

/** Simulation of the current design; starts it on first use and shares it between stages. */
export function useSimulation(design: Design | null): SimulationSource {
  const room = useContext(RoomSimulationContext)
  const key = design && !room ? keyOf(design) : null
  const [, rerender] = useReducer((x: number) => x + 1, 0)

  useEffect(() => {
    if (!key || !design) return
    const entry = entryFor(key)
    entry.listeners.add(rerender)
    if (!entry.started) {
      // The mission keeps its seed until «fly again»: a changed design (or a switch between the
      // simple and advanced versions) meets the same storms and failures, so the comparison
      // with the previous attempt shows the effect of the design, not of luck.
      const flight = readJson<Flight>(flightKey(design.missionId))
      void start(entry, design, key, flight?.seed)
    }
    return () => {
      entry.listeners.delete(rerender)
    }
  }, [key, design])

  if (room) return room
  const entry = key ? entries.get(key) : undefined
  return {
    simulation: entry?.sim ?? ({ status: 'loading' } as SimulationState),
    attempts: entry?.attempts ?? ({ status: 'loading' } as AttemptsState),
    /** Same design, new seed: other storms, debris and failures (D65). */
    flyAgain: () => {
      if (!key || !design) return
      void start(entryFor(key), design, key, Math.floor(Math.random() * 2_000_000_000) + 1)
    },
  }
}
