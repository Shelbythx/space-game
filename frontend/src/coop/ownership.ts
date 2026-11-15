import type { Design, Role } from '../api/types'

// The owner table of docs/api.md («Хто власник рішення», D92), the same as the backend's
// DesignOwnership. The server applies only the fields of the player's roles; the client uses
// the same table so a change to someone else's field is not shown and then taken back.

type Getter = (d: Design) => unknown

export const OWNED_FIELDS: Array<{ path: string; role: Role; get: Getter }> = [
  { path: 'orbit', role: 'planner', get: (d) => d.orbit },
  { path: 'launchId', role: 'planner', get: (d) => d.launchId },
  { path: 'groundStationIds', role: 'planner', get: (d) => d.groundStationIds },
  { path: 'launchSiteId', role: 'planner', get: (d) => d.launchSiteId },
  { path: 'insertionAltitudeKm', role: 'planner', get: (d) => d.insertionAltitudeKm },
  { path: 'relay', role: 'planner', get: (d) => d.relay },
  { path: 'instrumentIds', role: 'scientist', get: (d) => d.instrumentIds },
  { path: 'cargo', role: 'scientist', get: (d) => d.cargo },
  { path: 'parts.solar', role: 'engineer', get: (d) => d.parts.solar },
  { path: 'parts.battery', role: 'engineer', get: (d) => d.parts.battery },
  { path: 'parts.radio', role: 'engineer', get: (d) => d.parts.radio },
  { path: 'parts.computer', role: 'engineer', get: (d) => d.parts.computer },
  { path: 'parts.adcs', role: 'engineer', get: (d) => d.parts.adcs },
  { path: 'parts.propulsion', role: 'engineer', get: (d) => d.parts.propulsion },
  { path: 'parts.bus', role: 'designer', get: (d) => d.parts.bus },
  { path: 'layout', role: 'designer', get: (d) => d.layout },
  { path: 'massReservePct', role: 'designer', get: (d) => d.massReservePct },
]

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** Paths of the fields that differ between two designs. */
export function changedFields(before: Design, after: Design): string[] {
  return OWNED_FIELDS.filter((f) => !same(f.get(before), f.get(after))).map((f) => f.path)
}

export const ownerOfField = (path: string): Role => OWNED_FIELDS.find((f) => f.path === path)?.role ?? 'planner'

/** `base` with the fields of `roles` taken from `incoming` (mission and version stay). */
export function mergeOwned(base: Design, incoming: Design, roles: ReadonlySet<Role>): Design {
  const d: Design = { ...base, parts: { ...base.parts } }
  if (roles.has('planner')) {
    d.orbit = incoming.orbit
    d.launchId = incoming.launchId
    d.groundStationIds = incoming.groundStationIds
    d.launchSiteId = incoming.launchSiteId
    d.insertionAltitudeKm = incoming.insertionAltitudeKm
    d.relay = incoming.relay
  }
  if (roles.has('scientist')) {
    d.instrumentIds = incoming.instrumentIds
    d.cargo = incoming.cargo
  }
  if (roles.has('engineer')) {
    for (const key of ['solar', 'battery', 'radio', 'computer', 'adcs', 'propulsion'] as const) d.parts[key] = incoming.parts[key]
  }
  if (roles.has('designer')) {
    d.parts.bus = incoming.parts.bus
    d.layout = incoming.layout
    d.massReservePct = incoming.massReservePct
  }
  return d
}
