import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { Role } from '../api/types'
import { PixelButton } from '../menu/PixelControls'
import { ROLES } from './types'
import { savedName, useRoomContext } from './useRoom'
import './coop.css'

// Lobby of a co-op room (task 045, D109): the link for friends, the players and
// who holds which role. The creator starts with all four roles and gives them away; a free
// role, or one of a player who is not online, can be taken (docs/api.md 2.2).

// The lobby has no mission catalog yet; mission ids map to their title keys (docs/api.md).
const MISSION_TITLES: Record<string, string> = {
  'sat-orbit': 'mission.satOrbit.title',
  'iss-cargo': 'mission.issCargo.title',
  'cubesat-learn': 'mission.cubesatLearn.title',
}

/** The link a friend opens: the same page address with `#/coop/CODE`. */
const roomLink = (code: string) => `${window.location.origin}${window.location.pathname}#/coop/${code}`

export function CoopLobby() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { code, room, gone, offline, problem, busy, you, nameOf, actions } = useRoomContext()
  const [name, setName] = useState(savedName)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(id)
  }, [copied])

  const link = roomLink(code)
  const playerName = (slot: number | null | undefined) =>
    slot == null ? t('coop.roleFree') : (nameOf(slot) ?? t('coop.player', { slot }))

  if (gone)
    return (
      <div className="mm-screen">
        <h2 className="mm-heading">{t('coop.title')}</h2>
        <p className="mm-note">{t('coop.gone', { code })}</p>
        <div className="mm-stack">
          <PixelButton onClick={() => navigate('/coop')}>{t('coop.newRoom')}</PixelButton>
          <PixelButton onClick={() => navigate('/')}>{t('settings.done')}</PixelButton>
        </div>
      </div>
    )

  if (!room)
    return (
      <div className="mm-screen">
        <p className="mm-note" role="status">
          {offline ? t('coop.offline') : t('bp.loading')}
        </p>
      </div>
    )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      // Clipboard blocked: the link stays selectable in the field.
    }
  }

  const missionTitle = t(MISSION_TITLES[room.missionId] ?? room.missionId)

  return (
    <div className="mm-screen coop-lobby">
      <h2 className="mm-heading">{t('coop.room', { code: room.code })}</h2>
      <p className="mm-note">
        {missionTitle} · {t(`bp.version.${room.version}`)}
      </p>

      <section className="coop-share" aria-label={t('coop.shareTitle')}>
        <div className="coop-share-text">
          <p className="mm-group">{t('coop.shareTitle')}</p>
          <input className="coop-input" readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label={t('coop.link')} />
          <PixelButton onClick={() => void copy()}>{copied ? t('coop.copied') : t('coop.copy')}</PixelButton>
          <p className="mm-note coop-left">{t('coop.shareHint')}</p>
        </div>
      </section>

      {you === null ? (
        <section className="mm-stack" aria-label={t('coop.joinTitle')}>
          <p className="mm-group">{t('coop.joinTitle')}</p>
          <label className="coop-field">
            <span className="coop-sr">{t('coop.yourName')}</span>
            <input className="coop-input" value={name} maxLength={24} onChange={(e) => setName(e.currentTarget.value)} placeholder={t('coop.namePlaceholder')} />
          </label>
          <PixelButton disabled={busy || room.players.length >= 4} onClick={() => void actions.join(name)}>
            {room.players.length >= 4 ? t('room.full') : t('coop.join')}
          </PixelButton>
        </section>
      ) : null}

      <section className="coop-board" aria-label={t('coop.players')}>
        <div>
          <p className="mm-group">{t('coop.players')}</p>
          <ul className="coop-players">
            {room.players.map((p) => (
              <li key={p.slot}>
                <i className={`mm-dot ${p.online ? 'mm-dot-ready' : 'mm-dot-unreachable'}`} aria-hidden="true" />
                <span>{p.name ?? t('coop.player', { slot: p.slot })}</span>
                {p.slot === you && <span className="coop-you">{t('coop.you')}</span>}
                <span className="coop-sr">{p.online ? t('coop.online') : t('coop.away')}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mm-group">{t('coop.roles')}</p>
          <ul className="coop-roles">
            {ROLES.map((role) => (
              <RoleRow key={role} role={role} owner={room.roles[role]} ownerName={playerName(room.roles[role])} />
            ))}
          </ul>
          <p className="mm-note coop-left">{t('coop.rolesHint')}</p>
        </div>
      </section>

      {problem && (
        <p className="coop-problem" role="alert">
          {t(problem)}
        </p>
      )}

      <div className="mm-stack">
        {you !== null && <PixelButton onClick={() => navigate(room.phase === 'launched' ? 'play/flight' : 'play/goal')}>{t('coop.toMission')} {'>'}</PixelButton>}
        <div className="mm-row">
          {you !== null && (
            <PixelButton
              onClick={async () => {
                if (await actions.leave()) navigate('/')
              }}
            >
              {t('coop.leave')}
            </PixelButton>
          )}
          <PixelButton onClick={() => navigate('/')}>{t('coop.menu')}</PixelButton>
        </div>
      </div>
    </div>
  )
}

function RoleRow({ role, owner, ownerName }: { role: Role; owner: number | null; ownerName: string }) {
  const { t } = useTranslation()
  const { room, you, busy, actions } = useRoomContext()
  if (!room) return null
  const mine = owner !== null && owner === you
  const ownerOnline = room.players.find((p) => p.slot === owner)?.online ?? false
  const canTake = you !== null && !mine && (owner === null || !ownerOnline)
  const others = room.players.filter((p) => p.slot !== you)

  return (
    <li className={mine ? 'coop-role coop-role-mine' : 'coop-role'}>
      <span className="coop-role-name">{t(`role.${role}`)}</span>
      <span className="coop-role-owner">{ownerName}</span>
      <span className="coop-role-actions">
        {mine && (
          <select
            className="coop-select"
            value=""
            disabled={busy}
            aria-label={t('coop.giveRole', { role: t(`role.${role}`) })}
            onChange={(e) => {
              const value = e.currentTarget.value
              if (value) void actions.assign(role, value === 'free' ? null : Number(value))
            }}
          >
            <option value="">{t('coop.give')}</option>
            {others.map((p) => (
              <option key={p.slot} value={p.slot}>
                {p.name ?? t('coop.player', { slot: p.slot })}
              </option>
            ))}
            <option value="free">{t('coop.free')}</option>
          </select>
        )}
        {canTake && (
          <button type="button" className="mm-btn coop-small" disabled={busy} onClick={() => void actions.assign(role, you)}>
            {t('coop.take')}
          </button>
        )}
      </span>
    </li>
  )
}
