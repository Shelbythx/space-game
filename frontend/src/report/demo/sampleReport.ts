// SAMPLE DATA FOR THE DEMO PAGE ONLY — never used by the game, where the report comes
// from `POST /api/simulate` (D59). Shapes follow docs/api.md; values are made up.

import type { PreviousAttempt, ReportData } from '../types'

/** Mission 1 that reaches its data goal but goes over budget. */
export const sampleReport: ReportData = {
  success: false,
  scores: {
    missionSuccess: { value: 82, formula: '100 × Σ(wᵢ × sᵢ) / Σwᵢ' },
    scienceValue: { value: 100, formula: '100 × min(1, Σ(dataᵢ × valueᵢ) / goal)' },
    resourceEfficiency: { value: 61, formula: 'mean over 6 resources of score(1 − used / limit)' },
    decisionQuality: { value: 55, formula: '100 − 15 × unresolved warnings − 30 × failed checks' },
  },
  limits: [
    { status: 'fail', code: 'check.mission.overBudget', params: { usedK: 541, limitK: 450 } },
    { status: 'ok', code: 'check.mission.launchOnTime', params: { launchMonth: 15, deadlineMonth: 18 } },
  ],
  segments: [
    {
      segment: 'launch',
      status: 'ok',
      chain: [
        { kind: 'decision', code: 'chain.decision.orbit', params: { altitudeKm: 705, inclinationDeg: 98.2 } },
        { kind: 'physics', code: 'chain.physics.orbit', params: { periodMin: 98.8, speedKmS: 7.5 }, formula: 'T = 2π√(r³/μ)' },
      ],
    },
    {
      segment: 'space',
      status: 'warn',
      chain: [
        { kind: 'decision', code: 'chain.decision.battery', params: { capacityWh: 150 } },
        { kind: 'physics', code: 'chain.physics.eclipse', params: { eclipseFraction: 0.36 }, formula: 'f = (1/π)·arccos(…)' },
        { kind: 'physics', code: 'chain.physics.power', params: { generationW: 86.4, consumptionW: 83 }, formula: 'E_gen = P_gen·T·(1 − f)' },
        { kind: 'consequence', code: 'chain.consequence.disposal', params: { disposalYears: 22, limitYears: 25 } },
      ],
    },
    {
      segment: 'ground',
      status: 'ok',
      chain: [
        { kind: 'decision', code: 'chain.decision.radio', params: { rateKbps: 50000 } },
        { kind: 'physics', code: 'chain.physics.linkBudget', params: { distanceKm: 1850, rateKbps: 14600 }, formula: 'rate = R·(1000 km / d)²' },
        { kind: 'physics', code: 'chain.physics.downlink', params: { minutesPerDay: 80, gbPerDay: 30 }, formula: 'data = rate × contact time' },
      ],
    },
    {
      segment: 'user',
      status: 'ok',
      chain: [
        { kind: 'decision', code: 'chain.decision.instrument', params: { dataRateKbps: 40000 } },
        { kind: 'physics', code: 'chain.physics.storage', params: { storageGb: 512, lostGb: 1210 } },
        { kind: 'consequence', code: 'chain.consequence.goal', params: { deliveredGb: 10950, goalGb: 500 } },
      ],
    },
  ],
  bottleneck: { resource: 'budget', code: 'bottleneck.budget', params: { usedK: 541, limitK: 450 } },
  comparison: {
    kind: 'real',
    missionId: 'landsat-9',
    nameCode: 'reference.landsat9',
    deltas: { altitudeKm: 0, inclinationDeg: 0, massKg: -2658, dataGb: -2000 },
    source: { kind: 'nasa', note: 'NASA Science — Landsat 9', url: 'https://science.nasa.gov/mission/landsat-9' },
  },
}

export const samplePrevious: PreviousAttempt = {
  success: false,
  scores: { missionSuccess: 64, scienceValue: 100, resourceEfficiency: 48, decisionQuality: 55 },
}

/** An ISS cargo run: docked late, bottleneck in the docking time, no similar mission yet. */
export const sampleIssReport: ReportData = {
  success: false,
  scores: {
    missionSuccess: { value: 70, formula: '100 × Σ(wᵢ × sᵢ) / Σwᵢ' },
    scienceValue: { value: 84, formula: '100 × min(1, Σ(cargoᵢ × valueᵢ) / goal)' },
    resourceEfficiency: { value: 72, formula: 'mean over 6 resources of score(1 − used / limit)' },
    decisionQuality: { value: 70, formula: '100 − 15 × unresolved warnings − 30 × failed checks' },
  },
  limits: [
    { status: 'ok', code: 'check.mission.withinBudget', params: { usedK: 1251, limitK: 1500 } },
    { status: 'ok', code: 'check.mission.launchOnTime', params: { launchMonth: 17, deadlineMonth: 18 } },
  ],
  segments: [
    {
      segment: 'launch',
      status: 'warn',
      chain: [
        { kind: 'decision', code: 'chain.decision.launchSite', params: { latitudeDeg: 37.8 } },
        { kind: 'physics', code: 'chain.physics.earthRotation', params: { bonusMs: 367 }, formula: '465·cos φ' },
        { kind: 'decision', code: 'chain.decision.insertion', params: { insertionAltitudeKm: 200 } },
        { kind: 'physics', code: 'chain.physics.hohmann', params: { deltaV1ms: 63, deltaV2ms: 63 }, formula: 'Δv₁ = √(μ/r₁)·(√(2r₂/(r₁+r₂)) − 1)' },
      ],
    },
    {
      segment: 'space',
      status: 'ok',
      chain: [
        { kind: 'decision', code: 'chain.decision.propulsion', params: { ispS: 220, propellantKg: 900 } },
        { kind: 'physics', code: 'chain.physics.rocketEquation', params: { deltaVms: 260, propellantKg: 610 }, formula: 'Δv = Isp·g₀·ln(m₀/m₁)' },
      ],
    },
    {
      segment: 'ground',
      status: 'fail',
      chain: [
        { kind: 'decision', code: 'chain.decision.relay', params: { relay: 0 } },
        { kind: 'physics', code: 'chain.physics.phasing', params: { degPerOrbit: 17.1, phasingDays: 4.2 }, formula: 'Δθ = (n₁ − n₂)·T₁' },
        { kind: 'consequence', code: 'chain.consequence.docking', params: { dockedAtHours: 131 } },
      ],
    },
    {
      segment: 'user',
      status: 'ok',
      chain: [{ kind: 'consequence', code: 'chain.consequence.cargoDelivered', params: { cargoKg: 2600, goalKg: 2500 } }],
    },
  ],
  bottleneck: { resource: 'comms', code: 'bottleneck.comms', params: { usedHours: 131, limitHours: 120 } },
  comparison: null,
}
