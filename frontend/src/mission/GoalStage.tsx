import { useNavigate } from 'react-router-dom'
import type { Role } from '../api/types'
import { useGameText } from '../blueprint/format'
import { useMission } from './context'

// Stage 1 «Goal and requirements» (D41): the need, the end product and the measurable
// limits of the mission, plus who decides what (D92). Numbers come from the mission catalog.

const ROLES: Role[] = ['planner', 'scientist', 'engineer', 'designer']

export function GoalStage() {
  const { t, num, unit } = useGameText()
  const navigate = useNavigate()
  const { mission } = useMission()
  if (!mission) return null
  const g = mission.goal
  const l = mission.limits

  const tiles = [
    { label: t('flow.goal.product'), value: t('flow.goal.productValue', { gb: num(g.dataGb, 0), months: g.operationMonths }) },
    { label: t('flow.goal.budget'), value: `${num(l.budgetK, 0)} ${unit('k')}` },
    { label: t('flow.goal.deadline'), value: t('flow.goal.deadlineValue', { month: l.launchDeadlineMonth }) },
    { label: t('flow.goal.margin'), value: `≥ ${l.massReserveRecommendedPct}%` },
  ]

  return (
    <div className="flow-page">
      <section className="bp-group flow-brief">
        <h2>{t('flow.goal.title')}</h2>
        <p className="flow-lead">{t(mission.briefingCode)}</p>
        <p className="bp-note">{t('flow.goal.why')}</p>
      </section>

      <div className="flow-tiles">
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

      <div className="flow-nav">
        <span />
        <button type="button" className="mm-btn" onClick={() => navigate('../concept')}>
          {t('bp.stage.concept')} {'>'}
        </button>
      </div>
    </div>
  )
}
