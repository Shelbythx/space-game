import type { Calc, Check, Design, Evaluation, Mission, PartCategory, RoleComment, Source } from '../types'

// DEMO STAND-IN for POST /api/evaluate of the ISS mission, used only when the mission server
// is unreachable (task 024). The game's physics belongs to the backend (D59): this mirrors
// backend/src/SpaceGame.Api/Simulation/Evaluator.cs in simplified form (plan 2.9–2.10) so the
// ISS screens can be explored offline under the «Demo calculation» banner. Contact counts
// without the relay are rough estimates.

const MU = 398600 // km³/s², NASA Earth Fact Sheet
const R_EARTH = 6378.137 // km, NASA Earth Fact Sheet
const G0 = 9.80665 // m/s²
const APPROACH_DVMS = 20 // as Evaluator.ApproachDeltaVms (game estimate)
const DEORBIT_DVMS = 100 // as Evaluator.ShipDeorbitDeltaVms (game estimate)
const DV_RESERVE = 0.1 // as Evaluator.ShipDeltaVReserve (game estimate)
const APPROACH_DAYS = 0.25 // as Evaluator.ApproachDays (game estimate)
const RELAY_PRICE_K = 100 // as Evaluator.RelayPriceK
const CATEGORIES: PartCategory[] = ['bus', 'solar', 'battery', 'radio', 'computer', 'adcs', 'propulsion']
const BUS_RANK = { small: 0, medium: 1, large: 2 } as const

const round = (v: number, digits = 1) => Math.round(v * 10 ** digits) / 10 ** digits
const demo: Source = { kind: 'estimate', note: 'демо-розрахунок без сервера', url: null }

