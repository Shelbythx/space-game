import type { Design, Instrument, Launch, Mission, MissionSummary, Orbit, Part, Source } from '../types'

// Demo copies of GET /api/missions/sat-orbit and cubesat-learn (contract v2.1), used only when the backend is
// unreachable. Mirrors backend/src/SpaceGame.Api/Catalogs/MissionData.cs (task 003 + 029:
// SOA 2026 numbers); keep the two in step. The real catalog always comes from the backend.

const nasa = (note: string): Source => ({ kind: 'nasa', note, url: null })
const estimate = (note: string | null = null): Source => ({ kind: 'estimate', note, url: null })

const orbits: Orbit[] = [
  { id: 'leo', nameCode: 'orbit.leo', altitudeKm: 500, inclinationDeg: 45, epochDate: null, source: estimate('висота й нахил — оцінка') },
  { id: 'sso', nameCode: 'orbit.sso', altitudeKm: 705, inclinationDeg: 98.2, epochDate: null, source: nasa('Catalog of Earth Satellite Orbits; Rickman 2020, с. 108') },
  { id: 'meo', nameCode: 'orbit.meo', altitudeKm: 20200, inclinationDeg: 55, epochDate: null, source: nasa('Catalog of Earth Satellite Orbits') },
  { id: 'geo', nameCode: 'orbit.geo', altitudeKm: 35786, inclinationDeg: 0, epochDate: null, source: nasa('Catalog of Earth Satellite Orbits') },
]

const launches: Launch[] = [
  { id: 'rideshare', nameCode: 'launch.rideshare', priceK: 60, capacityKg: { sso: 200 }, fixedOrbitId: 'sso', maxBusSize: 'medium', source: estimate() },
  { id: 'small', nameCode: 'launch.small', priceK: 250, capacityKg: { leo: 450, sso: 300 }, fixedOrbitId: null, maxBusSize: 'large', source: nasa('Pegasus XL, до 453,59 кг на низьку орбіту; решта — оцінка') },
  { id: 'medium', nameCode: 'launch.medium', priceK: 800, capacityKg: { leo: 8000, sso: 6000, meo: 2500, geo: 1500 }, fixedOrbitId: null, maxBusSize: 'large', source: estimate() },
]

const soa = (table: string, page: number, product: string) => nasa(`SOA 2026, табл. ${table}, с. ${page}: ${product}`)

