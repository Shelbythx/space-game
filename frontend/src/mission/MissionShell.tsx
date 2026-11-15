import { type ReactNode, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Design, Evaluation, Mission } from '../api/types'
import { AdvisorChat } from '../advisor/AdvisorChat'
import { AdvisorProvider } from '../advisor/AdvisorProvider'
import { type BlueprintState, useBlueprint } from '../blueprint/useBlueprint'
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
  return <MissionFrame state={state} />
}

/** What co-op (task 045) changes in the frame: the way back, a room panel and a banner. */
export interface CoopFrame {
  backLabel: string
  onBack: () => void
  /** Players and roles, under the stage checklist. */
  panel: ReactNode
  /** «Who changed what» and other room notices, above the stage. */
  banner: ReactNode
  /** Why «Start mission» is disabled although the checks pass (a free role). */
  startBlocked: string | null
}

/** The five-stage frame over one mission state: solo (useBlueprint) or a co-op room. */
export function MissionFrame({ state, coop }: { state: BlueprintState; coop?: CoopFrame }) {
  const { mission, design, evaluation, failed, demo, launch, actions } = state
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
  // Flight and report belong to a launched design: the mission flies only after the players'
  // decisions passed every check and they pressed «Start mission» on the Design stage.
  const locked = (s: Stage) => (s === 'flight' || s === 'report') && !launch.launched
  const startMission = () => {
    actions.launch()
    // In co-op the room goes to «launched» for everyone; the room view then opens the flight.
    if (!coop) navigate('flight')
  }
  const canStart = launch.ready && !coop?.startBlocked

  return (
    <MissionContext.Provider value={state}>
      {/* One mentor chat for the whole mission (D111, task 049). */}
      <AdvisorProvider>
      <div className={['mm-root bp-root fp-root', folded ? 'fp-folded' : ''].join(' ')}>
        <aside className="fp-rail" aria-label={t('flow.plan.title')}>
          <button type="button" className="mm-btn fp-back" onClick={coop ? coop.onBack : () => navigate('/missions')}>
            {'<'} <span className="fp-hide-folded">{coop ? coop.backLabel : t('flow.missions')}</span>
          </button>
          <h1 className="fp-mission">{mission ? t(mission.titleCode) : t('bp.loading')}</h1>

          <nav aria-label={t('flow.process')}>
            <ol className="fp-plan">
              {STAGES.map((s, i) => {
                const status = i === index ? 'now' : locked(s) ? 'locked' : i < index ? 'done' : 'todo'
                const lines = status === 'done' ? decisions(s) : []
                const inner = (
                  <>
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
                  </>
                )
                return (
                  <li key={s} className={`fp-step fp-step-${status === 'locked' ? 'todo fp-step-locked' : status}`}>
                    {status === 'locked' ? (
                      <span className="fp-step-link" aria-disabled="true" title={t('flow.locked.rail')}>
                        {inner}
                      </span>
                    ) : (
                      <NavLink to={s} aria-current={status === 'now' ? 'step' : undefined} className="fp-step-link">
                        {inner}
                      </NavLink>
                    )}
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

          {coop?.panel}

          {design && !coop && (
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
          {coop?.banner}
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
          ) : locked(stage) ? (
            <section className="bp-group flow-brief flow-locked" role="status">
              <h2>{t('flow.locked.title')}</h2>
              <p className="flow-lead">{launch.changed ? t('flow.locked.changed') : t('flow.locked.text')}</p>
              <div className="flow-nav flow-nav-wrap">
                <button type="button" className="mm-btn fp-next" onClick={() => navigate('design')}>
                  {'<'} {t('bp.stage.design')}
                </button>
              </div>
            </section>
          ) : (
            <div className="flow-stage" key={stage}>
              {mission.kind === 'tutorial' && <TutorialPanel stage={stage} />}
              <Outlet />
            </div>
          )}

          {mission && design && !locked(stage) && (
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
                {next && stage === 'design' && (
                  <button
                    type="button"
                    className="mm-btn fp-next"
                    onClick={startMission}
                    disabled={!canStart}
                    title={canStart ? undefined : (coop?.startBlocked ?? t('flow.locked.button'))}
                  >
                    {t('bp.launchButton')} {'>'}
                  </button>
                )}
                {next && stage !== 'design' && !locked(stage) && !locked(next) && (
                  <button type="button" className="mm-btn fp-next" onClick={() => navigate(next)}>
                    {t(`bp.stage.${next}`)} {'>'}
                  </button>
                )}
              </div>
            </footer>
          )}
        </main>
      </div>
      <AdvisorChat />
      </AdvisorProvider>
    </MissionContext.Provider>
  )
}

