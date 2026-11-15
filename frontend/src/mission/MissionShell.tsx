import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useBlueprint } from '../blueprint/useBlueprint'
import { useGameText } from '../blueprint/format'
import { TutorialPanel } from '../tutorial/TutorialPanel'
import { MissionContext, STAGES } from './context'
import '../menu/menu.css'
import '../blueprint/blueprint.css'
import './mission.css'

// Frame of the Science mode cycle (D41, task 008): header, the NASA process bar that leads
// to any stage, the version switch (D46) and one shared mission state for all five stages.

export function MissionShell() {
  const { missionId = 'sat-orbit' } = useParams()
  const state = useBlueprint(missionId)
  const { mission, design, failed, demo, actions } = state
  const { t } = useGameText()
  const navigate = useNavigate()
  const location = useLocation()
  const stage = STAGES.find((s) => location.pathname.endsWith(`/${s}`)) ?? 'goal'

  return (
    <MissionContext.Provider value={state}>
      <div className="mm-root bp-root">
        <header className="bp-header">
          <button type="button" className="mm-btn bp-back" onClick={() => navigate('/missions')}>
            {'<'} {t('flow.missions')}
          </button>
          <div className="bp-titles">
            <h1>{mission ? t(mission.titleCode) : t('bp.loading')}</h1>
            <p className="bp-mission">{t(`flow.stageHint.${stage}`)}</p>
          </div>
          <nav aria-label={t('flow.process')}>
            <ol className="bp-process">
              {STAGES.map((s) => (
                <li key={s} className={s === stage ? 'bp-stage-on' : ''}>
                  <NavLink to={s} aria-current={s === stage ? 'step' : undefined}>
                    {t(`bp.stage.${s}`)}
                  </NavLink>
                </li>
              ))}
            </ol>
          </nav>
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

        {mission?.kind === 'iss' ? (
          <p className="bp-loading">{t('flow.issSoon')}</p>
        ) : !mission || !design ? (
          <p className="bp-loading">{failed ? t('flow.loadFailed') : t('bp.loading')}</p>
        ) : (
          <div className="flow-stage" key={stage}>
            {mission.kind === 'tutorial' && <TutorialPanel stage={stage} />}
            <Outlet />
          </div>
        )}
      </div>
    </MissionContext.Provider>
  )
}
