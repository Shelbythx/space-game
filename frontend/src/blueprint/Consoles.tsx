import { useState, type ReactNode } from 'react'
import type { Design, Evaluation, GroundStation, Instrument, Mission, Part, PartCategory, Role, Side, Source } from '../api/types'
import { useGameText } from './format'
import type { BlueprintActions } from './useBlueprint'

// Advanced version (D46, D92): one console per role, each with only that role's decisions;
// parts are catalog cards with every number and its source (D95).

const ROLE_ORDER: Role[] = ['planner', 'engineer', 'scientist', 'designer']
const ENGINEER: PartCategory[] = ['solar', 'battery', 'radio', 'computer', 'adcs', 'propulsion']
const SIDES: Side[] = ['earth', 'space', 'sun', 'inside']

interface Props {
  mission: Mission
  design: Design
  evaluation: Evaluation | null
  actions: BlueprintActions
  role: Role
  onRole: (role: Role) => void
  highlight: string | null
}

function SourceBadge({ source }: { source: Source }) {
  const { t } = useGameText()
  const label = source.kind === 'nasa' ? t('bp.sourceNasa') : source.kind === 'calculated' ? t('bp.sourceCalculated') : t('bp.sourceEstimate')
  return (
    <span className={`bp-src bp-src-${source.kind}`} title={source.note ?? undefined}>
      {label}
    </span>
  )
}

function specLine(item: Part | Instrument, num: (v: number, d?: number) => string): string {
  const bits: string[] = []
  if ('specs' in item) {
    const s = item.specs
    if (s.powerW && item.category === 'solar') bits.push(`${num(s.powerW)} W`)
    if (s.capacityWh) bits.push(`${num(s.capacityWh)} Wh`)
    if (s.rateKbps) bits.push(`${num(s.rateKbps)} kbps ${s.band?.toUpperCase() ?? ''}`)
    if (s.storageGb) bits.push(`${num(s.storageGb)} GB`)
    if (s.accuracyDeg) bits.push(`${num(s.accuracyDeg, 3)}°`)
    if (s.ispS) bits.push(`Isp ${num(s.ispS)} s · ${num(s.propellantKg ?? 0, 2)} kg`)
    if (s.slots) bits.push(`${s.slots} slots · ≤ ${num(s.maxMassKg ?? 0)} kg`)
  } else {
    bits.push(`${num(item.dataRateKbps)} kbps`)
  }
  bits.push(`${num(item.massKg, 2)} kg`)
  if (item.consumptionW) bits.push(`${num(item.consumptionW)} W`)
  bits.push(`${item.priceK} k`)
  return bits.join(' · ')
}

function Card({
  item,
  selected,
  onClick,
  months,
  multi,
}: {
  item: Part | Instrument | GroundStation
  selected: boolean
  onClick: () => void
  months?: number
  multi?: boolean
}) {
  const { t, name, num } = useGameText()
  const isStation = 'bands' in item
  return (
    <button
      type="button"
      className={['bp-card', selected ? 'bp-card-on' : ''].join(' ')}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="bp-card-head">
        <span className="bp-card-name">
          {multi ? (selected ? '[x] ' : '[ ] ') : ''}
          {name(item.id)}
        </span>
        <SourceBadge source={item.source} />
      </span>
      <span className="bp-card-specs">
        {isStation
          ? `${num(item.latitudeDeg)}° · ${item.bands.map((b) => b.toUpperCase()).join(', ')} · ${item.priceK} k`
          : specLine(item, num)}
      </span>
      {!isStation && 'requires' in item && item.requires.length > 0 && (
        <span className="bp-card-req">{t('bp.requires', { part: item.requires.map((r) => name(r.partId)).join(', ') })}</span>
      )}
      {months != null && <span className="bp-card-req">{t('bp.buildMonths', { months })}</span>}
      {!isStation && item.source.note && <span className="bp-card-note">{item.source.note}</span>}
    </button>
  )
}