const parts: Part[] = [
  { id: 'bus-s', category: 'bus', tier: 'basic', nameCode: 'part.busS', massKg: 3, priceK: 5, consumptionW: 0, specs: { maxMassKg: 12, slots: 6, dragAreaM2: 0.06, busSize: 'small' }, requires: [], source: estimate() },
  { id: 'bus-m', category: 'bus', tier: 'medium', nameCode: 'part.busM', massKg: 25, priceK: 40, consumptionW: 0, specs: { maxMassKg: 150, slots: 12, dragAreaM2: 0.36, busSize: 'medium' }, requires: [], source: estimate() },
  { id: 'bus-l', category: 'bus', tier: 'best', nameCode: 'part.busL', massKg: 120, priceK: 150, consumptionW: 0, specs: { maxMassKg: 500, slots: 20, dragAreaM2: 1.5, busSize: 'large' }, requires: [], source: estimate() },

  { id: 'solar-body', category: 'solar', tier: 'basic', nameCode: 'part.solarBody', massKg: 0.26, priceK: 2, consumptionW: 0, specs: { powerW: 19.2 }, requires: [], source: soa('3-2', 35, 'NPC Spacemind SP6X') },
  { id: 'solar-deploy', category: 'solar', tier: 'medium', nameCode: 'part.solarDeploy', massKg: 4.4, priceK: 15, consumptionW: 0, specs: { powerW: 135 }, requires: [], source: soa('3-2', 35, 'Pumpkin Dual Articulated Deployable Solar Array') },
  { id: 'solar-roll', category: 'solar', tier: 'best', nameCode: 'part.solarRoll', massKg: 10, priceK: 60, consumptionW: 0, specs: { powerW: 1000 }, requires: [], source: soa('3-2', 35, 'Redwire ROSA') },

  { id: 'bat-s', category: 'battery', tier: 'basic', nameCode: 'part.batS', massKg: 0.24, priceK: 1, consumptionW: 0, specs: { capacityWh: 40 }, requires: [], source: soa('3-5', 44, 'GomSpace NanoPower BP4, 168,8 Вт·год/кг') },
  { id: 'bat-m', category: 'battery', tier: 'medium', nameCode: 'part.batM', massKg: 1.04, priceK: 6, consumptionW: 0, specs: { capacityWh: 150 }, requires: [], source: soa('3-5', 44, 'Astro Digital Direct Energy Pack, 144 Вт·год/кг') },
  { id: 'bat-l', category: 'battery', tier: 'best', nameCode: 'part.batL', massKg: 5.6, priceK: 30, consumptionW: 0, specs: { capacityWh: 1000 }, requires: [], source: soa('3-5', 44, 'EnduroSat EPS IV, 178,1 Вт·год/кг') },

  { id: 'radio-uhf', category: 'radio', tier: 'basic', nameCode: 'part.radioUhf', massKg: 0.025, priceK: 1, consumptionW: 4, specs: { rateKbps: 38.4, band: 'uhf' }, requires: [], source: soa('9-3', 260, 'GomSpace NanoCom AX100') },
  { id: 'radio-s', category: 'radio', tier: 'medium', nameCode: 'part.radioS', massKg: 0.34, priceK: 8, consumptionW: 12, specs: { rateKbps: 3000, band: 's' }, requires: [], source: soa('9-3', 263, 'EnduroSat S-Band Transceiver III') },
  { id: 'radio-x', category: 'radio', tier: 'best', nameCode: 'part.radioX', massKg: 0.13, priceK: 25, consumptionW: 20, specs: { rateKbps: 50000, band: 'x' }, requires: [{ category: 'adcs', partId: 'adcs-fine' }], source: soa('9-3', 265, 'AAC Clyde Space PULSAR-DATA XTX') },

  { id: 'cpu-basic', category: 'computer', tier: 'basic', nameCode: 'part.cpuBasic', massKg: 0.1, priceK: 2, consumptionW: 0.4, specs: { storageGb: 32 }, requires: [], source: soa('8-4', 229, 'AAC Clyde Space Kryten-M3') },
  { id: 'cpu-power', category: 'computer', tier: 'best', nameCode: 'part.cpuPower', massKg: 0.8, priceK: 20, consumptionW: 30, specs: { storageGb: 512 }, requires: [], source: soa('8-4', 235, 'Unibap iX10-100A') },

  { id: 'adcs-basic', category: 'adcs', tier: 'basic', nameCode: 'part.adcsBasic', massKg: 0.47, priceK: 10, consumptionW: 3, specs: { accuracyDeg: 1 }, requires: [], source: soa('5-2', 142, 'AAC Clyde Space iADCS-200') },
  { id: 'adcs-fine', category: 'adcs', tier: 'best', nameCode: 'part.adcsFine', massKg: 1.813, priceK: 45, consumptionW: 8, specs: { accuracyDeg: 0.003 }, requires: [], source: soa('5-2', 142, 'Blue Canyon XACT-100') },

  { id: 'prop-none', category: 'propulsion', tier: 'basic', nameCode: 'part.propNone', massKg: 0, priceK: 0, consumptionW: 0, specs: { ispS: 0, thrustN: 0, propellantKg: 0, powerW: 0 }, requires: [], source: estimate() },
  { id: 'prop-cold', category: 'propulsion', tier: 'basic', nameCode: 'part.propCold', massKg: 0.78, priceK: 15, consumptionW: 0, specs: { ispS: 40, thrustN: 0.08, propellantKg: 0.47, powerW: 0 }, requires: [], source: soa('4-5', 109, 'VACCO C-POD') },
  { id: 'prop-chem', category: 'propulsion', tier: 'medium', nameCode: 'part.propChem', massKg: 8.6, priceK: 40, consumptionW: 0, specs: { ispS: 200, thrustN: 4, propellantKg: 6.1, powerW: 0 }, requires: [], source: soa('4-3', 107, 'VACCO Integrated Propulsion System') },
  { id: 'prop-elec', category: 'propulsion', tier: 'best', nameCode: 'part.propElec', massKg: 1.25, priceK: 70, consumptionW: 0, specs: { ispS: 1960, thrustN: 0.001, propellantKg: 1.65, powerW: 70 }, requires: [], source: soa('4-9', 113, 'Busek BIT-3') },
]

