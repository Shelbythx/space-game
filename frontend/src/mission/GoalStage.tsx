import type { Role } from '../api/types'
import { useGameText } from '../blueprint/format'
import { useMission } from './context'

// Stage 1 «Goal and requirements» (D41): the need, the end product and the measurable
// limits of the mission, plus who decides what (D92). Numbers come from the mission catalog.

const ROLES: Role[] = ['planner', 'scientist', 'engineer', 'designer']

export function GoalStage() {
  const { t, num, unit } = useGameText()
  const { mission } = useMission()
  if (!mission) return null
  const g = mission.goal
  const l = mission.limits

  // The ISS mission's end product is cargo delivered in time, not data (docs/api.md «goal»).
  const product =
    mission.kind === 'iss'
      ? [
          { label: t('flow.goal.product'), value: `${num(g.cargoKg ?? 0, 0)} ${unit('kg')}` },
          { label: t('flow.goal.science'), value: `≥ ${num(g.scienceCargoMinPct ?? 0, 0)}%` },
          { label: t('flow.goal.docking'), value: t('flow.goal.dockingValue', { days: g.dockingDeadlineDays ?? 0 }) },
        ]
      : [{ label: t('flow.goal.product'), value: t('flow.goal.productValue', { gb: num(g.dataGb ?? 0, 0), months: g.operationMonths }) }]

  const tiles = [
    ...product,
    { label: t('flow.goal.budget'), value: `${num(l.budgetK, 0)} ${unit('k')}` },
    { label: t('flow.goal.deadline'), value: t('flow.goal.deadlineValue', { month: l.launchDeadlineMonth }) },
    { label: t('flow.goal.margin'), value: `≥ ${l.massReserveRecommendedPct}%` },
  ]

  return (
    <div className="flow-page">
      <section className="bp-group flow-brief">
        <p className="flow-lead">{t(mission.briefingCode)}</p>
        <p className="bp-note">{t('flow.goal.why')}</p>
      </section>

      <div className={tiles.length > 4 ? 'flow-tiles flow-tiles-3' : 'flow-tiles'}>
        {tiles.map((tile) => (
          <div key={tile.label} className="flow-tile">
            <span className="flow-tile-label">{tile.label}</span>
            <span className="flow-tile-value">{tile.value}</span>
          </div>
        ))}
      </div>
      <p className="bp-note">{t('flow.goal.sources')}</p>

      <section className="bp-group">
        <h2>{t('flow.goal.rolesTitle')}</h2>
        <div className="flow-roles">
          {ROLES.map((r) => (
            <article key={r} className="flow-role">
              <span className={`bp-role bp-role-${r}`}>{t(`role.${r}`)}</span>
              <p>{t(`flow.roles.${r}`)}</p>
            </article>
          ))}
        </div>
        <p className="bp-note">{t('flow.goal.conflict')}</p>
      </section>

    </div>
  )
}
