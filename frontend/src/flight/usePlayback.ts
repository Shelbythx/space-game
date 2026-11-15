import { useCallback, useEffect, useRef, useState } from 'react'

/** Mission days per real second at each speed. */
export const SPEEDS = [2, 8, 32] as const
export type SpeedIndex = 0 | 1 | 2

/** Real seconds for the craft to run once along the drawn ground track. */
const TRACK_LOOP_SECONDS = 36

export interface Playback {
  /** Current mission day, fractional. */
  day: number
  /** Position along the ground track, 0…1, looping. */
  trackPhase: number
  playing: boolean
  finished: boolean
  speed: SpeedIndex
  toggle: () => void
  setSpeed: (speed: SpeedIndex) => void
  seek: (day: number) => void
}

/**
 * The mission clock. It only moves a cursor over the series the backend returned; the
 * track animation loops on its own clock because the track covers the first orbits only.
 */
export function usePlayback(lastDay: number): Playback {
  const [day, setDay] = useState(0)
  const [trackPhase, setTrackPhase] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<SpeedIndex>(1)
  const speedRef = useRef(speed)
  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  const finished = day >= lastDay

  useEffect(() => {
    if (!playing || finished) return
    let frame = 0
    let previous = performance.now()
    const tick = (now: number) => {
      // Cap the step so a background tab does not jump the mission ahead.
      // The first frame's timestamp can be earlier than `previous`, hence the lower bound.
      const dt = Math.max(0, Math.min(0.1, (now - previous) / 1000))
      previous = now
      setDay((d) => Math.min(lastDay, d + dt * SPEEDS[speedRef.current]))
      setTrackPhase((p) => (p + dt / TRACK_LOOP_SECONDS) % 1)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, finished, lastDay])

  const toggle = useCallback(() => {
    if (finished) {
      setDay(0)
      setPlaying(true)
    } else {
      setPlaying((p) => !p)
    }
  }, [finished])

  const seek = useCallback(
    (target: number) => setDay(Math.max(0, Math.min(lastDay, target))),
    [lastDay],
  )

  return { day, trackPhase, playing: playing && !finished, finished, speed, toggle, setSpeed, seek }
}