const needsPointing = [{ category: 'computer' as const, partId: 'cpu-power' }, { category: 'adcs' as const, partId: 'adcs-fine' }]

const instruments: Instrument[] = [
  { id: 'magnetometer', nameCode: 'instrument.magnetometer', tier: 'basic', massKg: 0.2, priceK: 5, consumptionW: 1, dataRateKbps: 1, value: 'low', requires: [], source: estimate() },
  { id: 'radiometer', nameCode: 'instrument.radiometer', tier: 'medium', massKg: 1, priceK: 30, consumptionW: 3, dataRateKbps: 20, value: 'medium', requires: [], source: estimate() },
  { id: 'camera', nameCode: 'instrument.camera', tier: 'best', massKg: 12, priceK: 80, consumptionW: 25, dataRateKbps: 40000, value: 'high', requires: needsPointing, source: nasa('роздільність і смуга — OLI, Landsat; решта — оцінка') },
  { id: 'radar', nameCode: 'instrument.radar', tier: 'best', massKg: 60, priceK: 200, consumptionW: 300, dataRateKbps: 200000, value: 'highest', requires: needsPointing, source: estimate() },
]

const base: Omit<Design, 'version'> = {
  missionId: 'sat-orbit',
  orbit: { presetId: 'sso' },
  launchId: 'small',
  parts: { bus: 'bus-m', solar: 'solar-deploy', battery: 'bat-m', radio: 'radio-s', computer: 'cpu-basic', adcs: 'adcs-basic', propulsion: 'prop-none' },
  instrumentIds: ['radiometer'],
  groundStationIds: ['fairbanks'],
}

export const mockMission: Mission = {
  id: 'sat-orbit',
  kind: 'orbit',
  titleCode: 'mission.satOrbit.title',
  briefingCode: 'mission.satOrbit.briefing',
  goal: { dataGb: 500, operationMonths: 12 },
  limits: { budgetK: 450, launchDeadlineMonth: 18, massReserveRecommendedPct: 15 },
  timing: {
    buildMonths: { basic: 3, medium: 5, best: 8 },
    integrationMonths: 4,
    rideshareMonths: [9, 21],
    launchLeadMonths: { small: 3, medium: 5 },
  },
  catalogs: {
    orbits,
    launches,
    parts,
    instruments,
    groundStations: [
      { id: 'fairbanks', nameCode: 'station.fairbanks', latitudeDeg: 64.86, longitudeDeg: -147.85, bands: ['uhf', 's', 'x'], priceK: 30, source: estimate('координати — географія; діапазони й ціна — оцінка') },
      { id: 'white-sands', nameCode: 'station.whiteSands', latitudeDeg: 32.5, longitudeDeg: -106.61, bands: ['s', 'x'], priceK: 20, source: estimate('координати — географія; діапазони й ціна — оцінка') },
      { id: 'guam', nameCode: 'station.guam', latitudeDeg: 13.59, longitudeDeg: 144.84, bands: ['s', 'x'], priceK: 20, source: estimate('координати — географія; діапазони й ціна — оцінка') },
    ],
    launchSites: [],
    cargoCategories: [],
  },
  // Same two presets as the backend (MissionData.cs).
  presets: [
    {
      id: 'radiometer-rideshare',
      nameCode: 'preset.satOrbit.radiometerRideshare',
      design: {
        ...base,
        version: 'simple',
        launchId: 'rideshare',
        parts: { bus: 'bus-s', solar: 'solar-body', battery: 'bat-s', radio: 'radio-s', computer: 'cpu-basic', adcs: 'adcs-basic', propulsion: 'prop-none' },
      },
    },
    {
      id: 'camera-small',
      nameCode: 'preset.satOrbit.cameraSmall',
      design: {
        ...base,
        version: 'simple',
        parts: { bus: 'bus-m', solar: 'solar-deploy', battery: 'bat-m', radio: 'radio-x', computer: 'cpu-power', adcs: 'adcs-fine', propulsion: 'prop-chem' },
        instrumentIds: ['camera'],
      },
    },
  ],
}

