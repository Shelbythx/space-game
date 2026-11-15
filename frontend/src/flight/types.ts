// The slice of the API contract (docs/api.md, v2.1) that the flight screen replays.
// Kept local to flight/ until src/api/types.ts carries the v2 `simulate` fields; then these
// become re-exports. If this file and docs/api.md disagree, the doc wins.

export interface FlightMessage {
  code: string
  params: Record<string, number | string>
}

export type FlightEventType = 'solarStorm' | 'debris' | 'failure' | 'reentry' | 'spaceWeatherUnavailable'

export interface FlightEventSource {
  kind: 'donki' | 'seeded'
  eventId?: string | null
  observedAt?: string | null
  kp?: number | null
  periodStart?: string
  periodEnd?: string
}

export interface FlightEvent {
  day: number
  type: FlightEventType
  segment: 'launch' | 'space' | 'ground' | 'user'
  message: FlightMessage
  source: FlightEventSource
}

export interface FlightTimeline {
  stepDays: number
  days: number[]
  batteryMinPct: number[]
  dataStoredGb: number[]
  dataDeliveredGb: number[]
  altitudeKm: number[]
  propellantKg: number[]
}

export interface GroundTrackPoint {
  latDeg: number
  lonDeg: number
  sunlit: boolean
}

export interface GroundTrack {
  stepSeconds: number
  orbitCount: number
  points: GroundTrackPoint[]
}

export interface StationContacts {
  stationId: string
  contactsPerDay: number
  minutesPerDay: number
  /** Angular radius of the visibility zone on the map; null for the TDRS relay. */
  visibilityRadiusDeg: number | null
}

/** What the flight screen needs from the `POST /api/simulate` response. */
export interface FlightSimulation {
  timeline: FlightTimeline
  groundTrack: GroundTrack
  contacts: StationContacts[]
  events: FlightEvent[]
}

/** Ground station position from the mission catalog (`GET /api/missions/{id}`). */
export interface FlightStation {
  id: string
  nameCode: string
  latitudeDeg: number
  longitudeDeg: number
}

export type SeriesKey = 'batteryMinPct' | 'dataStoredGb' | 'dataDeliveredGb' | 'altitudeKm' | 'propellantKg'
