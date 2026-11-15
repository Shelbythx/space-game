import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Design, Evaluation, Mission } from '../api/types'
import { useBlueprint } from '../blueprint/useBlueprint'
import { useGameText } from '../blueprint/format'
import { readStorage, writeStorage } from '../lib/storage'
import { TutorialPanel } from '../tutorial/TutorialPanel'
import { MissionContext, STAGES, type Stage } from './context'
import '../menu/menu.css'
import '../blueprint/blueprint.css'
import './mission.css'
import './flightPlan.css'

// Frame of the Science mode cycle (D41, tasks 008 and 033): the mission as a flight plan.
// The left rail is the checklist of the five stages on a trajectory line, with the decisions
// already made under each done stage; the main column says what to do now and ends in one
// readiness line and the «Next >» action. One shared mission state for all five stages.

const RAIL_KEY = 'smdg.rail'

/** Decisions already taken on a stage, as short lines for the checklist (display only). */
function useDecisions(mission: Mission | null, design: Design | null, evaluation: Evaluation | null) {
  const { t, num, name, unit } = useGameText()
  return (stage: Stage): string[] => {
    if (!mission || !design) return []
    const g = mission.goal
    const cat = mission.catalogs
    if (stage === 'goal')
      return mission.kind === 'iss'
        ? [t('flow.plan.goalCargo', { kg: num(g.cargoKg ?? 0, 0) })]
        : [t('flow.plan.goalData', { gb: num(g.dataGb ?? 0, 0), months: g.operationMonths ?? 0 })]
    if (stage === 'concept') {
      const lines: string[] = []
      if (mission.kind === 'iss') {
        const site = cat.launchSites.find((s) => s.id === design.launchSiteId)
        if (site) lines.push(t(site.nameCode))
        lines.push(t('flow.plan.insertion', { km: num(design.insertionAltitudeKm ?? 0, 0), unit: unit('km') }))
      } else if (design.orbit && 'presetId' in design.orbit) lines.push(name(design.orbit.presetId))
      else if (design.orbit) lines.push(`${num(design.orbit.altitudeKm, 0)} ${unit('km')} · ${num(design.orbit.inclinationDeg)}°`)
      lines.push(name(design.launchId))
      lines.push(design.relay ? t('flow.plan.relay') : t('flow.plan.stations', { count: design.groundStationIds.length }))
      return lines
    }
    if (stage === 'design') {
      const lines = [name(design.parts.bus)]
      if (evaluation) lines.push(t('flow.plan.budget', { used: num(evaluation.resources.budget.usedK, 0), limit: num(evaluation.resources.budget.limitK, 0) }))
      return lines
    }
    return []
  }
}

