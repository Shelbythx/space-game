import type {
  Calc,
  Check,
  Design,
  Evaluation,
  GroundStation,
  Instrument,
  Mission,
  Part,
  PartCategory,
  RoleComment,
  Side,
  Source,
} from '../types'

// DEMO STAND-IN for POST /api/evaluate, used only when the mission server is unreachable.
// The game's physics belongs to the backend (D59, task 004); this file only keeps the
// blueprint screen alive offline. Formulas follow docs/development-plan.md §2 in simplified
// form; contact counts, orbit lifetime and disposal Δv are rough estimates. Whether the
// offline demo stays is an open question in docs/decisions.md.

const MU = 398600 // km³/s², NASA Earth Fact Sheet
const R_EARTH = 6378.137 // km, NASA Earth Fact Sheet
const G0 = 9.80665 // m/s², NASA Earth Fact Sheet (CODATA)

const RICKMAN = 'Rickman, NASA NESC TFAWS 2020 (NTRS 20205003902)'
const src = (note: string, kind: Source['kind'] = 'nasa'): Source => ({ kind, note, url: null })

/** Side each part works from (D93). Deployable and roll-out arrays have no side. */
export function expectedSide(key: string, design: Design): Side | null {
  if (key === 'solar') return design.parts.solar === 'solar-body' ? 'sun' : null
  if (key === 'battery' || key === 'computer') return 'inside'
  if (key === 'radio') return 'earth'
  if (key === 'adcs' || key === 'propulsion') return 'space'
  if (key === 'magnetometer') return 'space'
  return 'earth' // instruments look at Earth
}

const round = (v: number, digits = 1) => {
  const k = 10 ** digits
  return Math.round(v * k) / k
}

interface StationPass {
  station: GroundStation
  passes: number
  minutes: number
  distanceKm: number
}

function stationPasses(st: GroundStation, altitudeKm: number, inclinationDeg: number): Omit<StationPass, 'station'> {
  const lat = Math.abs(st.latitudeDeg)
  if (altitudeKm > 30000) return { passes: lat < 70 ? 1 : 0, minutes: lat < 70 ? 1440 : 0, distanceKm: altitudeKm + 2000 }
  if (altitudeKm > 10000) return { passes: 2, minutes: 2 * 300, distanceKm: altitudeKm + 2000 }
  // Low orbit: a station sees the track when its latitude is within reach of the inclination.
  const reach = (inclinationDeg > 90 ? 180 - inclinationDeg : inclinationDeg) + 15
  if (lat > reach) return { passes: 0, minutes: 0, distanceKm: 0 }
  const polar = inclinationDeg > 80
  const passes = polar && lat >= 60 ? 10 : polar ? 4 : lat < 20 ? 5 : 4
  const perPass = 8 * Math.sqrt(altitudeKm / 705) // estimate: ~8 min per pass at 705 km
  return { passes, minutes: passes * perPass, distanceKm: Math.max(1000, 1.6 * altitudeKm) }
}

