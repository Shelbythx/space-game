// Types for the API contract v2.1 in docs/api.md (D60, task 015).
// Hand-written; the backend publishes OpenAPI at /openapi/v1.json, and these types may be
// generated from it later. If this file and docs/api.md disagree, the doc wins.

export type Segment = 'launch' | 'space' | 'ground' | 'user'
export type CheckSegment = Segment | 'mission'
export type Status = 'ok' | 'warn' | 'fail'
export type Role = 'engineer' | 'designer' | 'planner' | 'scientist'
export type ResourceKind = 'mass' | 'power' | 'budget' | 'data' | 'comms' | 'time'
export type CalcResource = ResourceKind | 'orbit' | 'propellant' | 'rendezvous'
export type Tier = 'basic' | 'medium' | 'best'
export type GameVersion = 'simple' | 'advanced'
export type PartCategory = 'bus' | 'solar' | 'battery' | 'radio' | 'computer' | 'adcs' | 'propulsion'
export type BusSize = 'small' | 'medium' | 'large'
export type Band = 'uhf' | 's' | 'x'
/** Side of the bus a part faces (D93). */
export type Side = 'earth' | 'space' | 'sun' | 'inside'
export type MissionKind = 'tutorial' | 'orbit' | 'iss'

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
  kind: MissionKind
  titleCode: string
  available: boolean
}

export interface Orbit {
  id: string
  nameCode: string
  altitudeKm: number
  inclinationDeg: number
  epochDate: string | null
  source: Source
}

export interface Launch {
  id: string
  nameCode: string
  priceK: number
  capacityKg: Record<string, number>
  fixedOrbitId: string | null
  maxBusSize: BusSize
  source: Source
}

export interface Requirement {
  category: PartCategory
  partId: string
}

export interface PartSpecs {
  maxMassKg?: number
  slots?: number
  dragAreaM2?: number
  busSize?: BusSize
  powerW?: number
  capacityWh?: number
  rateKbps?: number
  band?: Band
  storageGb?: number
  accuracyDeg?: number
  ispS?: number
  thrustN?: number
  propellantKg?: number
}

export interface Part {
  id: string
  category: PartCategory
  tier: Tier
  nameCode: string
  massKg: number
  priceK: number
  consumptionW: number
  specs: PartSpecs
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
  longitudeDeg: number
  bands: Band[]
  priceK: number
  source: Source
}

/** Launch site, ISS mission only (D104). */
export interface LaunchSite {
  id: string
  nameCode: string
  latitudeDeg: number
  longitudeDeg: number
  source: Source
}

/** Cargo category, ISS mission only; value as in Instrument. */
export interface CargoCategory {
  id: string
  nameCode: string
  value: 'low' | 'medium' | 'high' | 'highest'
  typicalMassKg: number
  source: Source
}

export interface CargoItem {
  categoryId: string
  massKg: number
}

export type OrbitChoice = { presetId: string } | { altitudeKm: number; inclinationDeg: number }

export type DesignParts = Record<PartCategory, string>

export interface Design {
  missionId: string
  version: GameVersion
  orbit: OrbitChoice | null
  launchId: string
  parts: DesignParts
  instrumentIds: string[]
  groundStationIds: string[]
  /** Advanced version only (D93): key — part category (not bus) or instrument id. */
  layout?: Partial<Record<string, Side>> | null
  /** Advanced version only (D93): 0–50; null — recommended from mission limits. */
  massReservePct?: number | null
  /** ISS mission only: launch site, insertion orbit, cargo manifest and the TDRS relay. */
  launchSiteId?: string
  insertionAltitudeKm?: number
  cargo?: CargoItem[]
  relay?: boolean
}

export interface Preset {
  id: string
  nameCode: string
  design: Design
}

