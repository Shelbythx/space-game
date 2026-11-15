import type { Evaluation, ResourceKind, Status } from '../api/types'
import { useGameText } from './format'

// Six resources of the challenge with their limits (D18) and the role that answers for
// each (D92). Bars only display backend numbers; clicking opens the calculation sheet (D94).

const RESOURCE_OWNER: Record<ResourceKind, 'planner' | 'engineer' | 'scientist' | 'designer'> = {
  mass: 'designer',
  power: 'engineer',
  budget: 'planner',
  comms: 'planner',
  time: 'planner',
  data: 'scientist',
}

interface Tile {
  kind: ResourceKind
  ratio: number
  status: Status
  text: string
}

export function ResourcePanel({ evaluation, onOpen }: { evaluation: Evaluation; onOpen: (kind: ResourceKind) => void }) {
  const { t, num } = useGameText()
  const r = evaluation.resources
  const massLimit = r.mass.launchCapacityKg > 0 ? Math.min(r.mass.busMaxKg, r.mass.launchCapacityKg) : r.mass.busMaxKg
  const powerMargin = r.power.averageGenerationW > 0 ? 1 - r.power.averageConsumptionW / r.power.averageGenerationW : -1
  const data = r.data

  const tiles: Tile[] = [
    {
      kind: 'mass',
      ratio: r.mass.withReserveKg / Math.max(1, massLimit),
      status: r.mass.withReserveKg > massLimit ? 'fail' : r.mass.reservePct < r.mass.recommendedReservePct ? 'warn' : 'ok',
      text: t('bp.bars.mass', { used: num(r.mass.withReserveKg), limit: num(massLimit) }),
    },
    {
      kind: 'power',
      ratio: r.power.averageConsumptionW / Math.max(0.1, r.power.averageGenerationW),
      status: powerMargin < 0 ? 'fail' : powerMargin < 0.25 ? 'warn' : 'ok',
      text: t('bp.bars.power', { use: num(r.power.averageConsumptionW), gen: num(r.power.averageGenerationW) }),
    },
    {
      kind: 'budget',
      ratio: r.budget.usedK / r.budget.limitK,
      status: r.budget.usedK > r.budget.limitK ? 'fail' : r.budget.usedK > 0.95 * r.budget.limitK ? 'warn' : 'ok',
      text: t('bp.bars.budget', { used: num(r.budget.usedK), limit: num(r.budget.limitK) }),
    },
    {
      kind: 'data',
      ratio: data ? data.expectedTotalGb / Math.max(1, data.goalGb) : 0,
      status: data && data.expectedTotalGb >= data.goalGb ? 'ok' : 'fail',
      text: data ? t('bp.bars.data', { expected: num(data.expectedTotalGb, 0), goal: num(data.goalGb, 0) }) : '—',
    },
    {
      kind: 'comms',
      ratio: r.comms.contactMinutesPerDay / 120,
      status: r.comms.contactMinutesPerDay === 0 ? 'fail' : 'ok',
      text: t('bp.bars.comms', { minutes: num(r.comms.contactMinutesPerDay, 0), contacts: r.comms.contactsPerDay }),
    },
    {
      kind: 'time',
      ratio: r.time.launchMonth / r.time.deadlineMonth,
      status: r.time.launchMonth > r.time.deadlineMonth ? 'fail' : 'ok',
      text: t('bp.bars.time', { launch: r.time.launchMonth, deadline: r.time.deadlineMonth }),
    },
  ]

  return (
    <div className="bp-resources" role="list">
      {tiles.map((tile) => (
        <button
          key={tile.kind}
          type="button"
          role="listitem"
          className={`bp-res bp-res-${tile.status}`}
          onClick={() => onOpen(tile.kind)}
          title={t('bp.calcOpen')}
        >
          <span className="bp-res-head">
            <span className="bp-res-name">{t(`resource.${tile.kind}`)}</span>
            <span className={`bp-role bp-role-${RESOURCE_OWNER[tile.kind]}`}>{t(`role.${RESOURCE_OWNER[tile.kind]}`)}</span>
          </span>
          <span className="bp-res-bar" aria-hidden="true">
            <span style={{ width: `${Math.min(100, Math.max(2, tile.ratio * 100))}%` }} />
          </span>
          <span className="bp-res-text">{tile.text}</span>
        </button>
      ))}
    </div>
  )
}