export function mockEvaluate(design: Design, mission: Mission): Evaluation {
  const cat = mission.catalogs
  const part = (category: PartCategory): Part =>
    cat.parts.find((p) => p.id === design.parts[category]) ?? cat.parts.find((p) => p.category === category)!
  const launch = cat.launches.find((l) => l.id === design.launchId) ?? cat.launches[0]
  const instruments = design.instrumentIds
    .map((id) => cat.instruments.find((i) => i.id === id))
    .filter((i): i is Instrument => Boolean(i))
  const stations = design.groundStationIds
    .map((id) => cat.groundStations.find((s) => s.id === id))
    .filter((s): s is GroundStation => Boolean(s))

  // ---------- orbit (Rickman 2020 p. 92, 104–108, 131–139) ----------
  let orbitId = launch.fixedOrbitId ?? (design.orbit && 'presetId' in design.orbit ? design.orbit.presetId : 'custom')
  let altitudeKm: number
  let inclinationDeg: number
  if (launch.fixedOrbitId || (design.orbit && 'presetId' in design.orbit)) {
    const o = cat.orbits.find((x) => x.id === orbitId) ?? cat.orbits[1]
    altitudeKm = o.altitudeKm
    inclinationDeg = o.inclinationDeg
  } else {
    const custom = design.orbit as { altitudeKm: number; inclinationDeg: number }
    altitudeKm = custom.altitudeKm
    inclinationDeg = custom.inclinationDeg
    orbitId = inclinationDeg > 90 ? 'sso' : altitudeKm > 30000 ? 'geo' : altitudeKm > 10000 ? 'meo' : 'leo'
  }
  const r = R_EARTH + altitudeKm
  const periodMin = (2 * Math.PI * Math.sqrt(r ** 3 / MU)) / 60
  const speedKmS = Math.sqrt(MU / r)
  const eclipseFraction = Math.acos(Math.sqrt(altitudeKm ** 2 + 2 * R_EARTH * altitudeKm) / r) / Math.PI
  const lit = 1 - eclipseFraction

  // ---------- layout (D93) ----------
  const layout: Partial<Record<string, Side>> = {}
  const keys = [...(['solar', 'battery', 'radio', 'computer', 'adcs', 'propulsion'] as const), ...instruments.map((i) => i.id)]
  const checks: Check[] = []
  const comments: RoleComment[] = []
  const simple = design.version === 'simple'
  const say = (c: Omit<RoleComment, 'advice'>, advice: string, params: RoleComment['message']['params'] = {}) =>
    comments.push({ ...c, advice: simple ? { code: advice, params } : null })
  const wrong = new Set<string>()
  for (const key of keys) {
    if (key === 'propulsion' && design.parts.propulsion === 'prop-none') continue
    const expected = expectedSide(key, design)
    if (!expected) continue
    const chosen = (!simple && design.layout?.[key]) || expected
    layout[key] = chosen
    if (chosen !== expected) {
      wrong.add(key)
      checks.push({ segment: 'space', status: 'warn', code: 'check.space.wrongSide', params: { partId: key, side: chosen, expectedSide: expected } })
      say(
        { role: 'designer', severity: 'warn', message: { code: 'comment.designer.wrongSide', params: { partId: key, side: chosen, expectedSide: expected } } },
        'advice.designer.turnPart',
      )
    }
  }

  // ---------- comms & data (plan 2.5–2.7; contact counts are estimates) ----------
  const radio = part('radio')
  const band = radio.specs.band ?? 's'
  const passes: StationPass[] = stations
    .filter((s) => s.bands.includes(band))
    .map((s) => ({ station: s, ...stationPasses(s, altitudeKm, inclinationDeg) }))
  const radioFactor = wrong.has('radio') ? 0.5 : 1
  const contactsPerDay = passes.reduce((a, p) => a + p.passes, 0)
  const contactMinutesPerDay = passes.reduce((a, p) => a + p.minutes, 0) * radioFactor
  const rateKbps = radio.specs.rateKbps ?? 0
  const rateAt = (d: number) => Math.min(rateKbps, rateKbps * (1000 / d) ** 2)
  const downlinkGbPerDay = passes.reduce((a, p) => a + (rateAt(p.distanceKm) * p.minutes * radioFactor * 60) / 8e6, 0)
  const generatedGbPerDay = instruments
    .filter((i) => !wrong.has(i.id))
    .reduce((a, i) => a + (i.dataRateKbps * 86400 * lit) / 8e6, 0)
  const storageGb = part('computer').specs.storageGb ?? 0
  const goalGb = mission.goal.dataGb
  const months = mission.goal.operationMonths
  const expectedTotalGb = Math.min(generatedGbPerDay, downlinkGbPerDay) * 30.4 * months

  // ---------- power (plan 2.4) ----------
  const solar = part('solar')
  const generationW = (solar.specs.powerW ?? 0) * (wrong.has('solar') ? 0.5 : 1)
  const averageGenerationW = generationW * lit
  const prop = part('propulsion')
  const busLoadW = part('computer').consumptionW + part('adcs').consumptionW
  const instrumentsW = instruments.reduce((a, i) => a + i.consumptionW, 0)
  const radioW = radio.consumptionW * (contactMinutesPerDay / 1440)
  const electricW = (prop.specs.powerW ?? 0) * 0.1 // estimate: thruster on 10 % of the time
  const averageConsumptionW = busLoadW + instrumentsW * lit + radioW + electricW
  const powerMarginPct = averageGenerationW > 0 ? ((averageGenerationW - averageConsumptionW) / averageGenerationW) * 100 : -100
  const eclipseLoadW = busLoadW + radioW
  const eclipseNeedWh = (eclipseLoadW * periodMin * eclipseFraction) / 60
  const batteryWh = part('battery').specs.capacityWh ?? 0

  // ---------- propellant (NASA Glenn rocket equation; Δv are estimates) ----------
  const lifetimeYears = altitudeKm < 300 ? 0.2 : altitudeKm < 400 ? 1 : altitudeKm < 500 ? 4 : altitudeKm < 600 ? 15 : altitudeKm < 700 ? 50 : altitudeKm < 800 ? 120 : 1000
  const keepingDv = altitudeKm < 450 ? 25 : altitudeKm < 600 ? 5 : 0
  const disposalDv = lifetimeYears > 25 && altitudeKm < 2000 ? (speedKmS * 1000 * (altitudeKm - 250)) / (4 * r) : 0
  const deltaVms = (keepingDv * months) / 12 + disposalDv
  const capacityKg = prop.specs.propellantKg ?? 0
  const ispS = prop.specs.ispS ?? 0
  const dryKg =
    (['bus', 'solar', 'battery', 'radio', 'computer', 'adcs', 'propulsion'] as const).reduce((a, c) => a + part(c).massKg, 0) +
    instruments.reduce((a, i) => a + i.massKg, 0)
  const neededKg = ispS > 0 ? (dryKg + capacityKg) * (1 - Math.exp(-deltaVms / (ispS * G0))) : 0
  const disposalYears = ispS > 0 && neededKg <= capacityKg ? Math.min(lifetimeYears, 18) : lifetimeYears

  // ---------- mass (D93, Gold Rules Table 1.06-1) ----------
  const bus = part('bus')
  const usedKg = dryKg + capacityKg
  const slots = bus.specs.slots ?? 0
  const slotsUsed = (['solar', 'battery', 'radio', 'computer', 'adcs'] as const).length + (design.parts.propulsion === 'prop-none' ? 0 : 1) + instruments.length
  const recommendedReservePct = mission.limits.massReserveRecommendedPct
  const reservePct = !simple && design.massReservePct != null ? design.massReservePct : recommendedReservePct
  const reserveKg = (usedKg * reservePct) / 100
  const withReserveKg = usedKg + reserveKg
  const launchCapacityKg = launch.capacityKg[orbitId] ?? 0

  // ---------- budget & time (D66) ----------
  const allParts = (['bus', 'solar', 'battery', 'radio', 'computer', 'adcs', 'propulsion'] as const).map(part)
  const usedK =
    allParts.reduce((a, p) => a + p.priceK, 0) +
    instruments.reduce((a, i) => a + i.priceK, 0) +
    stations.reduce((a, s) => a + s.priceK, 0) +
    launch.priceK
  const limitK = mission.limits.budgetK
  const tiers = [...allParts.filter((p) => p.id !== 'prop-none'), ...instruments].map((x) => mission.timing.buildMonths[x.tier])
  const buildMonths = Math.max(...tiers)
  const readyMonth = buildMonths + mission.timing.integrationMonths
  const launchMonth =
    launch.fixedOrbitId && mission.timing.rideshareMonths.length > 0
      ? (mission.timing.rideshareMonths.find((m) => m >= readyMonth) ?? 99)
      : readyMonth + (mission.timing.launchLeadMonths[launch.id] ?? 3)
  const deadlineMonth = mission.limits.launchDeadlineMonth

  // ---------- checks & role comments (codes: docs/api.md «Перелік кодів») ----------
  if (usedK > limitK) {
    checks.push({ segment: 'mission', status: 'fail', code: 'check.mission.overBudget', params: { usedK: round(usedK), limitK } })
    say({ role: 'planner', severity: 'warn', message: { code: 'comment.planner.overBudget', params: { overK: round(usedK - limitK) } } }, 'advice.planner.cheaperLaunchOrParts')
  } else checks.push({ segment: 'mission', status: 'ok', code: 'check.mission.withinBudget', params: { usedK: round(usedK), limitK } })
  if (launchMonth > deadlineMonth) {
    checks.push({ segment: 'mission', status: 'fail', code: 'check.mission.launchLate', params: { launchMonth, deadlineMonth } })
    say({ role: 'planner', severity: 'warn', message: { code: 'comment.planner.launchLate', params: { lateMonths: launchMonth - deadlineMonth } } }, 'advice.planner.simplerParts')
  } else checks.push({ segment: 'mission', status: 'ok', code: 'check.mission.launchOnTime', params: { launchMonth, deadlineMonth } })

  if (launchCapacityKg === 0) checks.push({ segment: 'launch', status: 'fail', code: 'check.launch.orbitUnreachable', params: { launchId: launch.id, orbitId } })
  else if (withReserveKg > launchCapacityKg) checks.push({ segment: 'launch', status: 'fail', code: 'check.launch.overCapacity', params: { massKg: round(withReserveKg), capacityKg: launchCapacityKg } })
  else checks.push({ segment: 'launch', status: 'ok', code: 'check.launch.capacity', params: { massKg: round(withReserveKg), capacityKg: launchCapacityKg } })
  const sizes = ['small', 'medium', 'large']
  if (sizes.indexOf(bus.specs.busSize ?? 'small') > sizes.indexOf(launch.maxBusSize)) {
    checks.push({ segment: 'launch', status: 'fail', code: 'check.launch.busTooLarge', params: { busSize: bus.specs.busSize ?? '', maxBusSize: launch.maxBusSize } })
    say({ role: 'designer', severity: 'warn', message: { code: 'comment.designer.busTooLarge', params: { busSize: bus.specs.busSize ?? '', maxBusSize: launch.maxBusSize } } }, 'advice.designer.smallerBusOrLaunch')
  }

  if (usedKg > (bus.specs.maxMassKg ?? 0)) {
    checks.push({ segment: 'space', status: 'fail', code: 'check.space.busOverMass', params: { massKg: round(usedKg), busMaxKg: bus.specs.maxMassKg ?? 0 } })
    say({ role: 'designer', severity: 'warn', message: { code: 'comment.designer.overMass', params: { massKg: round(usedKg), limitKg: bus.specs.maxMassKg ?? 0 } } }, 'advice.designer.lighterParts')
  }
  if (slotsUsed > slots) {
    checks.push({ segment: 'space', status: 'fail', code: 'check.space.slots', params: { slotsUsed, slots } })
    say({ role: 'designer', severity: 'warn', message: { code: 'comment.designer.noSlots', params: { slotsUsed, slots } } }, 'advice.designer.biggerBus')
  }
  if (reservePct < recommendedReservePct) {
    checks.push({ segment: 'space', status: 'warn', code: 'check.space.massReserveLow', params: { reservePct, recommendedPct: recommendedReservePct } })
    say({ role: 'designer', severity: 'warn', message: { code: 'comment.designer.massReserveLow', params: { reservePct, recommendedPct: recommendedReservePct } } }, 'advice.designer.raiseReserve')
  }
  const marginPct = round(powerMarginPct, 0)
  if (marginPct < 0) {
    checks.push({ segment: 'space', status: 'fail', code: 'check.space.powerDeficit', params: { marginPct } })
    say({ role: 'engineer', severity: 'warn', message: { code: 'comment.engineer.powerMarginLow', params: { marginPct } } }, 'advice.engineer.biggerPanels')
  } else {
    checks.push({ segment: 'space', status: marginPct < 25 ? 'warn' : 'ok', code: 'check.space.powerMargin', params: { marginPct } })
    if (marginPct < 25) say({ role: 'engineer', severity: 'warn', message: { code: 'comment.engineer.powerMarginLow', params: { marginPct } } }, 'advice.engineer.biggerPanels')
  }
  if (eclipseNeedWh > batteryWh * 0.3) {
    checks.push({ segment: 'space', status: 'warn', code: 'check.space.batteryShort', params: { neededWh: round(eclipseNeedWh), capacityWh: batteryWh } })
    say({ role: 'engineer', severity: 'warn', message: { code: 'comment.engineer.batteryShortInEclipse', params: { neededWh: round(eclipseNeedWh), capacityWh: batteryWh } } }, 'advice.engineer.biggerBattery')
  }
  const chosen = [...allParts, ...instruments]
  for (const item of chosen) {
    for (const req of item.requires) {
      if (design.parts[req.category] !== req.partId) {
        checks.push({ segment: 'space', status: 'fail', code: 'check.space.missingRequirement', params: { partId: item.id, requiredPartId: req.partId } })
      }
    }
  }
  if (ispS === 0 && lifetimeYears < months / 12) {
    checks.push({ segment: 'space', status: 'fail', code: 'check.space.orbitDecay', params: { lifetimeYears, operationYears: months / 12 } })
    say({ role: 'engineer', severity: 'warn', message: { code: 'comment.engineer.noPropulsionDecay', params: { lifetimeYears, operationYears: months / 12 } } }, 'advice.engineer.addPropulsion')
  }
  if (ispS > 0 && neededKg > capacityKg) {
    checks.push({ segment: 'space', status: 'warn', code: 'check.space.propellantShort', params: { neededKg: round(neededKg, 2), capacityKg } })
    say({ role: 'engineer', severity: 'warn', message: { code: 'comment.engineer.propellantShort', params: { neededKg: round(neededKg, 2), capacityKg } } }, 'advice.engineer.biggerTankOrHigherIsp')
  } else if (ispS > 0) checks.push({ segment: 'space', status: 'ok', code: 'check.space.propellantMargin', params: { neededKg: round(neededKg, 2), capacityKg } })
  if (disposalYears > 25) {
    checks.push({ segment: 'space', status: 'warn', code: 'check.space.disposalTooLong', params: { disposalYears, limitYears: 25 } })
    say({ role: 'engineer', severity: 'warn', message: { code: 'comment.engineer.disposalTooLong', params: { disposalYears } } }, 'advice.engineer.addPropulsion')
  } else checks.push({ segment: 'space', status: 'ok', code: 'check.space.disposal', params: { disposalYears, limitYears: 25 } })

  if (stations.length === 0) checks.push({ segment: 'ground', status: 'fail', code: 'check.ground.noStation', params: {} })
  for (const s of stations) {
    if (!s.bands.includes(band)) {
      checks.push({ segment: 'ground', status: 'warn', code: 'check.ground.bandMismatch', params: { band, stationId: s.id } })
      say({ role: 'scientist', severity: 'warn', message: { code: 'comment.scientist.bandMismatch', params: { band } } }, 'advice.scientist.matchStationBand')
    }
  }
  if (generatedGbPerDay > downlinkGbPerDay) {
    checks.push({ segment: 'ground', status: 'warn', code: 'check.ground.dataBacklog', params: { generatedGbPerDay: round(generatedGbPerDay), downlinkGbPerDay: round(downlinkGbPerDay) } })
    say({ role: 'scientist', severity: 'warn', message: { code: 'comment.scientist.dataBacklog', params: { generatedGbPerDay: round(generatedGbPerDay), downlinkGbPerDay: round(downlinkGbPerDay) } } }, 'advice.scientist.fasterRadioOrStations')
    if (generatedGbPerDay - downlinkGbPerDay > storageGb) {
      checks.push({ segment: 'ground', status: 'warn', code: 'check.ground.storageOverflow', params: { storageGb, backlogGbPerDay: round(generatedGbPerDay - downlinkGbPerDay) } })
      say({ role: 'engineer', severity: 'info', message: { code: 'comment.engineer.storageSmall', params: { storageGb, backlogGbPerDay: round(generatedGbPerDay - downlinkGbPerDay) } } }, 'advice.engineer.biggerStorage')
    }
  }
  if (expectedTotalGb >= goalGb) checks.push({ segment: 'user', status: 'ok', code: 'check.user.goalReached', params: { expectedGb: round(expectedTotalGb, 0), goalGb } })
  else {
    checks.push({ segment: 'user', status: 'fail', code: 'check.user.goalMissed', params: { expectedGb: round(expectedTotalGb, 0), goalGb } })
    say({ role: 'scientist', severity: 'warn', message: { code: 'comment.scientist.goalMissed', params: { expectedGb: round(expectedTotalGb, 0), goalGb } } }, 'advice.scientist.betterInstrument')
  }

  // ---------- orbit strip & calculation sheets (D94) ----------
  const best = [...passes].sort((a, b) => b.minutes / Math.max(1, b.passes) - a.minutes / Math.max(1, a.passes))[0]
  const passMin = best && best.passes > 0 ? Math.min(periodMin, best.minutes / best.passes) : 0
  const orbitStrip = {
    periodMin: round(periodMin),
    eclipse: eclipseFraction > 0 ? { startMin: round(periodMin * (0.5 - eclipseFraction / 2)), endMin: round(periodMin * (0.5 + eclipseFraction / 2)) } : null,
    contacts: passMin > 0 ? [{ stationId: best.station.id, startMin: round(periodMin * 0.72), endMin: round(Math.min(periodMin, periodMin * 0.72 + passMin)) }] : [],
  }

  const calc: Calc[] = [
    {
      code: 'calc.mass.total', resource: 'mass', formula: 'm = Σ m_i · (1 + reserve)',
      inputs: [{ name: 'Σ m_i', value: round(usedKg), unit: 'kg' }, { name: 'reserve', value: reservePct, unit: '%' }],
      result: { name: 'm', value: round(withReserveKg), unit: 'kg' },
      summary: { code: 'calc.mass.total.summary', params: { usedKg: round(usedKg), reservePct, withReserveKg: round(withReserveKg), capacityKg: launchCapacityKg } },
      source: src('GSFC-STD-1000I, rule 1.06, Table 1.06-1, p. 12'),
    },
    {
      code: 'calc.orbit.period', resource: 'orbit', formula: 'T = 2π·√(r³/μ)',
      inputs: [{ name: 'r', value: round(r), unit: 'km' }, { name: 'μ', value: MU, unit: 'km³/s²' }],
      result: { name: 'T', value: round(periodMin), unit: 'min' },
      summary: { code: 'calc.orbit.period.summary', params: { altitudeKm, periodMin: round(periodMin), speedKmS: round(speedKmS, 2) } },
      source: src(`${RICKMAN}, p. 92`),
    },
    {
      code: 'calc.orbit.eclipse', resource: 'orbit', formula: 'f = (1/π)·arccos(√(h² + 2Rh) / (R + h))',
      inputs: [{ name: 'h', value: altitudeKm, unit: 'km' }, { name: 'R', value: R_EARTH, unit: 'km' }],
      result: { name: 'f', value: round(eclipseFraction, 3), unit: '' },
      summary: { code: 'calc.orbit.eclipse.summary', params: { altitudeKm, eclipsePct: round(eclipseFraction * 100, 0) } },
      source: src(`${RICKMAN}, p. 131–139`),
    },
    {
      code: 'calc.power.balance', resource: 'power', formula: 'P_avg = P · (1 − f)',
      inputs: [{ name: 'P', value: round(generationW), unit: 'W' }, { name: 'f', value: round(eclipseFraction, 3), unit: '' }, { name: 'P_use', value: round(averageConsumptionW), unit: 'W' }],
      result: { name: 'P_avg', value: round(averageGenerationW), unit: 'W' },
      summary: { code: 'calc.power.balance.summary', params: { averageGenerationW: round(averageGenerationW), averageConsumptionW: round(averageConsumptionW), marginPct } },
      source: src('GSFC-STD-1000I, Table 1.06-1 (power margin); balance — calculation', 'calculated'),
    },
    {
      code: 'calc.power.eclipseBattery', resource: 'power', formula: 'E_ecl = P_ecl · T · f',
      inputs: [{ name: 'P_ecl', value: round(eclipseLoadW), unit: 'W' }, { name: 'T', value: round(periodMin), unit: 'min' }, { name: 'f', value: round(eclipseFraction, 3), unit: '' }],
      result: { name: 'E_ecl', value: round(eclipseNeedWh), unit: 'Wh' },
      summary: { code: 'calc.power.eclipseBattery.summary', params: { eclipsePct: round(eclipseFraction * 100, 0), neededWh: round(eclipseNeedWh) } },
      source: src(`${RICKMAN}, p. 131–139 (f)`, 'calculated'),
    },
    {
      code: 'calc.budget.total', resource: 'budget', formula: 'C = Σ c_i',
      inputs: [{ name: 'Σ c_i', value: round(usedK), unit: 'k' }],
      result: { name: 'C', value: round(usedK), unit: 'k' },
      summary: { code: 'calc.budget.total.summary', params: { usedK: round(usedK), limitK } },
      source: src('game prices (D51)', 'estimate'),
    },
    {
      code: 'calc.data.generated', resource: 'data', formula: 'D = Σ rate_i · 86 400 s · (1 − f)',
      inputs: [{ name: 'Σ rate_i', value: instruments.reduce((a, i) => a + i.dataRateKbps, 0), unit: 'kbps' }, { name: 'f', value: round(eclipseFraction, 3), unit: '' }],
      result: { name: 'D', value: round(generatedGbPerDay), unit: 'GB/day' },
      summary: { code: 'calc.data.generated.summary', params: { generatedGbPerDay: round(generatedGbPerDay) } },
      source: src('instrument rates — game estimates (D51)', 'estimate'),
    },
    {
      code: 'calc.data.downlink', resource: 'data', formula: 'rate(d) = min(R, R·(1000 km / d)²)',
      inputs: [{ name: 'R', value: rateKbps, unit: 'kbps' }, { name: 'd', value: round(best?.distanceKm ?? 0, 0), unit: 'km' }, { name: 't', value: round(contactMinutesPerDay), unit: 'min/day' }],
      result: { name: 'D_down', value: round(downlinkGbPerDay), unit: 'GB/day' },
      summary: { code: 'calc.data.downlink.summary', params: { rateKbps, distanceKm: round(best?.distanceKm ?? 0, 0), downlinkGbPerDay: round(downlinkGbPerDay) } },
      source: src('1/d² — no NASA source found (open question, D89)', 'estimate'),
    },
    {
      code: 'calc.comms.contacts', resource: 'comms', formula: 't = Σ passes · t_pass',
      inputs: [{ name: 'passes', value: contactsPerDay, unit: '/day' }],
      result: { name: 't', value: round(contactMinutesPerDay), unit: 'min/day' },
      summary: { code: 'calc.comms.contacts.summary', params: { contactsPerDay, contactMinutesPerDay: round(contactMinutesPerDay) } },
      source: src('NEN Users\' Guide Rev 4, §17 (elevation 5°/10°); pass counts — demo estimate', 'estimate'),
    },
    {
      code: 'calc.time.ready', resource: 'time', formula: 't_ready = max(t_build) + t_integration',
      inputs: [{ name: 'max(t_build)', value: buildMonths, unit: 'mo' }, { name: 't_integration', value: mission.timing.integrationMonths, unit: 'mo' }],
      result: { name: 't_ready', value: readyMonth, unit: 'mo' },
      summary: { code: 'calc.time.ready.summary', params: { buildMonths, integrationMonths: mission.timing.integrationMonths, readyMonth, launchMonth } },
      source: src('D66 — game estimates', 'estimate'),
    },
  ]
  if (ispS > 0) {
    calc.push({
      code: 'calc.propellant.rocketEquation', resource: 'propellant', formula: 'm_p = m₀ · (1 − e^(−Δv / (Isp·g₀)))',
      inputs: [{ name: 'Δv', value: round(deltaVms, 0), unit: 'm/s' }, { name: 'Isp', value: ispS, unit: 's' }, { name: 'm₀', value: round(usedKg), unit: 'kg' }],
      result: { name: 'm_p', value: round(neededKg, 2), unit: 'kg' },
      summary: { code: 'calc.propellant.rocketEquation.summary', params: { deltaVms: round(deltaVms, 0), ispS, neededKg: round(neededKg, 2) } },
      source: src('NASA Glenn, Ideal Rocket Equation'),
    })
  }

  return {
    orbit: { altitudeKm, inclinationDeg, periodMin: round(periodMin), speedKmS: round(speedKmS, 2), eclipseFraction: round(eclipseFraction, 3), lifetimeYears, disposalYears },
    resources: {
      mass: { usedKg: round(usedKg), busMaxKg: bus.specs.maxMassKg ?? 0, launchCapacityKg, slotsUsed, slots, reservePct, reserveKg: round(reserveKg), withReserveKg: round(withReserveKg), recommendedReservePct },
      power: { generationW: round(generationW), averageGenerationW: round(averageGenerationW), averageConsumptionW: round(averageConsumptionW), eclipseNeedWh: round(eclipseNeedWh), batteryWh },
      budget: { usedK: round(usedK), limitK },
      data: { generatedGbPerDay: round(generatedGbPerDay), downlinkGbPerDay: round(downlinkGbPerDay), storageGb, expectedTotalGb: round(expectedTotalGb, 0), goalGb },
      comms: { contactsPerDay, contactMinutesPerDay: round(contactMinutesPerDay) },
      time: { readyMonth, launchMonth, deadlineMonth },
      propellant: { neededKg: round(neededKg, 2), capacityKg, deltaVms: round(deltaVms, 0) },
      cargo: null,
    },
    rendezvous: null,
    layout,
    orbitStrip,
    calc,
    checks,
    comments,
  }
}
