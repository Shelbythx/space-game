// SAMPLE DATA FOR THE DEMO PAGE ONLY — never used by the game, where the profile comes
// from `simulate.rendezvous` (D59). Shape follows docs/api.md; values are made up.

import type { RendezvousProfile } from '../../flight/types'

function profile(initial: number, degPerHour: number, startTransfer: number, dockAt: number | null, end: number): RendezvousProfile {
  const hours: number[] = []
  const phase: number[] = []
  const altitude: number[] = []
  const fuel: number[] = []
  let angle = initial
  let tank = 900
  for (let h = 0; h <= end; h++) {
    hours.push(h)
    if (h < startTransfer) {
      phase.push(Math.round(angle * 100) / 100)
      altitude.push(200)
      angle = (angle - degPerHour + 360) % 360
    } else if (h === startTransfer) {
      phase.push(Math.round(angle * 100) / 100)
      altitude.push(309)
      tank -= 120
    } else {
      phase.push(0)
      altitude.push(418)
      if (h === startTransfer + 1) tank -= 118
    }
    if (dockAt !== null && h === dockAt) tank -= 25
    fuel.push(tank)
  }
  return {
    initialPhaseAngleDeg: initial,
    stepHours: 1,
    hours,
    phaseAngleDeg: phase,
    altitudeKm: altitude,
    propellantKg: fuel,
    dockedAtHours: dockAt,
  }
}

/** Docks on day 2. */
export const sampleDocked = profile(140, 10.6, 13, 51, 51)

/** Starts far behind, docks late (after a 5-day deadline). */
export const sampleLate = profile(350, 3.2, 108, 131, 131)
