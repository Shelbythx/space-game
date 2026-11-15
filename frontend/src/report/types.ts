// The `report` part of the `POST /api/simulate` response (docs/api.md v2.1, «Report»).
// Kept local to report/ until src/api/types.ts carries the v2 fields. The doc wins on any
// disagreement.

export type ReportSegment = 'launch' | 'space' | 'ground' | 'user'
export type ReportStatus = 'ok' | 'warn' | 'fail'
export type ReportResource = 'mass' | 'power' | 'budget' | 'data' | 'comms' | 'time'
export type ScoreKey = 'missionSuccess' | 'scienceValue' | 'resourceEfficiency' | 'decisionQuality'
export type Params = Record<string, number | string>

export interface Score {
  value: number
  formula: string
}

export interface ChainLink {
  kind: 'decision' | 'physics' | 'consequence'
  code: string
  params: Params
  formula?: string | null
}

export interface ReportData {
  success: boolean
  scores: Record<ScoreKey, Score>
  limits: Array<{ status: ReportStatus; code: string; params: Params }>
  segments: Array<{ segment: ReportSegment; status: ReportStatus; chain: ChainLink[] }>
  bottleneck: { resource: ReportResource; code: string; params: Params }
  comparison: {
    kind: 'real' | 'modeled'
    missionId: string
    nameCode: string
    deltas: Partial<Record<'altitudeKm' | 'inclinationDeg' | 'massKg' | 'dataGb' | 'cargoKg' | 'budgetK', number>>
    source: { kind: string; note: string | null; url: string | null } | null
  } | null
}

/** What the report needs from the previous attempt (`GET /api/attempts`). */
export interface PreviousAttempt {
  success: boolean
  scores: Record<ScoreKey, number | Score>
}

export type ReportStage = 'goal' | 'concept' | 'design' | 'flight'