export function MissionShell() {
  const { missionId = 'sat-orbit' } = useParams()
  const state = useBlueprint(missionId)
  const { mission, design, evaluation, failed, demo, actions } = state
  const { t } = useGameText()
  const navigate = useNavigate()
  const location = useLocation()
  const stage = STAGES.find((s) => location.pathname.endsWith(`/${s}`)) ?? 'goal'
  const index = STAGES.indexOf(stage)

  // The rail folds to numbers on the crowded Design stage unless the player chose otherwise.
  const [railPref, setRailPref] = useState(() => readStorage(RAIL_KEY))
  const folded = railPref ? railPref === 'folded' : stage === 'design'
  const toggleRail = () => {
    const next = folded ? 'open' : 'folded'
    writeStorage(RAIL_KEY, next)
    setRailPref(next)
  }

  const decisions = useDecisions(mission, design, evaluation)
  const prev = STAGES[index - 1]
  const next = STAGES[index + 1]
  const fails = evaluation?.checks.filter((c) => c.status === 'fail').length ?? 0
  const warns = evaluation?.checks.filter((c) => c.status === 'warn').length ?? 0
  const showReadiness = evaluation && (stage === 'concept' || stage === 'design')
  const readiness = fails > 0 ? 'fail' : warns > 0 ? 'warn' : 'ok'

  return (
    <MissionContext.Provider value={state}>
      <div className={['mm-root bp-root fp-root', folded ? 'fp-folded' : ''].join(' ')}>
        <aside className="fp-rail" aria-label={t('flow.plan.title')}>
          <button type="button" className="mm-btn fp-back" onClick={() => navigate('/missions')}>
            {'<'} <span className="fp-hide-folded">{t('flow.missions')}</span>
          </button>
          <h1 className="fp-mission">{mission ? t(mission.titleCode) : t('bp.loading')}</h1>

          <nav aria-label={t('flow.process')}>
            <ol className="fp-plan">
              {STAGES.map((s, i) => {
                const status = i < index ? 'done' : i === index ? 'now' : 'todo'
                const lines = status === 'done' ? decisions(s) : []
                return (
                  <li key={s} className={`fp-step fp-step-${status}`}>
                    <NavLink to={s} aria-current={status === 'now' ? 'step' : undefined} className="fp-step-link">
                      <span className="fp-box" aria-hidden="true">
                        <span className="fp-num">{i + 1}</span>
                      </span>
                      <span className="fp-step-text">
                        <span className="fp-step-name">{t(`bp.stage.${s}`)}</span>
                        <span className="bp-sr">
                          {' '}
                          {t(`flow.plan.status.${status}`)}
                        </span>
                      </span>
                    </NavLink>
                    {lines.length > 0 && (
                      <ul className="fp-decisions">
                        {lines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>

          {design && (
            <div className="fp-version" role="group" aria-label={t('bp.version.label')}>
              {(['simple', 'advanced'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={['mm-btn', design.version === v ? 'mm-btn-current' : ''].join(' ')}
                  aria-pressed={design.version === v}
                  onClick={() => actions.setVersion(v)}
                  title={t(`bp.version.${v}`)}
                >
                  {t(`bp.version.${v}`)}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="fp-fold" onClick={toggleRail} aria-expanded={!folded}>
            {folded ? '>' : '<'} <span className="fp-hide-folded">{t('flow.plan.fold')}</span>
            <span className="bp-sr">{folded ? t('flow.plan.unfold') : ''}</span>
          </button>
        </aside>

        <main className="fp-main">
          <header className="fp-task">
            <h2 className="fp-title">{t(`flow.task.${stage}`)}</h2>
            <p className="fp-sub">{t(`flow.stageHint.${stage}`)}</p>
          </header>

          {demo && (
            <p className="bp-demo" role="status">
              <strong>{t('bp.demo')}</strong> {t('bp.demoHint')}
            </p>
          )}

          {!mission || !design ? (
            <p className="bp-loading">{failed ? t('flow.loadFailed') : t('bp.loading')}</p>
          ) : (
            <div className="flow-stage" key={stage}>
              {mission.kind === 'tutorial' && <TutorialPanel stage={stage} />}
              <Outlet />
            </div>
          )}

          {mission && design && (
            <footer className="fp-footer">
              {showReadiness ? (
                <p className={`fp-ready fp-ready-${readiness}`} role="status">
                  <span className="fp-ready-mark" aria-hidden="true" />
                  {readiness === 'ok'
                    ? t('flow.plan.readyOk')
                    : readiness === 'warn'
                      ? t('flow.plan.readyWarn', { count: warns })
                      : t('flow.plan.readyFail', { count: fails })}
                </p>
              ) : (
                <span />
              )}
              <div className="fp-actions">
                {prev && (
                  <button type="button" className="mm-btn fp-prev" onClick={() => navigate(prev)}>
                    {'<'} {t(`bp.stage.${prev}`)}
                  </button>
                )}
                {next && (
                  <button type="button" className="mm-btn fp-next" onClick={() => navigate(next)}>
                    {stage === 'design' ? t('bp.launchButton') : t(`bp.stage.${next}`)} {'>'}
                  </button>
                )}
              </div>
            </footer>
          )}
        </main>
      </div>
    </MissionContext.Provider>
  )
}

