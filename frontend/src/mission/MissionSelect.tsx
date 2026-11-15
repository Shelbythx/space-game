import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { GameVersion, MissionSummary } from '../api/types'
import { PixelButton } from '../menu/PixelControls'
import { useMenuKeys } from '../menu/useMenuKeys'
import './mission.css'
import { useSfx } from '../settings/sfx'
import { hasSave, startFresh } from './saves'

// Mission choice (D78, task 008) in the menu's pixel style: the version of the game (D46),
// then a mission — new game or continue the autosaved design.

export function MissionSelect() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const sfx = useSfx()
  const root = useRef<HTMLDivElement>(null)
  const [missions, setMissions] = useState<MissionSummary[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState<GameVersion>('simple')
  const back = useCallback(() => {
    sfx('back')
    navigate('/')
  }, [navigate, sfx])
  useMenuKeys(root, back)

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

  const open = (id: string, fresh: boolean) => {
    sfx('select')
    if (fresh) startFresh(id, version)
    navigate(`/mission/${id}/goal`)
  }

  return (
    <div className="mm-screen" ref={root}>
      <h2 className="mm-heading">{t('flow.chooseMission')}</h2>

      <div className="mm-stack" role="group" aria-label={t('bp.version.label')}>
        <p className="mm-group" aria-hidden="true">
          {t('bp.version.label')}
        </p>
        <div className="mm-row">
          {(['simple', 'advanced'] as const).map((v) => (
            <PixelButton
              key={v}
              aria-pressed={version === v}
              className={version === v ? 'mm-btn-current' : undefined}
              onClick={() => {
                setVersion(v)
                sfx('toggle')
              }}
            >
              {version === v ? `> ${t(`bp.version.${v}`)} <` : t(`bp.version.${v}`)}
            </PixelButton>
          ))}
        </div>
        <p className="mm-note">{t(`flow.versionHint.${version}`)}</p>
      </div>

      {!missions && <p className="mm-note">{failed ? t('flow.loadFailed') : t('bp.loading')}</p>}

      <div className="flow-missions">
        {missions?.map((m) => {
          const playable = m.available && m.kind !== 'iss'
          const saved = playable && hasSave(m.id)
          const reason = m.kind === 'iss' ? t('flow.issSoon') : t('flow.needsServer')
          return (
            <article key={m.id} className="flow-mission">
              <span className="flow-mission-kind">{t(`flow.kind.${m.kind}`)}</span>
              <h3>{t(m.titleCode)}</h3>
              <p>{t(m.titleCode.replace(/\.title$/, '.briefing'))}</p>
              {playable ? (
                <div className="mm-row">
                  <PixelButton onClick={() => open(m.id, true)}>{t('flow.newGame')}</PixelButton>
                  <PixelButton disabled={!saved} onClick={() => open(m.id, false)}>
                    {t('flow.continue')}
                  </PixelButton>
                </div>
              ) : (
                <p className="mm-option-note">{reason}</p>
              )}
            </article>
          )
        })}
      </div>

      <div className="mm-stack">
        <PixelButton onClick={back}>{t('settings.done')}</PixelButton>
      </div>
    </div>
  )
}
