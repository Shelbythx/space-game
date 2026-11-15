import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ResourceKind, Role } from '../api/types'
import { CalcSheet } from '../blueprint/CalcSheet'
import { Consoles } from '../blueprint/Consoles'
import { Feed } from '../blueprint/Feed'
import { useGameText } from '../blueprint/format'
import { OrbitStrip } from '../blueprint/OrbitStrip'
import { ResourcePanel } from '../blueprint/ResourcePanel'
import { SimpleControls } from '../blueprint/SimpleControls'
import { useMission } from './context'

// Stage 2 «Concept» (D41): the Planner picks the orbit, the launcher and the ground
// stations (D92); the orbit's facts and one orbit of light, shadow and contacts show what
// the choice means before any part is chosen.

const PLANNER: Role[] = ['planner']

export function ConceptStage() {
  const { t, num, unit } = useGameText()
  const navigate = useNavigate()
  const { mission, design, evaluation, actions } = useMission()
  const [sheet, setSheet] = useState<ResourceKind | null>(null)
  const closeSheet = useCallback(() => setSheet(null), [])
  if (!mission || !design) return null
  const o = evaluation?.orbit

  const facts = o
    ? [
        [t('flow.concept.altitude'), `${num(o.altitudeKm, 0)} ${unit('km')}`],
        [t('flow.concept.inclination'), `${num(o.inclinationDeg)}°`],
        [t('flow.concept.period'), `${num(o.periodMin)} ${unit('min')}`],
        [t('flow.concept.speed'), `${num(o.speedKmS, 2)} ${unit('kms')}`],
        [t('flow.concept.shadow'), `${num(o.eclipseFraction * 100, 0)}%`],
        [t('flow.concept.lifetime'), o.lifetimeYears == null ? '—' : t('flow.concept.years', { years: num(o.lifetimeYears, 0) })],
      ]
    : []

  return (
    <>
      {evaluation && <ResourcePanel evaluation={evaluation} onOpen={setSheet} />}
      <div className="bp-main">
        <aside className="bp-left" aria-label={t('role.planner')}>
          {design.version === 'advanced' ? (
            <Consoles
              mission={mission}
              design={design}
              evaluation={evaluation}
              actions={actions}
              role="planner"
              onRole={() => undefined}
              highlight={null}
              roles={PLANNER}
            />
          ) : (
            <SimpleControls mission={mission} design={design} actions={actions} only="planner" />
          )}
        </aside>

        <section className="bp-center">
          <section className="bp-group">
            <h3>{t('flow.concept.orbitFacts')}</h3>
            <dl className="flow-facts">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="bp-note">{t('flow.concept.hint')}</p>
          </section>
          {evaluation && <OrbitStrip strip={evaluation.orbitStrip} altitudeKm={evaluation.orbit.altitudeKm} />}
          <div className="flow-nav">
            <button type="button" className="mm-btn" onClick={() => navigate('../goal')}>
              {'<'} {t('bp.stage.goal')}
            </button>
            <button type="button" className="mm-btn" onClick={() => navigate('../design')}>
              {t('bp.stage.design')} {'>'}
            </button>
          </div>
        </section>

        <aside className="bp-right" aria-label={t('bp.feed')}>
          {evaluation && <Feed evaluation={evaluation} version={design.version} />}
        </aside>
      </div>
      {sheet && evaluation && <CalcSheet resource={sheet} calc={evaluation.calc} version={design.version} onClose={closeSheet} />}
    </>
  )
}
