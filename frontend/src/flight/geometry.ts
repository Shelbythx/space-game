// Drawing helpers for the flat (equirectangular) map. Display geometry only: where a
// backend-supplied point or zone lands on screen. No mission physics lives here (D59).

import type { GroundTrackPoint } from './types'

export const MAP_WIDTH = 360
export const MAP_HEIGHT = 180

const RAD = Math.PI / 180

/** Longitude/latitude in degrees → map units (x right, y down). */
export function project(lonDeg: number, latDeg: number): [number, number] {
  return [lonDeg + 180, 90 - latDeg]
}

export interface TrackSegment {
  sunlit: boolean
  /** SVG polyline `points` attribute. */
  points: string
}

/**
 * Splits the ground track into polylines: a new one starts where the track wraps around
 * the ±180° edge of the map or where it passes between sunlight and Earth's shadow.
 */
export function trackSegments(points: GroundTrackPoint[]): TrackSegment[] {
  const segments: TrackSegment[] = []
  let current: string[] = []
  let sunlit = true

  const flush = () => {
    if (current.length > 1) segments.push({ sunlit, points: current.join(' ') })
    current = []
  }

  points.forEach((point, index) => {
    const [x, y] = project(point.lonDeg, point.latDeg)
    const xy = `${x.toFixed(2)},${y.toFixed(2)}`
    const previous = points[index - 1]
    if (previous) {
      const wraps = Math.abs(point.lonDeg - previous.lonDeg) > 180
      if (wraps) {
        flush()
      } else if (point.sunlit !== sunlit) {
        // Close the old segment on this point so the line has no gap at the boundary.
        current.push(xy)
        flush()
      }
    }
    sunlit = point.sunlit
    current.push(xy)
  })
  flush()
  return segments
}

/**
 * Outline of a station's visibility zone: a circle of the given angular radius on the
 * sphere, drawn on the flat map. Longitudes are left unwrapped (may leave −180…180) so the
 * outline stays one closed shape; the map draws it three times, shifted by ±360°.
 */
export function zoneOutline(latDeg: number, lonDeg: number, radiusDeg: number, steps = 72): string {
  const lat0 = latDeg * RAD
  const radius = radiusDeg * RAD
  const out: string[] = []
  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * 2 * Math.PI
    const sinLat = Math.sin(lat0) * Math.cos(radius) + Math.cos(lat0) * Math.sin(radius) * Math.cos(bearing)
    const lat = Math.asin(Math.max(-1, Math.min(1, sinLat)))
    const dLon = Math.atan2(
      Math.sin(bearing) * Math.sin(radius) * Math.cos(lat0),
      Math.cos(radius) - Math.sin(lat0) * sinLat,
    )
    const [x, y] = project(lonDeg + dLon / RAD, lat / RAD)
    out.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return out.join(' ')
}

/** Is a map point inside a station's drawn zone? Used only to light the zone up. */
export function insideZone(
  point: { latDeg: number; lonDeg: number },
  station: { latitudeDeg: number; longitudeDeg: number },
  radiusDeg: number,
): boolean {
  const lat1 = point.latDeg * RAD
  const lat2 = station.latitudeDeg * RAD
  const dLon = (point.lonDeg - station.longitudeDeg) * RAD
  const cosAngle = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) <= radiusDeg * RAD
}

/** Value of a backend series at a fractional step index (straight line between samples). */
export function sampleSeries(series: number[], index: number): number {
  if (series.length === 0) return 0
  const clamped = Math.max(0, Math.min(series.length - 1, index))
  const low = Math.floor(clamped)
  const high = Math.min(series.length - 1, low + 1)
  return series[low] + (series[high] - series[low]) * (clamped - low)
}
