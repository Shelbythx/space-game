import { useCallback, useState } from 'react'
import type { ResourceKind, Role } from '../api/types'
import { useMission } from '../mission/context'
import { CalcSheet } from './CalcSheet'
import { Consoles } from './Consoles'
import { Drawing } from './Drawing'
import { Feed } from './Feed'
import { ownerOf, useGameText } from './format'
import { OrbitStrip } from './OrbitStrip'
import { ResourcePanel } from './ResourcePanel'
import { SimpleControls } from './SimpleControls'

// Stage 3 of the Science mode cycle (D41): the blueprint. The player assembles the
// spacecraft inside the chosen launcher's fairing (D91); every change goes to
// POST /api/evaluate and the consequences show at once (D39). Task 009; the header and
// the stage bar live in MissionShell (task 008).

export function BlueprintPage() {
  const { t, name } = useGameText()
  const { mission, design, evaluation, evaluating, failed, actions } = useMission()
  const [role, setRole] = useState<Role>('engineer')
  const [highlight, setHighlight] = useState<string | null>(null)
  const [sheet, setSheet] = useState<ResourceKind | null>(null)
  const closeSheet = useCallback(() => setSheet(null), [])

  if (!mission || !design) return null

  const select = (key: string) => {
    setHighlight(key)
    if (design.version === 'advanced') setRole(ownerOf(key))
  }

  return (
    <>
      {evaluation ? <ResourcePanel evaluation={evaluation} onOpen={setSheet} /> : <p className="bp-loading">{t('bp.evaluating')}</p>}

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
          {highlight && (
            <p className="bp-note">
              {name(highlight)} · {t('bp.owner', { role: t(`role.${ownerOf(highlight)}`) })}
            </p>
          )}
        </section>

        <aside className="bp-right" aria-label={t('bp.feed')}>
          {evaluation && <Feed evaluation={evaluation} version={design.version} />}
        </aside>
      </div>

      {sheet && evaluation && <CalcSheet resource={sheet} calc={evaluation.calc} version={design.version} onClose={closeSheet} />}
    </>
  )
}