export function Consoles({ mission, design, evaluation, actions, role, onRole, highlight }: Props) {
  const { t, name, num } = useGameText()
  const cat = mission.catalogs
  const months = (tier: Part['tier']) => mission.timing.buildMonths[tier]
  const launch = cat.launches.find((l) => l.id === design.launchId)
  const customOrbit = design.orbit && !('presetId' in design.orbit) ? design.orbit : null
  const [custom, setCustom] = useState(customOrbit ?? { altitudeKm: 650, inclinationDeg: 98 })

  const group = (title: string, key: string, children: ReactNode) => (
    <section className={['bp-group', highlight === key ? 'bp-group-hl' : ''].join(' ')} key={key}>
      <h3>{title}</h3>
      <div className="bp-cards">{children}</div>
    </section>
  )

  const partGroup = (category: PartCategory) =>
    group(
      t(`category.${category}`),
      category,
      cat.parts
        .filter((p) => p.category === category)
        .map((p) => (
          <Card key={p.id} item={p} selected={design.parts[category] === p.id} onClick={() => actions.setPart(category, p.id)} months={months(p.tier)} />
        )),
    )

  const reserve = design.massReservePct ?? mission.limits.massReserveRecommendedPct
  const sideKeys = [
    ...(['radio', 'adcs', 'battery', 'computer'] as const),
    ...(design.parts.propulsion !== 'prop-none' ? (['propulsion'] as const) : []),
    ...(design.parts.solar === 'solar-body' ? (['solar'] as const) : []),
    ...design.instrumentIds,
  ]

  return (
    <div className="bp-consoles">
      <div className="bp-tabs" role="tablist" aria-label={t('bp.consoles')}>
        {ROLE_ORDER.map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={role === r}
            className={['bp-tab', `bp-role-${r}`, role === r ? 'bp-tab-on' : ''].join(' ')}
            onClick={() => onRole(r)}
          >
            {t(`role.${r}`)}
          </button>
        ))}
      </div>

      <div className="bp-console" role="tabpanel">
        {role === 'planner' && (
          <>
            {group(
              t('category.orbit'),
              'orbit',
              <>
                {launch?.fixedOrbitId && <p className="bp-note">{t('bp.fixedOrbit', { orbit: name(launch.fixedOrbitId) })}</p>}
                {cat.orbits.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={['bp-card', design.orbit && 'presetId' in design.orbit && design.orbit.presetId === o.id ? 'bp-card-on' : ''].join(' ')}
                    disabled={Boolean(launch?.fixedOrbitId) && launch?.fixedOrbitId !== o.id}
                    onClick={() => actions.setOrbit({ presetId: o.id })}
                  >
                    <span className="bp-card-head">
                      <span className="bp-card-name">{name(o.id)}</span>
                      <SourceBadge source={o.source} />
                    </span>
                    <span className="bp-card-specs">
                      {num(o.altitudeKm, 0)} km · {num(o.inclinationDeg)}°
                    </span>
                  </button>
                ))}
                {!launch?.fixedOrbitId && (
                  <div className={['bp-card', customOrbit ? 'bp-card-on' : ''].join(' ')}>
                    <span className="bp-card-name">{t('bp.orbitCustom')}</span>
                    <label className="bp-field">
                      {t('bp.altitude')}
                      <input
                        type="number"
                        min={300}
                        max={36000}
                        value={custom.altitudeKm}
                        onChange={(e) => setCustom({ ...custom, altitudeKm: Number(e.target.value) })}
                        onBlur={() => actions.setOrbit(custom)}
                      />
                    </label>
                    <label className="bp-field">
                      {t('bp.inclination')}
                      <input
                        type="number"
                        min={0}
                        max={180}
                        value={custom.inclinationDeg}
                        onChange={(e) => setCustom({ ...custom, inclinationDeg: Number(e.target.value) })}
                        onBlur={() => actions.setOrbit(custom)}
                      />
                    </label>
                  </div>
                )}
              </>,
            )}
            {group(
              t('category.launch'),
              'launch',
              cat.launches.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={['bp-card', design.launchId === l.id ? 'bp-card-on' : ''].join(' ')}
                  onClick={() => actions.setLaunch(l.id)}
                >
                  <span className="bp-card-head">
                    <span className="bp-card-name">{name(l.id)}</span>
                    <SourceBadge source={l.source} />
                  </span>
                  <span className="bp-card-specs">
                    {Object.entries(l.capacityKg)
                      .map(([o, kg]) => `${o.toUpperCase()} ${num(kg, 0)} kg`)
                      .join(' · ')}{' '}
                    · {l.priceK} k · ≤ {t(`busSize.${l.maxBusSize}`)}
                  </span>
                </button>
              )),
            )}
            {group(
              t('category.stations'),
              'stations',
              cat.groundStations.map((s) => (
                <Card key={s.id} item={s} multi selected={design.groundStationIds.includes(s.id)} onClick={() => actions.toggleStation(s.id)} />
              )),
            )}
          </>
        )}

        {role === 'engineer' && ENGINEER.map(partGroup)}

        {role === 'scientist' &&
          group(
            t('category.instruments'),
            'instruments',
            cat.instruments.map((i) => (
              <Card key={i.id} item={i} multi selected={design.instrumentIds.includes(i.id)} onClick={() => actions.toggleInstrument(i.id)} months={months(i.tier)} />
            )),
          )}

        {role === 'designer' && (
          <>
            {partGroup('bus')}
            <section className={['bp-group', highlight === 'layout' ? 'bp-group-hl' : ''].join(' ')}>
              <h3>{t('bp.sideOf')}</h3>
              <div className="bp-sides">
                {sideKeys.map((key) => {
                  const current = (design.layout?.[key] ?? evaluation?.layout[key]) as Side | undefined
                  return (
                    <label key={key} className={['bp-side-row', highlight === key ? 'bp-group-hl' : ''].join(' ')}>
                      <span>{name(key)}</span>
                      <select value={current ?? 'earth'} onChange={(e) => actions.setSide(key, e.target.value as Side)}>
                        {SIDES.map((s) => (
                          <option key={s} value={s}>
                            {t(`side.${s}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )
                })}
              </div>
            </section>
            <section className="bp-group">
              <h3>{t('bp.reserve', { value: reserve })}</h3>
              <input
                className="bp-range"
                type="range"
                min={0}
                max={50}
                step={1}
                value={reserve}
                onChange={(e) => actions.setReserve(Number(e.target.value))}
                aria-label={t('bp.reserve', { value: reserve })}
              />
              <p className="bp-note">{t('bp.reserveRecommended', { value: mission.limits.massReserveRecommendedPct })}</p>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