export interface Mission {
  id: string
  kind: MissionKind
  titleCode: string
  briefingCode: string
  /** `tutorial`, `orbit`: dataGb and operationMonths; `iss`: cargoKg, scienceCargoMinPct, dockingDeadlineDays. */
  goal: {
    dataGb?: number
    operationMonths?: number
    cargoKg?: number
    scienceCargoMinPct?: number
    dockingDeadlineDays?: number
  }
  limits: { budgetK: number; launchDeadlineMonth: number; massReserveRecommendedPct: number }
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
    launchSites: LaunchSite[]
    cargoCategories: CargoCategory[]
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

export interface CalcValue {
  name: string
  value: number
  unit: string
}

/** Calculation sheet (D94). */
export interface Calc {
  code: string
  resource: CalcResource
  formula: string
  inputs: CalcValue[]
  result: CalcValue
  summary: Message
  source: Source
}

export interface OrbitStrip {
  periodMin: number
  eclipse: { startMin: number; endMin: number } | null
  contacts: Array<{ stationId: string; startMin: number; endMin: number }>
}

export interface Evaluation {
  orbit: {
    altitudeKm: number
    inclinationDeg: number
    periodMin: number
    speedKmS: number
    eclipseFraction: number
    lifetimeYears: number | null
    disposalYears: number | null
  }
  resources: {
    mass: {
      usedKg: number
      busMaxKg: number
      launchCapacityKg: number
      slotsUsed: number
      slots: number
      reservePct: number
      reserveKg: number
      withReserveKg: number
      recommendedReservePct: number
    }
    power: {
      generationW: number
      averageGenerationW: number
      averageConsumptionW: number
      eclipseNeedWh: number
      batteryWh: number
    }
    budget: { usedK: number; limitK: number }
    data: {
      generatedGbPerDay: number
      downlinkGbPerDay: number
      storageGb: number
      expectedTotalGb: number
      goalGb: number
    } | null
    comms: { contactsPerDay: number; contactMinutesPerDay: number }
    time: { readyMonth: number; launchMonth: number; deadlineMonth: number }
    propellant: { neededKg: number; capacityKg: number; deltaVms: number }
    cargo: { loadedKg: number; scienceKg: number; sciencePct: number; goalKg: number; scienceMinPct: number } | null
  }
  /** ISS only: the transfer and phasing estimate (plan 2.10). */
  rendezvous: { hohmannDeltaVms: number; phasingDays: number; planeChangeDeltaVms: number } | null
  layout: Partial<Record<string, Side>>
  orbitStrip: OrbitStrip
  calc: Calc[]
  checks: Check[]
  comments: RoleComment[]
}

export interface ChainLink {
  kind: 'decision' | 'physics' | 'consequence'
  code: string
  params: Message['params']
  formula?: string
}

export interface Score {
  value: number
  formula: string
}

export type ComparisonDeltaKey = 'altitudeKm' | 'inclinationDeg' | 'massKg' | 'dataGb' | 'cargoKg' | 'budgetK'

/** The closest similar mission (D85): a real NASA mission or a reference design we simulated. */
export interface Comparison {
  kind: 'real' | 'modeled'
  missionId: string
  nameCode: string
  /** Player design minus the similar mission; only keys both have. */
  deltas: Partial<Record<ComparisonDeltaKey, number>>
  source: Source | null
}

export interface Report {
  success: boolean
  scores: { missionSuccess: Score; scienceValue: Score; resourceEfficiency: Score; decisionQuality: Score }
  limits: Array<Omit<Check, 'segment'>>
  segments: Array<{ segment: Segment; status: Status; chain: ChainLink[] }>
  bottleneck: { resource: ResourceKind; code: string; params: Message['params'] }
  /** null while the library of similar missions is empty (tasks 019, 023). */
  comparison?: Comparison | null
}

export type EventType = 'solarStorm' | 'debris' | 'failure' | 'reentry' | 'spaceWeatherUnavailable'

/** Where an event comes from: the seed generator or a real NASA DONKI storm (D83). */
export type EventSource =
  | { kind: 'seeded' }
  | {
      kind: 'donki'
      eventId: string | null
      observedAt: string | null
      kp: number | null
      periodStart: string
      periodEnd: string
    }

export interface MissionEvent {
  day: number
  type: EventType
  segment: Segment
  message: Message
  source: EventSource
}

/** Daily series from launch to the end of operations; all arrays have the same length. */
export interface Timeline {
  stepDays: number
  days: number[]
  batteryMinPct: number[]
  dataStoredGb: number[]
  dataDeliveredGb: number[]
  altitudeKm: number[]
  propellantKg: number[]
}

export interface TrackPoint {
  latDeg: number
  lonDeg: number
  /** false — the spacecraft is in the Earth's shadow. */
  sunlit: boolean
}

/** The first orbits for the flight map (task 010). */
export interface GroundTrack {
  stepSeconds: number
  orbitCount: number
  points: TrackPoint[]
}

export interface ContactSummary {
  stationId: string
  contactsPerDay: number
  minutesPerDay: number
  /** Angular radius of the station's visibility zone at a 10° mask; null for the TDRS relay. */
  visibilityRadiusDeg: number | null
}

export interface RendezvousProfile {
  initialPhaseAngleDeg: number
  stepHours: number
  hours: number[]
  phaseAngleDeg: number[]
  altitudeKm: number[]
  propellantKg: number[]
  dockedAtHours: number | null
}

export interface SimulationRequest {
  design: Design
  seed?: number
}

export interface SimulationResult {
  seed: number
  evaluation: Evaluation
  timeline: Timeline
  groundTrack: GroundTrack
  contacts: ContactSummary[]
  rendezvous: RendezvousProfile | null
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
