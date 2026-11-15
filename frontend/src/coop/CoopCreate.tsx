import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { GameVersion, MissionSummary } from '../api/types'
import { freshDesign } from '../blueprint/useBlueprint'
import { PixelButton } from '../menu/PixelControls'
import { getPlayerId } from '../lib/storage'
import { useSfx } from '../settings/sfx'
import { saveName, savedName } from './useRoom'
import '../mission/mission.css'
import './coop.css'

// Menu «Co-op · Multiplayer» (task 045, D109): choose the version and the mission, create a
// room on the server and go to its lobby, where the link for friends is.

export function CoopCreate() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const sfx = useSfx()
  const [missions, setMissions] = useState<MissionSummary[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState<GameVersion>('simple')
  const [name, setName] = useState(savedName)
  const [creating, setCreating] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .missions()
      .then((list) => !cancelled && setMissions(list))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [])

  const create = async (missionId: string) => {
    sfx('select')
    setCreating(missionId)
    setProblem(null)
    try {
      const mission = await api.mission(missionId)
      saveName(name)
      const room = await api.rooms.create({ playerId: getPlayerId(), name: name.trim() || null, design: freshDesign(mission, version) })
      navigate(`/coop/${room.code}`)
    } catch {
      setProblem('coop.createFailed')
      setCreating(null)
    }
  }

  return (
    <div className="mm-screen">
      <h2 className="mm-heading">{t('coop.title')}</h2>
      <p className="mm-note">{t('coop.createHint')}</p>

      <div className="mm-stack">
        <label className="coop-field">
          <span className="mm-group">{t('coop.yourName')}</span>
          <input className="coop-input" value={name} maxLength={24} onChange={(e) => setName(e.currentTarget.value)} placeholder={t('coop.namePlaceholder')} />
        </label>
        <p className="mm-group" aria-hidden="true">
          {t('bp.version.label')}
        </p>
        <div className="mm-row" role="group" aria-label={t('bp.version.label')}>
          {(['simple', 'advanced'] as const).map((v) => (
            <PixelButton key={v} aria-pressed={version === v} className={version === v ? 'mm-btn-current' : undefined} onClick={() => setVersion(v)}>
              {version === v ? `> ${t(`bp.version.${v}`)} <` : t(`bp.version.${v}`)}
            </PixelButton>
          ))}
        </div>
        <p className="mm-note">{t(`flow.versionHint.${version}`)}</p>
      </div>

      {!missions && <p className="mm-note">{failed ? t('flow.loadFailed') : t('bp.loading')}</p>}
      {problem && (
        <p className="coop-problem" role="alert">
          {t(problem)}
        </p>
      )}

      <div className="flow-missions">
        {missions?.map((m) => (
          <article key={m.id} className="flow-mission">
            <span className="flow-mission-kind">{t(`flow.kind.${m.kind}`)}</span>
            <h3>{t(m.titleCode)}</h3>
            <p>{t(m.titleCode.replace(/\.title$/, '.briefing'))}</p>
            {m.available ? (
              <PixelButton disabled={creating !== null} onClick={() => void create(m.id)}>
                {creating === m.id ? t('coop.creating') : t('coop.create')}
              </PixelButton>
            ) : (
              <p className="mm-option-note">{t('flow.needsServer')}</p>
            )}
          </article>
        ))}
      </div>

      <div className="mm-stack">
        <PixelButton onClick={() => navigate('/')}>{t('settings.done')}</PixelButton>
      </div>
    </div>
  )
}
