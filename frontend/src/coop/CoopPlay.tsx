import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { MissionFrame } from '../mission/MissionShell'
import { RoomSimulationContext, type SimulationSource } from '../report/simulation'
import { ROLES } from './types'
import { useCoopMission } from './useCoopMission'
import { useRoomContext } from './useRoom'
import './coop.css'

// The five mission stages (D41) over a co-op room (task 045, D109). The frame and stages are
// the solo ones; the room adds who holds which role, «who changed what», and one shared
// flight: the backend simulates it once at «Start mission» and every player sees it.

const NOTICE_MS = 6000

export function CoopPlay() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const handle = useRoomContext()
  const { room, you, gone, offline, problem, nameOf, actions } = handle
  const { state, foreign } = useCoopMission(handle)
  const [now, setNow] = useState(() => Date.now())
  const seenRevision = useRef<{ revision: number; at: number } | null>(null)

  // A notice lives a few seconds; one timer re-renders while any is visible.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const change = room?.lastChange
  if (room && change && seenRevision.current?.revision !== room.revision) seenRevision.current = { revision: room.revision, at: Date.now() }

  // Everyone goes to the flight when anyone starts the mission, and back to the design when
  // anyone returns the room to designing.
  const phase = room?.phase
  const previousPhase = useRef(phase)
  useEffect(() => {
    const before = previousPhase.current
    previousPhase.current = phase
    if (before === 'design' && phase === 'launched') navigate('flight')
    if (before === 'launched' && phase === 'design' && /\/(flight|report)$/.test(location.pathname)) navigate('design')
  }, [phase, navigate, location.pathname])

  const simulation = useMemo<SimulationSource | null>(
    () =>
      room?.launch
        ? {
            simulation: { status: 'ready', result: room.launch.result },
            attempts: { status: 'ready', current: null, previous: null },
            flyAgain: () => void actions.again(),
          }
        : null,
    // actions change every render; the source only needs to follow the launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room?.launch],
  )

  if (gone || (room && you === null)) return <Navigate to="../.." relative="path" replace />
  if (!room) return <p className="bp-loading">{offline ? t('coop.offline') : t('bp.loading')}</p>

  const who = (slot: number | null | undefined) => (slot == null ? t('coop.roleFree') : (nameOf(slot) ?? t('coop.player', { slot })))
  const freeRole = ROLES.find((r) => room.roles[r] === null)

  const notices: Array<{ key: string; text: string; tone: 'info' | 'warn' }> = []
  if (offline) notices.push({ key: 'offline', text: t('coop.offline'), tone: 'warn' })
  if (problem) notices.push({ key: 'problem', text: t(problem), tone: 'warn' })
  if (foreign && now - foreign.at < NOTICE_MS)
    notices.push({ key: 'foreign', text: t('coop.foreign', { role: t(`role.${foreign.role}`), owner: who(foreign.owner) }), tone: 'warn' })
  if (change && change.slot !== you && seenRevision.current && now - seenRevision.current.at < NOTICE_MS && change.kind !== 'create') {
    const fields = change.fields.map((f) => t(`coop.field.${f}`, { defaultValue: f })).join(', ')
    notices.push({ key: 'change', text: t(`coop.changed.${change.kind}`, { name: who(change.slot), fields }), tone: 'info' })
  }
  if (room.launch) notices.push({ key: 'launch', text: t('coop.launchedBy', { name: who(room.launch.slot) }), tone: 'info' })

  const banner = notices.length > 0 && (
    <div className="coop-banner" role="status" aria-live="polite">
      {notices.map((n) => (
        <p key={n.key} className={`coop-notice coop-notice-${n.tone}`}>
          {n.text}
        </p>
      ))}
    </div>
  )

  const panel = (
    <section className="coop-panel fp-hide-folded" aria-label={t('coop.roles')}>
      <p className="coop-panel-title">{t('coop.room', { code: room.code })}</p>
      <ul>
        {ROLES.map((role) => {
          const owner = room.roles[role]
          const player = room.players.find((p) => p.slot === owner)
          return (
            <li key={role} className={owner !== null && owner === you ? 'coop-panel-mine' : undefined}>
              <i className={`mm-dot ${player?.online ? 'mm-dot-ready' : 'mm-dot-unreachable'}`} aria-hidden="true" />
              <span>{t(`role.${role}`)}</span>
              <span className="coop-panel-owner">{owner === you ? t('coop.you') : who(owner)}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )

  return (
    <RoomSimulationContext.Provider value={simulation}>
      <MissionFrame
        state={state}
        coop={{
          backLabel: t('coop.lobby'),
          onBack: () => navigate('../..', { relative: 'path' }),
          panel,
          banner,
          startBlocked: freeRole ? t('coop.startBlocked', { role: t(`role.${freeRole}`) }) : null,
        }}
      />
    </RoomSimulationContext.Provider>
  )
}
