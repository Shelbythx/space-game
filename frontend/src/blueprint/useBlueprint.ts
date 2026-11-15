import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { api, demoMode } from '../api/client'
import type { Design, Evaluation, GameVersion, Mission, OrbitChoice, PartCategory, Side } from '../api/types'
import { readStorage, writeStorage } from '../lib/storage'

// Blueprint state: the design the player edits, the mission catalog and the latest
// evaluation from the backend (D59 — the frontend computes nothing itself).

const MISSION_ID = 'sat-orbit'
const STORAGE_KEY = 'smdg.blueprint.v1'
const EVALUATE_DELAY_MS = 300

function loadSaved(): Design | null {
  const raw = readStorage(STORAGE_KEY)
  if (!raw) return null
  try {
    const d = JSON.parse(raw) as Design
    return d.missionId === MISSION_ID && d.parts && d.parts.propulsion ? d : null
  } catch {
    return null
  }
}

/** Keeps a design inside the contract rules (docs/api.md «Design»). */
function normalize(design: Design, mission: Mission): Design {
  const launch = mission.catalogs.launches.find((l) => l.id === design.launchId)
  const next: Design = { ...design }
  if (launch?.fixedOrbitId) next.orbit = { presetId: launch.fixedOrbitId }
  if (next.version === 'simple') {
    next.layout = null
    next.massReservePct = null
    if (next.orbit && !('presetId' in next.orbit)) next.orbit = { presetId: 'sso' }
  }
  return next
}

export function useBlueprint() {
  const [mission, setMission] = useState<Mission | null>(null)
  const [design, setDesign] = useState<Design | null>(null)
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [evaluating, setEvaluating] = useState(false)
  const [failed, setFailed] = useState(false)
  const demo = useSyncExternalStore(demoMode.subscribe, demoMode.get)
  const requestId = useRef(0)

  useEffect(() => {
    let cancelled = false
    api
      .mission(MISSION_ID)
      .then((m) => {
        if (cancelled) return
        setMission(m)
        const saved = loadSaved()
        const preset = m.presets.find((p) => p.id === 'camera-small') ?? m.presets[0]
        const start = saved ?? { ...preset.design, version: preset.design.version ?? 'simple' }
        setDesign(normalize(start, m))
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!design || !mission) return
    writeStorage(STORAGE_KEY, JSON.stringify(design))
    const id = ++requestId.current
    const timer = window.setTimeout(() => {
      setEvaluating(true)
      api
        .evaluate(design)
        .then((e) => {
          if (id !== requestId.current) return
          setEvaluation(e)
          setFailed(false)
        })
        .catch(() => id === requestId.current && setFailed(true))
        .finally(() => id === requestId.current && setEvaluating(false))
    }, EVALUATE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [design, mission])

  const update = useCallback(
    (change: (d: Design) => Design) => {
      setDesign((d) => (d && mission ? normalize(change(d), mission) : d))
    },
    [mission],
  )

  const actions = {
    setPart: (category: PartCategory, id: string) => update((d) => ({ ...d, parts: { ...d.parts, [category]: id } })),
    toggleInstrument: (id: string) =>
      update((d) => ({
        ...d,
        instrumentIds: d.instrumentIds.includes(id) ? d.instrumentIds.filter((x) => x !== id) : [...d.instrumentIds, id],
      })),
    toggleStation: (id: string) =>
      update((d) => ({
        ...d,
        groundStationIds: d.groundStationIds.includes(id)
          ? d.groundStationIds.filter((x) => x !== id)
          : [...d.groundStationIds, id],
      })),
    setLaunch: (id: string) => update((d) => ({ ...d, launchId: id })),
    setOrbit: (orbit: OrbitChoice) => update((d) => ({ ...d, orbit })),
    setVersion: (version: GameVersion) => update((d) => ({ ...d, version })),
    setSide: (key: string, side: Side) => update((d) => ({ ...d, layout: { ...(d.layout ?? {}), [key]: side } })),
    setReserve: (pct: number) => update((d) => ({ ...d, massReservePct: pct })),
    applyPreset: (presetId: string) =>
      update((d) => {
        const preset = mission?.presets.find((p) => p.id === presetId)
        return preset ? { ...preset.design, version: d.version } : d
      }),
  }

  return { mission, design, evaluation, evaluating, failed, demo, actions }
}

export type BlueprintActions = ReturnType<typeof useBlueprint>['actions']
