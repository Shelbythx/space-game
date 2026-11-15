import { createContext, useContext } from 'react'
import type { BlueprintState } from '../blueprint/useBlueprint'

// One mission state for all five stages (D41), so moving between stages keeps the design.

export const MissionContext = createContext<BlueprintState | null>(null)

export function useMission(): BlueprintState {
  const value = useContext(MissionContext)
  if (!value) throw new Error('useMission must be used inside <MissionShell>')
  return value
}

export const STAGES = ['goal', 'concept', 'design', 'flight', 'report'] as const
export type Stage = (typeof STAGES)[number]
