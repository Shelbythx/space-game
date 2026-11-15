import type { Design, Mission, PartCategory } from '../api/types'
import { useGameText } from './format'
import type { BlueprintActions } from './useBlueprint'

// Simple version (D48, D95): one screen, ready-made sets and «◀ value ▶» switches in the
// menu's pixel style. Fewer numbers; the physics is the same.

const CATEGORIES: PartCategory[] = ['bus', 'solar', 'battery', 'radio', 'computer', 'adcs', 'propulsion']

function Cycle({ label, value, onPrev, onNext, disabled }: { label: string; value: string; onPrev: () => void; onNext: () => void; disabled?: boolean }) {
  return (
    <div className="bp-cycle">
      <span className="bp-cycle-label">{label}</span>
      <button type="button" className="mm-btn bp-cycle-btn" onClick={onPrev} disabled={disabled} aria-label={`${label}: <`}>
        {'<'}
      </button>
      <span className="bp-cycle-value">{value}</span>
      <button type="button" className="mm-btn bp-cycle-btn" onClick={onNext} disabled={disabled} aria-label={`${label}: >`}>
        {'>'}
      </button>
    </div>
  )
}

export function SimpleControls({
  mission,
  design,
  actions,
  only,
}: {
  mission: Mission
  design: Design
  actions: BlueprintActions
  /** Concept stage shows only presets and the planner's choices (task 008). */
  only?: 'planner'
}) {
  const { t, name, num } = useGameText()
  const cat = mission.catalogs
  const step = <T,>(list: T[], current: number, delta: number) => list[(current + delta + list.length) % list.length]

  const launchIdx = cat.launches.findIndex((l) => l.id === design.launchId)
  const launch = cat.launches[launchIdx]
  const orbitId = design.orbit && 'presetId' in design.orbit ? design.orbit.presetId : 'sso'
  const orbitIdx = cat.orbits.findIndex((o) => o.id === orbitId)

  const detail = (category: PartCategory, id: string) => {
    const p = cat.parts.find((x) => x.id === id)
    if (!p) return ''
    const s = p.specs
    const key =
      category === 'solar' ? `${num(s.powerW ?? 0)} W`
      : category === 'battery' ? `${num(s.capacityWh ?? 0)} Wh`
      : category === 'radio' ? `${num(s.rateKbps ?? 0)} kbps`
      : category === 'computer' ? `${num(s.storageGb ?? 0)} GB`
      : category === 'bus' ? `≤ ${num(s.maxMassKg ?? 0)} kg`
      : category === 'propulsion' && s.ispS ? `Isp ${num(s.ispS)} s`
      : ''
    return key ? `${name(id)} · ${key}` : name(id)
  }

  return (
    <div className="bp-simple">
      <section className="bp-group">
        <h3>{t('bp.presets')}</h3>
        <div className="bp-presets">
          {mission.presets.map((p) => (
            <button key={p.id} type="button" className="mm-btn bp-preset" onClick={() => actions.applyPreset(p.id)}>
              {t(p.nameCode)}
            </button>
          ))}
        </div>
      </section>

      <section className="bp-group">
        <h3>{t('role.planner')}</h3>
        <Cycle
          label={t('category.launch')}
          value={name(launch.id)}
          onPrev={() => actions.setLaunch(step(cat.launches, launchIdx, -1).id)}
          onNext={() => actions.setLaunch(step(cat.launches, launchIdx, 1).id)}
        />
        <Cycle
          label={t('category.orbit')}
          value={name(orbitId)}
          disabled={Boolean(launch.fixedOrbitId)}
          onPrev={() => actions.setOrbit({ presetId: step(cat.orbits, orbitIdx, -1).id })}
          onNext={() => actions.setOrbit({ presetId: step(cat.orbits, orbitIdx, 1).id })}
        />
        <div className="bp-toggles">
          {cat.groundStations.map((s) => (
            <button
              key={s.id}
              type="button"
              className={['bp-toggle', design.groundStationIds.includes(s.id) ? 'bp-toggle-on' : ''].join(' ')}
              aria-pressed={design.groundStationIds.includes(s.id)}
              onClick={() => actions.toggleStation(s.id)}
            >
              {name(s.id)} · {s.bands.map((b) => b.toUpperCase()).join('/')}
            </button>
          ))}
        </div>
      </section>

      {only !== 'planner' && (
        <>
      <section className="bp-group">
        <h3>
          {t('role.engineer')} · {t('role.designer')}
        </h3>
        {CATEGORIES.map((category) => {
          const list = cat.parts.filter((p) => p.category === category)
          const idx = list.findIndex((p) => p.id === design.parts[category])
          return (
            <Cycle
              key={category}
              label={t(`category.${category}`)}
              value={detail(category, design.parts[category])}
              onPrev={() => actions.setPart(category, step(list, idx, -1).id)}
              onNext={() => actions.setPart(category, step(list, idx, 1).id)}
            />
          )
        })}
      </section>

      <section className="bp-group">
        <h3>{t('role.scientist')}</h3>
        <div className="bp-toggles">
          {cat.instruments.map((i) => (
            <button
              key={i.id}
              type="button"
              className={['bp-toggle', design.instrumentIds.includes(i.id) ? 'bp-toggle-on' : ''].join(' ')}
              aria-pressed={design.instrumentIds.includes(i.id)}
              onClick={() => actions.toggleInstrument(i.id)}
            >
              {name(i.id)}
            </button>
          ))}
        </div>
      </section>
        </>
      )}
    </div>
  )
}
