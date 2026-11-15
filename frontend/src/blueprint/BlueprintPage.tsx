import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ResourceKind, Role } from '../api/types'
import { CalcSheet } from './CalcSheet'
import { Consoles } from './Consoles'
import { Drawing } from './Drawing'
import { Feed } from './Feed'
import { ownerOf, useGameText } from './format'
import { OrbitStrip } from './OrbitStrip'
import { ResourcePanel } from './ResourcePanel'
import { SimpleControls } from './SimpleControls'
import { useBlueprint } from './useBlueprint'
import '../menu/menu.css'
import './blueprint.css'

// Stage 3 of the Science mode cycle (D41): the blueprint. The player assembles the
// spacecraft inside the chosen launcher's fairing (D91); every change goes to
// POST /api/evaluate and the consequences show at once (D39). Task 009.

const STAGES = ['goal', 'concept', 'design', 'flight', 'report'] as const

export function BlueprintPage() {
  const { t, name } = useGameText()
  const navigate = useNavigate()
  const { mission, design, evaluation, evaluating, failed, demo, actions } = useBlueprint()
  const [role, setRole] = useState<Role>('engineer')
  const [highlight, setHighlight] = useState<string | null>(null)
  const [sheet, setSheet] = useState<ResourceKind | null>(null)
  const [launchNote, setLaunchNote] = useState(false)
  const closeSheet = useCallback(() => setSheet(null), [])

  const select = (key: string) => {
    setHighlight(key)
    if (design?.version === 'advanced') setRole(ownerOf(key))
  }

  return (
    <div className="mm-root bp-root">
      <header className="bp-header">
        <button type="button" className="mm-btn bp-back" onClick={() => navigate('/')}>
          {'<'} {t('bp.back')}
        </button>
        <div className="bp-titles">
          <h1>{t('bp.title')}</h1>
          {mission && <p className="bp-mission">{t(mission.titleCode)} — {t(mission.briefingCode)}</p>}
        </div>
        <ol className="bp-process" aria-label="NASA">
          {STAGES.map((s) => (
            <li key={s} className={s === 'design' ? 'bp-stage-on' : ''} aria-current={s === 'design' ? 'step' : undefined}>
              {t(`bp.stage.${s}`)}
            </li>
          ))}
        </ol>
        {design && (
          <div className="bp-version" role="group" aria-label={t('bp.version.label')}>
            {(['simple', 'advanced'] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={['mm-btn', design.version === v ? 'mm-btn-current' : ''].join(' ')}
                aria-pressed={design.version === v}
                onClick={() => actions.setVersion(v)}
              >
                {t(`bp.version.${v}`)}
              </button>
            ))}
          </div>
        )}
      </header>

      {demo && (
        <p className="bp-demo" role="status">
          <strong>{t('bp.demo')}</strong> {t('bp.demoHint')}
        </p>
      )}

      {!mission || !design ? (
        <p className="bp-loading">{failed ? t('bp.error') : t('bp.loading')}</p>
      ) : (
        <>
          {evaluation ? (
            <ResourcePanel evaluation={evaluation} onOpen={setSheet} />
          ) : (
            <p className="bp-loading">{t('bp.evaluating')}</p>
          )}

          <div className={`bp-main bp-main-${design.version}`}>
            <aside className="bp-left" aria-label={t('bp.consoles')}>
              {design.version === 'advanced' ? (
                <Consoles
                  mission={mission}
                  design={design}
                  evaluation={evaluation}
                  actions={actions}
                  role={role}
                  onRole={setRole}
                  highlight={highlight}
                />
              ) : (
                <SimpleControls mission={mission} design={design} actions={actions} />
              )}
            </aside>

            <section className="bp-center" aria-label={t('bp.drawing')} aria-busy={evaluating}>
              <div className="bp-drawing">
                <Drawing mission={mission} design={design} evaluation={evaluation} selected={highlight} onSelect={select} />
                {evaluating && <span className="bp-busy">{t('bp.evaluating')}</span>}
              </div>
              {evaluation && <OrbitStrip strip={evaluation.orbitStrip} altitudeKm={evaluation.orbit.altitudeKm} />}
              {failed && <p className="bp-error">{t('bp.error')}</p>}
              <div className="bp-launch">
                <button type="button" className="mm-btn" onClick={() => setLaunchNote(true)}>
                  {t('bp.launchButton')} {'>'}
                </button>
                {launchNote && <span className="bp-note">{t('bp.launchSoon')}</span>}
                {highlight && (
                  <span className="bp-note">
                    {name(highlight)} · {t('bp.owner', { role: t(`role.${ownerOf(highlight)}`) })}
                  </span>
                )}
              </div>
            </section>

            <aside className="bp-right" aria-label={t('bp.feed')}>
              {evaluation && <Feed evaluation={evaluation} version={design.version} />}
            </aside>
          </div>

          {sheet && evaluation && (
            <CalcSheet resource={sheet} calc={evaluation.calc} version={design.version} onClose={closeSheet} />
          )}
        </>
      )}
    </div>
  )
}