export function mockEvaluateIss(design: Design, mission: Mission): Evaluation {
  const cat = mission.catalogs
  const part = (c: PartCategory) => cat.parts.find((p) => p.id === design.parts[c]) ?? cat.parts.find((p) => p.category === c)!
  const parts = CATEGORIES.map(part)
  const launch = cat.launches.find((l) => l.id === design.launchId) ?? cat.launches[0]
  const iss = cat.orbits[0]
  const site = cat.launchSites.find((s) => s.id === design.launchSiteId) ?? cat.launchSites[0]
  const stations = design.groundStationIds.map((id) => cat.groundStations.find((s) => s.id === id)).filter((s) => s !== undefined)
  const relay = Boolean(design.relay)
  const simple = design.version === 'simple'
  const checks: Check[] = []
  const comments: RoleComment[] = []
  const check = (segment: Check['segment'], status: Check['status'], code: string, params: Check['params'] = {}) =>
    checks.push({ segment, status, code, params })
  const say = (role: RoleComment['role'], code: string, advice: string, params: Check['params'] = {}, severity: RoleComment['severity'] = 'warn') =>
    comments.push({ role, severity, message: { code, params }, advice: simple ? { code: advice, params: {} } : null })

  // ---------- orbit and the way up (Rickman 2020; plan 2.9, 2.10) ----------
  const r2 = R_EARTH + iss.altitudeKm
  const periodMin = (2 * Math.PI * Math.sqrt(r2 ** 3 / MU)) / 60
  const speedKmS = Math.sqrt(MU / r2)
  const eclipseFraction = Math.acos(Math.sqrt(iss.altitudeKm ** 2 + 2 * R_EARTH * iss.altitudeKm) / r2) / Math.PI
  const lit = 1 - eclipseFraction

  const insertionKm = design.insertionAltitudeKm ?? 200
  const r1 = R_EARTH + insertionKm
  const dv1 = Math.sqrt(MU / r1) * (Math.sqrt((2 * r2) / (r1 + r2)) - 1)
  const dv2 = Math.sqrt(MU / r2) * (1 - Math.sqrt((2 * r1) / (r1 + r2)))
  const hohmannMs = (dv1 + dv2) * 1000
  const planeChangeDeg = Math.max(0, Math.abs(site.latitudeDeg) - iss.inclinationDeg)
  const planeChangeMs = 2 * Math.sqrt(MU / r1) * Math.sin((planeChangeDeg * Math.PI) / 360) * 1000
  const n1 = Math.sqrt(MU / r1 ** 3)
  const n2 = Math.sqrt(MU / r2 ** 3)
  const t1 = (2 * Math.PI) / n1
  const degPerOrbit = ((n1 - n2) * t1 * 180) / Math.PI
  const phasingDays = degPerOrbit > 0 ? ((360 / degPerOrbit) * t1) / 86400 : 99
  const transferDays = (Math.PI * Math.sqrt(((r1 + r2) / 2) ** 3 / MU)) / 86400
  const deltaVms = (hohmannMs + planeChangeMs + APPROACH_DVMS + DEORBIT_DVMS) * (1 + DV_RESERVE)

  // ---------- mass and propellant (D93; NASA Glenn rocket equation) ----------
  const prop = part('propulsion')
  const dryKg = parts.reduce((a, p) => a + p.massKg, 0)
  const tankKg = prop.specs.propellantKg ?? 0
  const cargoKg = (design.cargo ?? []).reduce((a, c) => a + c.massKg, 0)
  const usedKg = dryKg + tankKg + cargoKg
  const recommendedReservePct = mission.limits.massReserveRecommendedPct
  const reservePct = !simple && design.massReservePct != null ? design.massReservePct : recommendedReservePct
  const reserveKg = (dryKg * reservePct) / 100
  const withReserveKg = usedKg + reserveKg
  const capacityKg = launch.capacityKg.iss ?? 0
  const ispS = prop.specs.ispS ?? 0
  const neededKg = ispS > 0 ? usedKg * (1 - Math.exp(-deltaVms / (ispS * G0))) : Infinity
  const bus = part('bus')
  const busMaxKg = bus.specs.maxMassKg ?? Infinity

  // ---------- comms (relay: continuous; ground stations: estimate) ----------
  const band = part('radio').specs.band ?? 's'
  const matched = stations.filter((s) => s.bands.includes(band))
  const contactsPerDay = relay ? 1 : matched.length * 4
  const contactMinutesPerDay = relay ? 1440 : matched.length * 24
  const waitHours = relay ? 0 : contactsPerDay > 0 ? 24 / contactsPerDay / 2 : 24
  const dockingDays = transferDays + phasingDays + APPROACH_DAYS + waitHours / 24
  const deadlineDays = mission.goal.dockingDeadlineDays ?? 5

  // ---------- power (plan 2.4) ----------
  const generationW = part('solar').specs.powerW ?? 0
  const averageGenerationW = generationW * lit
  const busLoadW = part('computer').consumptionW + part('adcs').consumptionW
  const radioW = part('radio').consumptionW * Math.min(1, contactMinutesPerDay / 1440)
  const averageConsumptionW = busLoadW + radioW
  const marginPct = averageGenerationW > 0 ? round(((averageGenerationW - averageConsumptionW) / averageGenerationW) * 100, 0) : -100
  const eclipseNeedWh = ((busLoadW + radioW) * periodMin * eclipseFraction) / 60
  const batteryWh = part('battery').specs.capacityWh ?? 0

  // ---------- budget and time (D66) ----------
  const stationsK = relay ? 0 : stations.reduce((a, s) => a + s.priceK, 0)
  const usedK = parts.reduce((a, p) => a + p.priceK, 0) + stationsK + launch.priceK + (relay ? RELAY_PRICE_K : 0)
  const limitK = mission.limits.budgetK
  const readyMonth = Math.max(...parts.map((p) => mission.timing.buildMonths[p.tier])) + mission.timing.integrationMonths
  const launchMonth = readyMonth + (mission.timing.launchLeadMonths[launch.id] ?? 5)
  const deadlineMonth = mission.limits.launchDeadlineMonth

  // ---------- cargo ----------
  const valueOf = (id: string) => cat.cargoCategories.find((c) => c.id === id)?.value
  const scienceKg = (design.cargo ?? []).filter((c) => ['high', 'highest'].includes(valueOf(c.categoryId) ?? '')).reduce((a, c) => a + c.massKg, 0)
  const sciencePct = cargoKg > 0 ? round((scienceKg / cargoKg) * 100, 1) : 0
  const goalKg = mission.goal.cargoKg ?? 0
  const scienceMinPct = mission.goal.scienceCargoMinPct ?? 0

  // ---------- checks and role comments (codes: docs/api.md) ----------
  if (usedK > limitK) {
    check('mission', 'fail', 'check.mission.overBudget', { usedK: round(usedK), limitK })
    say('planner', 'comment.planner.overBudget', 'advice.planner.cheaperLaunchOrParts', { overK: round(usedK - limitK) })
  } else check('mission', 'ok', 'check.mission.withinBudget', { usedK: round(usedK), limitK })
  if (launchMonth > deadlineMonth) {
    check('mission', 'fail', 'check.mission.launchLate', { launchMonth, deadlineMonth })
    say('planner', 'comment.planner.launchLate', 'advice.planner.simplerParts', { lateMonths: launchMonth - deadlineMonth })
  } else check('mission', 'ok', 'check.mission.launchOnTime', { launchMonth, deadlineMonth })

  if (withReserveKg > capacityKg) {
    check('launch', 'fail', 'check.launch.overCapacity', { massKg: round(withReserveKg), capacityKg })
    say('designer', 'comment.designer.overMass', 'advice.designer.lighterParts', { massKg: round(withReserveKg), limitKg: capacityKg })
  } else check('launch', 'ok', 'check.launch.capacity', { massKg: round(withReserveKg), capacityKg })
  const busSize = bus.specs.busSize ?? 'small'
  if (BUS_RANK[busSize] > BUS_RANK[launch.maxBusSize]) {
    check('launch', 'fail', 'check.launch.busTooLarge', { busSize, maxBusSize: launch.maxBusSize })
    say('designer', 'comment.designer.busTooLarge', 'advice.designer.smallerBusOrLaunch', { busSize, maxBusSize: launch.maxBusSize })
  }
  check('launch', planeChangeMs > 0 ? 'warn' : 'ok', 'check.launch.siteInclination', {
    latitudeDeg: site.latitudeDeg,
    targetInclinationDeg: iss.inclinationDeg,
    planeChangeDeltaVms: round(planeChangeMs, 0),
  })
  if (planeChangeMs > 0)
    say('planner', 'comment.planner.launchSiteLatitude', 'advice.planner.lowerLatitudeSite', {
      latitudeDeg: site.latitudeDeg,
      planeChangeDeltaVms: round(planeChangeMs, 0),
    })

  if (usedKg > busMaxKg) {
    check('space', 'fail', 'check.space.busOverMass', { massKg: round(usedKg), busMaxKg })
    say('designer', 'comment.designer.overMass', 'advice.designer.lighterParts', { massKg: round(usedKg), limitKg: busMaxKg })
  }
  if (marginPct < 0) {
    check('space', 'fail', 'check.space.powerDeficit', { marginPct })
    say('engineer', 'comment.engineer.powerMarginLow', 'advice.engineer.biggerPanels', { marginPct })
  } else check('space', marginPct < 25 ? 'warn' : 'ok', 'check.space.powerMargin', { marginPct })
  if (eclipseNeedWh > batteryWh * 0.7) {
    check('space', 'warn', 'check.space.batteryShort', { neededWh: round(eclipseNeedWh), capacityWh: batteryWh })
    say('engineer', 'comment.engineer.batteryShortInEclipse', 'advice.engineer.biggerBattery', { neededWh: round(eclipseNeedWh), capacityWh: batteryWh })
  }
  if (neededKg > tankKg) {
    check('space', 'fail', 'check.space.propellantShort', { neededKg: round(neededKg), capacityKg: tankKg })
    say('engineer', 'comment.engineer.propellantShort', 'advice.engineer.biggerTankOrHigherIsp', { neededKg: round(neededKg), capacityKg: tankKg })
    say('designer', 'comment.designer.propellantMass', 'advice.designer.lowerInsertion', { propellantKg: round(neededKg), capacityKg: tankKg })
  } else check('space', neededKg > 0.9 * tankKg ? 'warn' : 'ok', 'check.space.propellantMargin', { neededKg: round(neededKg), capacityKg: tankKg })

  if (relay) {
    check('ground', 'ok', 'check.ground.relay', { priceK: RELAY_PRICE_K })
    say('planner', 'comment.planner.relayCost', 'advice.planner.groundOnly', { priceK: RELAY_PRICE_K }, 'info')
  } else if (stations.length === 0) check('ground', 'fail', 'check.ground.noStation')
  else {
    for (const s of stations.filter((x) => !x.bands.includes(band))) check('ground', 'warn', 'check.ground.bandMismatch', { band, stationId: s.id })
    if (waitHours > 0) check('ground', 'warn', 'check.ground.dockingWaitsForContact', { waitHours: round(waitHours) })
  }

  if (cargoKg >= goalKg) check('user', 'ok', 'check.user.cargoDelivered', { cargoKg: round(cargoKg), goalKg })
  else check('user', 'fail', 'check.user.cargoShort', { cargoKg: round(cargoKg), goalKg })
  if (sciencePct < scienceMinPct) {
    check('user', 'warn', 'check.user.scienceShareLow', { sciencePct, scienceMinPct })
    say('scientist', 'comment.scientist.scienceCargoLow', 'advice.scientist.moreScienceCargo', { sciencePct, scienceMinPct })
  }
  if (dockingDays > deadlineDays) check('user', 'fail', 'check.user.dockingLate', { dockingDays: round(dockingDays), deadlineDays })

  // ---------- calculation sheets (summary lines only in the demo) ----------
  const sheet = (code: string, resource: Calc['resource'], formula: string, result: number, unit: string, params: Calc['summary']['params']): Calc => ({
    code,
    resource,
    formula,
    inputs: [],
    result: { name: '=', value: round(result), unit },
    summary: { code: `${code}.summary`, params },
    source: demo,
  })
  const calc: Calc[] = [
    sheet('calc.mass.total', 'mass', 'm = m_dry·(1 + reserve) + m_fuel + m_cargo', withReserveKg, 'kg', {
      usedKg: round(usedKg),
      reservePct,
      withReserveKg: round(withReserveKg),
      capacityKg,
    }),
    sheet('calc.power.balance', 'power', 'P_avg = P_gen·(1 − f)', averageGenerationW, 'W', {
      averageGenerationW: round(averageGenerationW),
      averageConsumptionW: round(averageConsumptionW),
      marginPct,
    }),
    sheet('calc.budget.total', 'budget', 'Σ prices', usedK, 'k', { usedK: round(usedK), limitK }),
    sheet('calc.time.ready', 'time', 'ready = max(build) + integration', readyMonth, 'month', {
      buildMonths: readyMonth - mission.timing.integrationMonths,
      integrationMonths: mission.timing.integrationMonths,
      readyMonth,
      launchMonth,
    }),
    sheet('calc.rendezvous.hohmann', 'rendezvous', 'Δv₁ + Δv₂ (Hohmann)', hohmannMs, 'm/s', { fromKm: insertionKm, toKm: iss.altitudeKm, deltaVms: round(hohmannMs, 0) }),
    sheet('calc.rendezvous.phasing', 'rendezvous', 'Δθ = (n₁ − n₂)·T₁', phasingDays, 'days', { degPerOrbit: round(degPerOrbit), phasingDays: round(phasingDays) }),
    sheet('calc.rendezvous.planeChange', 'rendezvous', 'Δv = 2v·sin(Δi/2)', planeChangeMs, 'm/s', {
      deltaInclinationDeg: round(planeChangeDeg),
      deltaVms: round(planeChangeMs, 0),
    }),
    sheet('calc.propellant.rocketEquation', 'propellant', 'Δv = Isp·g₀·ln(m₀/m₁)', neededKg, 'kg', {
      deltaVms: round(deltaVms, 0),
      ispS,
      neededKg: round(neededKg),
    }),
  ]

  const eclipseMin = periodMin * eclipseFraction
  return {
    orbit: { altitudeKm: iss.altitudeKm, inclinationDeg: iss.inclinationDeg, periodMin: round(periodMin), speedKmS: round(speedKmS, 2), eclipseFraction: round(eclipseFraction, 3), lifetimeYears: null, disposalYears: null },
    resources: {
      mass: {
        usedKg: round(usedKg),
        busMaxKg,
        launchCapacityKg: capacityKg,
        slotsUsed: parts.filter((p) => p.category !== 'bus' && p.massKg > 0).length,
        slots: bus.specs.slots ?? 0,
        reservePct,
        reserveKg: round(reserveKg),
        withReserveKg: round(withReserveKg),
        recommendedReservePct,
      },
      power: { generationW, averageGenerationW: round(averageGenerationW), averageConsumptionW: round(averageConsumptionW), eclipseNeedWh: round(eclipseNeedWh), batteryWh },
      budget: { usedK: round(usedK), limitK },
      data: null,
      comms: { contactsPerDay, contactMinutesPerDay },
      time: { readyMonth, launchMonth, deadlineMonth },
      propellant: { neededKg: round(neededKg), capacityKg: tankKg, deltaVms: round(deltaVms, 0) },
      cargo: { loadedKg: round(cargoKg), scienceKg: round(scienceKg), sciencePct, goalKg, scienceMinPct },
    },
    rendezvous: { hohmannDeltaVms: round(hohmannMs), phasingDays: round(phasingDays, 2), planeChangeDeltaVms: round(planeChangeMs) },
    layout: { solar: 'sun', battery: 'inside', radio: 'earth', computer: 'inside', adcs: 'space', propulsion: 'space' },
    orbitStrip: {
      periodMin: round(periodMin),
      eclipse: { startMin: round((periodMin - eclipseMin) / 2), endMin: round((periodMin + eclipseMin) / 2) },
      contacts: relay
        ? [{ stationId: 'tdrs', startMin: 0, endMin: round(periodMin) }]
        : matched.slice(0, 1).map((s) => ({ stationId: s.id, startMin: round(periodMin * 0.7), endMin: round(periodMin * 0.7 + 6) })),
    },
    calc,
    checks,
    comments,
  }
}