// ---------- Training mission «First CubeSat» (task 018 estimates in MissionData.cs) ----------

const cubesatPart = (id: string, tier?: Part['tier']): Part => {
  const p = parts.find((x) => x.id === id)
  if (!p) throw new Error(`demo catalog: no part ${id}`)
  return tier ? { ...p, tier } : p
}

const cubesatBase: Omit<Design, 'version'> = {
  missionId: 'cubesat-learn',
  orbit: { presetId: 'iss-deploy' },
  launchId: 'iss-deploy',
  parts: { bus: 'bus-s', solar: 'solar-body', battery: 'bat-s', radio: 'radio-uhf', computer: 'cpu-basic', adcs: 'adcs-basic', propulsion: 'prop-none' },
  instrumentIds: ['magnetometer'],
  groundStationIds: ['fairbanks'],
}

/** Demo copy of GET /api/missions/cubesat-learn: a small satellite released from the ISS. */
export const mockCubesat: Mission = {
  id: 'cubesat-learn',
  kind: 'tutorial',
  titleCode: 'mission.cubesatLearn.title',
  briefingCode: 'mission.cubesatLearn.briefing',
  goal: { dataGb: 2, operationMonths: 6 },
  limits: { budgetK: 150, launchDeadlineMonth: 12, massReserveRecommendedPct: 15 },
  timing: {
    buildMonths: { basic: 3, medium: 5, best: 8 },
    integrationMonths: 2,
    rideshareMonths: [6, 12],
    launchLeadMonths: {},
  },
  catalogs: {
    orbits: [
      { id: 'iss-deploy', nameCode: 'orbit.issDeploy', altitudeKm: 415, inclinationDeg: 51.64, epochDate: null, source: estimate('виведення з МКС: висота й нахил орбіти станції — оцінка до задачі 018') },
    ],
    launches: [
      { id: 'iss-deploy', nameCode: 'launch.issDeploy', priceK: 40, capacityKg: { 'iss-deploy': 12 }, fixedOrbitId: 'iss-deploy', maxBusSize: 'small', source: estimate('доставка на МКС і виведення з неї — оцінка до задачі 018') },
    ],
    parts: [
      cubesatPart('bus-s'),
      cubesatPart('solar-body'),
      cubesatPart('solar-deploy', 'best'),
      cubesatPart('bat-s'),
      cubesatPart('bat-m', 'best'),
      cubesatPart('radio-uhf'),
      cubesatPart('radio-s', 'best'),
      cubesatPart('cpu-basic'),
      cubesatPart('adcs-basic'),
      cubesatPart('prop-none'),
      cubesatPart('prop-cold'),
    ],
    instruments: instruments.filter((i) => i.id === 'magnetometer' || i.id === 'radiometer'),
    groundStations: mockMission.catalogs.groundStations.filter((s) => s.id !== 'guam'),
    launchSites: [],
    cargoCategories: [],
  },
  presets: [{ id: 'first-cubesat', nameCode: 'preset.cubesatLearn.first', design: { ...cubesatBase, version: 'simple' } }],
}

const demoMissions: Record<string, Mission> = { 'sat-orbit': mockMission, 'cubesat-learn': mockCubesat }

/** Demo mission by id; unknown ids fall back to mission 1. */
export const mockMissionById = (id: string): Mission => demoMissions[id] ?? mockMission

/** Demo list for GET /api/missions: the ISS mission needs the server. */
export const mockMissions: MissionSummary[] = [
  { id: 'cubesat-learn', kind: 'tutorial', titleCode: 'mission.cubesatLearn.title', available: true },
  { id: 'sat-orbit', kind: 'orbit', titleCode: 'mission.satOrbit.title', available: true },
  { id: 'iss-cargo', kind: 'iss', titleCode: 'mission.issCargo.title', available: false },
]
