import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Design, Mission, Role } from '../api/types'
import { type BlueprintState, designActions, normalize } from '../blueprint/useBlueprint'
import { changedFields, ownerOfField } from './ownership'
import type { RoomHandle } from './useRoom'

// The co-op room as the same mission state the solo stages use (MissionContext): the five
// stages, consoles and drawing work unchanged. Edits go to the room; a change to a field of
// someone else's role is not applied — the player is told whose decision it is (D92).

export interface ForeignEdit {
  role: Role
  /** Slot of the role's owner, null — the role is free. */
  owner: number | null
  at: number
}

export function useCoopMission(handle: RoomHandle) {
  const { room, design, myRoles, sending, offline, actions: roomActions } = handle
  const [mission, setMission] = useState<Mission | null>(null)
  const [missionFailed, setMissionFailed] = useState(false)
  const [foreign, setForeign] = useState<ForeignEdit | null>(null)
  const missionId = room?.missionId

  useEffect(() => {
    if (!missionId) return
    let cancelled = false
    api
      .mission(missionId)
      .then((m) => !cancelled && setMission(m))
      .catch(() => !cancelled && setMissionFailed(true))
    return () => {
      cancelled = true
    }
  }, [missionId])

  const update = useCallback(
    (change: (d: Design) => Design) => {
      if (!design || !mission || !room) return
      const next = normalize(change(design), mission)
      const changed = changedFields(design, next)
      const others = changed.filter((path) => !myRoles.has(ownerOfField(path)))
      if (others.length > 0) {
        const role = ownerOfField(others[0])
        setForeign({ role, owner: room.roles[role], at: Date.now() })
      }
      if (changed.length > others.length) roomActions.editDesign(next)
    },
    [design, mission, room, myRoles, roomActions],
  )

  const actions = designActions(update, mission, () => void roomActions.launch())

  const evaluation = room?.evaluation ?? null
  const state: BlueprintState = {
    mission,
    design: mission ? design : null,
    evaluation,
    evaluating: sending,
    failed: offline || missionFailed,
    demo: false,
    launch: {
      ready: !sending && !!evaluation && evaluation.checks.every((c) => c.status !== 'fail'),
      launched: room?.phase === 'launched',
      changed: false,
    },
    actions,
  }

  return { state, foreign }
}
