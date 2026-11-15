import type { Design, Mission } from '../api/types'
import { useGameText } from '../blueprint/format'
import { Cycle } from '../blueprint/Cycle'
import type { BlueprintActions } from '../blueprint/useBlueprint'
import { useMission } from '../mission/context'

// ISS mission decisions (task 024, docs/api.md «Design» for `iss`). The Planner owns the
// launch site, the insertion orbit and the TDRS relay; the Scientist owns the cargo (D92).
// The controls only change the design; Δv, phasing and docking come from the backend (D59).

/** Insertion altitudes offered to the player, km: lower is cheaper to reach, slower to climb. */
const INSERTION_KM = [150, 200, 250, 300, 350]

const step = <T,>(list: T[], current: number, delta: number) => list[(current + delta + list.length) % list.length]

interface Props {
  mission: Mission
  design: Design
  actions: BlueprintActions
}

export function IssPlanner({ mission, design, actions }: Props) {
  const { t, num, unit } = useGameText()
  const sites = mission.catalogs.launchSites
  const siteIdx = Math.max(0, sites.findIndex((s) => s.id === design.launchSiteId))
  const site = sites[siteIdx]
  const altitude = design.insertionAltitudeKm ?? INSERTION_KM[1]
  const altIdx = Math.max(0, INSERTION_KM.indexOf(altitude))

  return (
    <>
      {site && (
        <Cycle
          label={t('iss.site')}
          value={`${t(site.nameCode)} · ${num(site.latitudeDeg)}°`}
          onPrev={() => actions.setLaunchSite(step(sites, siteIdx, -1).id)}
          onNext={() => actions.setLaunchSite(step(sites, siteIdx, 1).id)}
        />
      )}
      <Cycle
        label={t('iss.insertion')}
        value={`${num(altitude, 0)} ${unit('km')}`}
        onPrev={() => actions.setInsertion(step(INSERTION_KM, altIdx, -1))}
        onNext={() => actions.setInsertion(step(INSERTION_KM, altIdx, 1))}
      />
      <div className="bp-toggles">
        <button
          type="button"
          className={['bp-toggle', design.relay ? 'bp-toggle-on' : ''].join(' ')}
          aria-pressed={Boolean(design.relay)}
          onClick={() => actions.setRelay(!design.relay)}
        >
          {t('iss.relay')} · {design.relay ? t('bp.on') : t('bp.off')}
        </button>
      </div>
      <p className="bp-note">{t('iss.plannerHint')}</p>
    </>
  )
}

/** Cargo step for a category: about a tenth of its typical mass, rounded to 10 / 50 / 100 kg. */
const cargoStep = (typicalKg: number) => (typicalKg >= 500 ? 100 : typicalKg >= 100 ? 50 : 10)

export function CargoManifest({ mission, design, actions }: Props) {
  const { t, num, unit } = useGameText()
  const { evaluation } = useMission()
  const cargo = evaluation?.resources.cargo

  return (
    <>
      {mission.catalogs.cargoCategories.map((c) => {
        const mass = design.cargo?.find((x) => x.categoryId === c.id)?.massKg ?? 0
        const stepKg = cargoStep(c.typicalMassKg)
        const science = c.value === 'high' || c.value === 'highest'
        return (
          <Cycle
            key={c.id}
            label={`${t(c.nameCode)}${science ? ` · ${t('iss.science')}` : ''}`}
            value={`${num(mass, 0)} ${unit('kg')}`}
            onPrev={() => actions.setCargo(c.id, Math.max(0, mass - stepKg))}
            onNext={() => actions.setCargo(c.id, Math.min(c.typicalMassKg * 3, mass + stepKg))}
          />
        )
      })}
      {cargo && (
        <p className="bp-note">
          {t('iss.cargoTotal', {
            loaded: num(cargo.loadedKg, 0),
            goal: num(cargo.goalKg, 0),
            science: num(cargo.sciencePct, 0),
            min: num(cargo.scienceMinPct, 0),
          })}
        </p>
      )}
    </>
  )
}
