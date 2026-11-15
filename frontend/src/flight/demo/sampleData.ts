// SAMPLE DATA FOR THE DEMO PAGE ONLY. The game never uses this file: in the game every
// number comes from `POST /api/simulate` (D59). The shapes follow docs/api.md; the values
// are made up to look like mission 1 so the flight screen can be checked without a backend.

import type { FlightSimulation, FlightStation, GroundTrackPoint } from '../types'

const RAD = Math.PI / 180

/** A plausible-looking track of a near-polar orbit, just to have something to draw. */
function sampleTrack(inclinationDeg: number, periodMin: number, orbits: number): GroundTrackPoint[] {
  const points: GroundTrackPoint[] = []
  const total = Math.round(periodMin * orbits)
  for (let minute = 0; minute <= total; minute++) {
    const u = (minute / periodMin) * 2 * Math.PI
    const lat = Math.asin(Math.sin(inclinationDeg * RAD) * Math.sin(u)) / RAD
    const lonInertial = Math.atan2(Math.cos(inclinationDeg * RAD) * Math.sin(u), Math.cos(u)) / RAD
    let lon = lonInertial - minute * 0.2507 - 75
    lon = ((((lon + 180) % 360) + 360) % 360) - 180
    const phase = (minute / periodMin) % 1
    points.push({ latDeg: lat, lonDeg: lon, sunlit: !(phase > 0.4 && phase < 0.76) })
  }
  return points
}

function series(length: number, value: (day: number) => number): number[] {
  return Array.from({ length }, (_, day) => Math.round(value(day) * 100) / 100)
}

export const sampleStations: FlightStation[] = [
  { id: 'fairbanks', nameCode: 'station.fairbanks', latitudeDeg: 65, longitudeDeg: -147.5 },
  { id: 'white-sands', nameCode: 'station.whiteSands', latitudeDeg: 32.5, longitudeDeg: -106.6 },
  { id: 'guam', nameCode: 'station.guam', latitudeDeg: 13.5, longitudeDeg: 144.8 },
]

/** Mission 1 that goes well: a storm, a debris manoeuvre, a part failure. */
export const sampleMission: FlightSimulation = {
  timeline: {
    stepDays: 1,
    days: series(366, (d) => d),
    batteryMinPct: series(366, (d) => (d === 0 ? 100 : d > 290 ? 58 : 67 - (d % 30 === 0 ? 4 : 0))),
    dataStoredGb: series(366, (d) => Math.min(512, d * 6)),
    dataDeliveredGb: series(366, (d) => Math.max(0, d * 1.75 - (d > 143 ? 9 : 0) - (d > 290 ? (d - 290) * 0.6 : 0))),
    altitudeKm: series(366, (d) => 705 - d * 0.006 - (d > 143 ? 0.4 : 0)),
    propellantKg: series(366, (d) => 4 - (d > 201 ? 0.01 : 0) - d * 0.0004),
  },
  groundTrack: { stepSeconds: 60, orbitCount: 3, points: sampleTrack(98.2, 98.8, 3) },
  contacts: [
    { stationId: 'fairbanks', contactsPerDay: 10, minutesPerDay: 80, visibilityRadiusDeg: 21.6 },
    { stationId: 'white-sands', contactsPerDay: 4, minutesPerDay: 31, visibilityRadiusDeg: 21.6 },
    { stationId: 'guam', contactsPerDay: 0, minutesPerDay: 0, visibilityRadiusDeg: 21.6 },
  ],
  events: [
    {
      day: 143,
      type: 'solarStorm',
      segment: 'space',
      message: { code: 'event.solarStorm', params: { kp: 8, lostContacts: 6 } },
      source: {
        kind: 'donki',
        eventId: '2015-03-17T00:00:00-GST-001',
        observedAt: '2015-03-17T15:00:00Z',
        kp: 8,
        periodStart: '2014-10-26',
        periodEnd: '2015-10-25',
      },
    },
    {
      day: 201,
      type: 'debris',
      segment: 'space',
      message: { code: 'event.debrisAvoidance', params: { deltaVms: 0.5, propellantKg: 0.01 } },
      source: { kind: 'seeded' },
    },
    {
      day: 290,
      type: 'failure',
      segment: 'space',
      message: { code: 'event.failure', params: { partId: 'radio-s' } },
      source: { kind: 'seeded' },
    },
  ],
}

/** A low CubeSat with no engine: the orbit decays and the mission ends early. */
export const sampleDecay: FlightSimulation = {
  timeline: {
    stepDays: 1,
    days: series(211, (d) => d),
    batteryMinPct: series(211, (d) => (d === 0 ? 100 : 54)),
    dataStoredGb: series(211, (d) => Math.min(32, d * 0.4)),
    dataDeliveredGb: series(211, (d) => d * 0.05),
    altitudeKm: series(211, (d) => 400 - 220 * (d / 210) ** 3),
    propellantKg: series(211, () => 0),
  },
  groundTrack: { stepSeconds: 60, orbitCount: 3, points: sampleTrack(51.6, 92.6, 3) },
  contacts: [{ stationId: 'white-sands', contactsPerDay: 5, minutesPerDay: 34, visibilityRadiusDeg: 15.8 }],
  events: [
    {
      day: 0,
      type: 'spaceWeatherUnavailable',
      segment: 'space',
      message: { code: 'event.spaceWeatherUnavailable', params: {} },
      source: { kind: 'donki', eventId: null, observedAt: null, kp: null },
    },
    {
      day: 210,
      type: 'reentry',
      segment: 'space',
      message: { code: 'event.reentry', params: { altitudeKm: 180 } },
      source: { kind: 'seeded' },
    },
  ],
}
