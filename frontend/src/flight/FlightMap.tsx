import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { MAP_HEIGHT, MAP_WIDTH, insideZone, project, trackSegments, zoneOutline } from './geometry'
import { FLIGHT_NS } from './i18n'
import type { FlightEventType, FlightStation, GroundTrack, StationContacts } from './types'

interface Props {
  groundTrack: GroundTrack
  stations: FlightStation[]
  contacts: StationContacts[]
  /** Position along the track, 0…1. */
  trackPhase: number
  /** Event being shown right now; tints the map frame. */
  activeEvent: FlightEventType | null
  /** The craft is gone (re-entry or loss): hide the marker. */
  lost: boolean
}

const MERIDIANS = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150]
const PARALLELS = [-60, -30, 0, 30, 60]

/** Flat map of the Earth (D54): grid, ground track, shadow, station zones, the craft. */
export function FlightMap({ groundTrack, stations, contacts, trackPhase, activeEvent, lost }: Props) {
  const { t } = useTranslation([FLIGHT_NS, 'translation'])
  const segments = useMemo(() => trackSegments(groundTrack.points), [groundTrack.points])

  const zones = useMemo(
    () =>
      stations.map((station) => {
        const contact = contacts.find((c) => c.stationId === station.id)
        const radius = contact?.visibilityRadiusDeg ?? null
        return {
          station,
          radius,
          hasContacts: (contact?.contactsPerDay ?? 0) > 0,
          outline: radius ? zoneOutline(station.latitudeDeg, station.longitudeDeg, radius) : null,
        }
      }),
    [stations, contacts],
  )

  const points = groundTrack.points
  const craftIndex = Math.max(0, Math.min(points.length - 1, Math.floor(trackPhase * points.length)))
  const craft = points[craftIndex] ?? null
  const [craftX, craftY] = craft ? project(craft.lonDeg, craft.latDeg) : [0, 0]

  return (
    <svg
      className={`fl-map${activeEvent ? ` fl-map--${activeEvent}` : ''}`}
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      role="img"
      aria-label={t('map.label')}
    >
      <rect className="fl-map__sea" width={MAP_WIDTH} height={MAP_HEIGHT} />

      <g className="fl-map__grid">
        {MERIDIANS.map((lon) => (
          <line key={`m${lon}`} x1={lon + 180} y1={0} x2={lon + 180} y2={MAP_HEIGHT} />
        ))}
        {PARALLELS.map((lat) => (
          <line key={`p${lat}`} x1={0} y1={90 - lat} x2={MAP_WIDTH} y2={90 - lat} className={lat === 0 ? 'fl-map__equator' : undefined} />
        ))}
      </g>
      <g className="fl-map__ticks">
        {[-120, -60, 0, 60, 120].map((lon) => (
          <text key={lon} x={lon + 180 + 1} y={MAP_HEIGHT - 2}>
            {lon}°
          </text>
        ))}
        {[-60, -30, 30, 60].map((lat) => (
          <text key={lat} x={1.5} y={90 - lat - 1}>
            {lat}°
          </text>
        ))}
      </g>

      {zones.map(({ station, radius, outline, hasContacts }) => {
        const [x, y] = project(station.longitudeDeg, station.latitudeDeg)
        const inContact = !lost && hasContacts && radius !== null && craft !== null && insideZone(craft, station, radius)
        return (
          <g key={station.id} className={`fl-station${inContact ? ' fl-station--contact' : ''}${hasContacts ? '' : ' fl-station--silent'}`}>
            {outline &&
              [-MAP_WIDTH, 0, MAP_WIDTH].map((shift) => (
                <polygon key={shift} className="fl-station__zone" points={outline} transform={`translate(${shift} 0)`} />
              ))}
            {inContact && craft && <line className="fl-station__link" x1={x} y1={y} x2={craftX} y2={craftY} />}
            <rect className="fl-station__dot" x={x - 1.6} y={y - 1.6} width={3.2} height={3.2} />
            <text className="fl-station__name" x={x + 3} y={y - 2.5}>
              {t(station.nameCode, { ns: 'translation', defaultValue: station.id })}
            </text>
          </g>
        )
      })}

      <g className="fl-track">
        {segments.map((segment, index) => (
          <polyline key={index} className={segment.sunlit ? 'fl-track__lit' : 'fl-track__shadow'} points={segment.points} />
        ))}
      </g>

      {craft && !lost && (
        <g className={`fl-craft${craft.sunlit ? '' : ' fl-craft--shadow'}`} transform={`translate(${craftX} ${craftY})`}>
          <circle className="fl-craft__halo" r={5} />
          <rect className="fl-craft__body" x={-1.8} y={-1.8} width={3.6} height={3.6} />
          <rect className="fl-craft__panel" x={-5.4} y={-0.9} width={3} height={1.8} />
          <rect className="fl-craft__panel" x={2.4} y={-0.9} width={3} height={1.8} />
        </g>
      )}
    </svg>
  )
}
