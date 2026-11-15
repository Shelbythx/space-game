import type { Design, Evaluation, GameVersion, Role, SimulationResult } from '../api/types'

// Co-op rooms (docs/api.md 2.2, D109, task 045).

export type RoomPhase = 'design' | 'launched'

export type RoomChangeKind = 'create' | 'join' | 'leave' | 'roles' | 'design' | 'launch' | 'reset'

export interface RoomPlayer {
  slot: number
  name: string | null
  online: boolean
}

export interface RoomChange {
  slot: number | null
  kind: RoomChangeKind
  fields: string[]
}

export interface RoomLaunch {
  slot: number
  seed: number
  result: SimulationResult
}

export interface RoomState {
  code: string
  revision: number
  phase: RoomPhase
  missionId: string
  version: GameVersion
  you: { slot: number } | null
  players: RoomPlayer[]
  roles: Record<Role, number | null>
  design: Design
  evaluation: Evaluation
  lastChange: RoomChange | null
  launch: RoomLaunch | null
}

export const ROLES: Role[] = ['engineer', 'designer', 'planner', 'scientist']
