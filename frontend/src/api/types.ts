// Types for the API contract in docs/api.md (D60).
// Hand-written until the backend publishes OpenAPI (task 002); then they are replaced by
// types generated from /openapi/v1.json. If this file and docs/api.md disagree, the doc wins.

export type Segment = 'launch' | 'space' | 'ground' | 'user'
export type CheckSegment = Segment | 'mission'
export type Status = 'ok' | 'warn' | 'fail'
export type Role = 'engineer' | 'designer' | 'planner' | 'scientist'
export type ResourceKind = 'mass' | 'power' | 'budget' | 'data' | 'comms' | 'time'
export type Tier = 'basic' | 'medium' | 'best'
export type GameVersion = 'simple' | 'advanced'
export type PartCategory = 'bus' | 'solar' | 'battery' | 'radio' | 'computer' | 'adcs'

/** A player-facing text: an i18n key plus raw numeric/string params. */
export interface Message {
  code: string
  params: Record<string, number | string>
}

export interface Source {
  kind: 'nasa' | 'nasaRetold' | 'estimate' | 'calculated'
  note: string | null
  url: string | null
}

export interface Health {
  status: 'ok'
  version: string
}

export interface MissionSummary {
  id: string
  titleCode: string
  available: boolean
}

export interface Orbit {
  id: string
  nameCode: string
  altitudeKm: number
  inclinationDeg: number
  source: Source
}

export interface Launch {
  id: string
  nameCode: string
  priceK: number
  capacityKg: Record<string, number>
  fixedOrbitId: string | null
  source: Source
}

export interface Requirement {
  category: PartCategory
  partId: string
}

export interface Part {
  id: string
  category: PartCategory
  tier: Tier
  nameCode: string
  massKg: number
  priceK: number
  consumptionW: number
  specs: Partial<Record<'maxMassKg' | 'slots' | 'powerW' | 'capacityWh' | 'rateKbps' | 'accuracyDeg', number>>
  requires: Requirement[]
  source: Source
}

export interface Instrument {
  id: string
  nameCode: string
  tier: Tier
  massKg: number
  priceK: number
  consumptionW: number
  dataRateKbps: number
  value: 'low' | 'medium' | 'high' | 'highest'
  requires: Requirement[]
  source: Source
}

export interface GroundStation {
  id: string
  nameCode: string
  latitudeDeg: number
  bands: Array<'uhf' | 's' | 'x'>
  priceK: number
  source: Source
}

export type OrbitChoice = { presetId: string } | { altitudeKm: number; inclinationDeg: number }

export interface Design {
  missionId: string
  version: GameVersion
  orbit: OrbitChoice
  launchId: string
  parts: Record<PartCategory, string>
  instrumentIds: string[]
  groundStationIds: string[]
}

export interface Preset {
  id: string
  nameCode: string
  design: Design
}

export interface Mission {
  id: string
  titleCode: string
  briefingCode: string
  goal: { dataGb: number; operationMonths: number }
  limits: { budgetK: number; launchDeadlineMonth: number }
  timing: {
    buildMonths: Record<Tier, number>
    integrationMonths: number
    rideshareMonths: number[]
    launchLeadMonths: Record<string, number>
  }
  catalogs: {
    orbits: Orbit[]
    launches: Launch[]
    parts: Part[]
    instruments: Instrument[]
    groundStations: GroundStation[]
  }
  presets: Preset[]
}

export interface Check {
  segment: CheckSegment
  status: Status
  code: string
  params: Message['params']
}

export interface RoleComment {
  role: Role
  severity: 'info' | 'warn'
  message: Message
  /** Only in the simple version (D48); null in advanced. */
  advice: Message | null
}

export interface Evaluation {
  orbit: {
    altitudeKm: number
    inclinationDeg: number
    periodMin: number
    speedKmS: number
    eclipseFraction: number
  }
  resources: {
    mass: { usedKg: number; busMaxKg: number; launchCapacityKg: number; slotsUsed: number; slots: number }
    power: {
      generationW: number
      averageGenerationW: number
      averageConsumptionW: number
      eclipseNeedWh: number
      batteryWh: number
    }
    budget: { usedK: number; limitK: number }
    data: { generatedGbPerDay: number; downlinkGbPerDay: number; expectedTotalGb: number; goalGb: number }
    comms: { contactsPerDay: number; contactMinutesPerDay: number }
    time: { readyMonth: number; launchMonth: number; deadlineMonth: number }
  }
  checks: Check[]
  comments: RoleComment[]
}

export interface ChainLink {
  kind: 'decision' | 'physics' | 'consequence'
  code: string
  params: Message['params']
  formula?: string
}

export interface Report {
  success: boolean
  scores: { missionSuccess: number; scienceValue: number; resourceEfficiency: number; decisionQuality: number }
  limits: Array<Omit<Check, 'segment'>>
  segments: Array<{ segment: Segment; status: Status; chain: ChainLink[] }>
  bottleneck: { resource: ResourceKind; code: string; params: Message['params'] }
}

export interface MissionEvent {
  day: number
  type: 'solarStorm' | 'debris' | 'failure'
  segment: Segment
  message: Message
}

export interface SimulationRequest {
  design: Design
  seed?: number
}

export interface SimulationResult {
  seed: number
  evaluation: Evaluation
  timeline: {
    stepDays: number
    days: number[]
    batteryMinPct: number[]
    dataStoredGb: number[]
    dataDeliveredGb: number[]
  }
  events: MissionEvent[]
  report: Report
}

export interface AttemptSummary {
  id: string
  createdAt: string
  seed: number
  success: boolean
  scores: Report['scores']
  bottleneck: Report['bottleneck']
}

export interface Attempt {
  id: string
  createdAt: string
  playerId: string
  design: Design
  seed: number
  result: SimulationResult
}
