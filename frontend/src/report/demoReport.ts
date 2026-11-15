import type { Check, Evaluation, Mission, ResourceKind, Segment, Status } from '../api/types'

// Demo report without the mission server (task 011): it only regroups what the demo
// evaluation already returned — the checks by NASA segment and the resource with the
// smallest margin m = 1 − used / limit (plan, section 3). No flight is simulated: chains,
// scores and events need the server (D59). The screen marks it as a demo.

export interface DemoReport {
  success: boolean
  limits: Check[]
  segments: Array<{ segment: Segment; status: Status; checks: Check[] }>
  bottleneck: { resource: ResourceKind; code: string; params: Record<string, number> } | null
}

const SEGMENTS: Segment[] = ['launch', 'space', 'ground', 'user']
const DAYS_PER_MONTH = 365.25 / 12

const worst = (statuses: Status[]): Status =>
  statuses.includes('fail') ? 'fail' : statuses.includes('warn') ? 'warn' : 'ok'

const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits

export function demoReport(evaluation: Evaluation, mission: Mission): DemoReport {
  const segments = SEGMENTS.map((segment) => {
    const checks = evaluation.checks.filter((c) => c.segment === segment)
    return { segment, status: worst(checks.map((c) => c.status)), checks }
  })
  const limits = evaluation.checks.filter((c) => c.segment === 'mission')
  const success = [...segments, ...limits].every((x) => x.status !== 'fail')

  const r = evaluation.resources
  const ratio = (used: number, limit: number) => (limit <= 0 ? -1 : 1 - used / limit)
  const margins: Array<{ resource: ResourceKind; margin: number; params: Record<string, number> }> = [
    {
      resource: 'mass',
      margin: ratio(r.mass.withReserveKg, r.mass.launchCapacityKg),
      params: { usedKg: round(r.mass.withReserveKg), limitKg: r.mass.launchCapacityKg },
    },
    {
      resource: 'power',
      margin: ratio(r.power.averageConsumptionW, r.power.averageGenerationW),
      params: { usedW: round(r.power.averageConsumptionW), limitW: round(r.power.averageGenerationW) },
    },
    {
      resource: 'budget',
      margin: ratio(r.budget.usedK, r.budget.limitK),
      params: { usedK: round(r.budget.usedK), limitK: r.budget.limitK },
    },
    {
      resource: 'time',
      margin: ratio(r.time.launchMonth, r.time.deadlineMonth),
      params: { usedMonths: r.time.launchMonth, limitMonths: r.time.deadlineMonth },
    },
  ]
  if (r.data) {
    const neededPerDay = r.data.goalGb / Math.max(1, mission.goal.operationMonths * DAYS_PER_MONTH)
    margins.push(
      {
        resource: 'data',
        margin: ratio(r.data.goalGb, r.data.expectedTotalGb),
        params: { usedGb: r.data.goalGb, limitGb: round(r.data.expectedTotalGb) },
      },
      {
        resource: 'comms',
        margin: ratio(neededPerDay, r.data.downlinkGbPerDay),
        params: { usedGbPerDay: round(neededPerDay, 3), limitGbPerDay: round(r.data.downlinkGbPerDay, 3) },
      },
    )
  }
  const smallest = margins.reduce<(typeof margins)[number] | null>(
    (min, m) => (!min || m.margin < min.margin ? m : min),
    null,
  )
  const bottleneck = smallest
    ? { resource: smallest.resource, code: `bottleneck.${smallest.resource}`, params: smallest.params }
    : null

  return { success, limits, segments, bottleneck }
}
