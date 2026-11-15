import type { Design, GameVersion } from '../api/types'
import { readStorage, writeStorage } from '../lib/storage'

// Autosave of the unfinished design, one per mission (task 008). localStorage may be
// missing; then the game simply starts fresh each time.

const designKey = (missionId: string) => `smdg.design.${missionId}`
const startKey = (missionId: string) => `smdg.start.${missionId}`

export function loadDesign(missionId: string): Design | null {
  const raw = readStorage(designKey(missionId))
  if (!raw) return null
  try {
    const d = JSON.parse(raw) as Design
    return d.missionId === missionId && d.parts?.propulsion ? d : null
  } catch {
    return null
  }
}

export function saveDesign(design: Design): void {
  writeStorage(designKey(design.missionId), JSON.stringify(design))
}

export const hasSave = (missionId: string) => loadDesign(missionId) !== null

/** New game: forget the saved design and remember which version to start in. */
export function startFresh(missionId: string, version: GameVersion): void {
  writeStorage(designKey(missionId), '')
  writeStorage(startKey(missionId), version)
}

export function startVersion(missionId: string): GameVersion {
  return readStorage(startKey(missionId)) === 'advanced' ? 'advanced' : 'simple'
}
