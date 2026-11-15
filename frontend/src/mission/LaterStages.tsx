import { useNavigate } from 'react-router-dom'
import { useGameText } from '../blueprint/format'
import { FlightView } from '../flight/FlightView'
import '../flight/i18n'
import type { SeriesKey } from '../flight/types'
import { RendezvousView } from '../rendezvous/RendezvousView'
import { useSimulation } from '../report/simulation'
import { useMission } from './context'

// Stage 4 «Flight» (D41): replays the backend simulation on the flat Earth map (task 010,
// FlightView). The simulation is the same one the report (task 011) shows, so both stages
// tell the same story. Without the mission server there is no flight to replay (D59): the
// stage says so honestly and leads to the demo report.

export function FlightStage() {
  const { t } = useGameText()
  const navigate = useNavigate()
  const { mission, design } = useMission()
  const { simulation, flyAgain } = useSimulation(design)

  if (simulation.status === 'ready' && mission && design && mission.kind === 'iss') {
    // ISS mission (task 024): first the chase and docking, then the stay at the station on
    // the map of task 010 — without science data, the ship has no instruments.
    const { result } = simulation
    const stations = mission.catalogs.groundStations.filter((s) => design.groundStationIds.includes(s.id))
    return (
      <div className="flow-page flow-page-wide">
        {/* TheAdvental's RendezvousView (task 024, team decision at integration 15.11.2026). */}
        {result.rendezvous && <RendezvousView profile={result.rendezvous} deadlineDays={mission.goal.dockingDeadlineDays} />}
        <FlightView
          simulation={result}
          stations={stations}
          onFinish={() => navigate('../report')}
          gauges={['batteryMinPct', 'altitudeKm', 'propellantKg']}
          title={t('rendezvous.atStation')}
        />
      </div>
    )
  }

  if (simulation.status === 'ready' && mission && design) {
    const stations = mission.catalogs.groundStations.filter((s) => design.groundStationIds.includes(s.id))
    const engine = design.parts.propulsion !== 'prop-none'
    // The training CubeSat has no engine and sinks: its altitude comes first (task 025).
    const gauges: SeriesKey[] =
      mission.kind === 'tutorial'
        ? ['altitudeKm', 'dataDeliveredGb', 'batteryMinPct', 'dataStoredGb']
        : ['batteryMinPct', 'dataStoredGb', 'dataDeliveredGb', 'altitudeKm']
    if (engine) gauges.push('propellantKg')
    return (
      <div className="flow-page flow-page-wide">
        <FlightView
          simulation={simulation.result}
          stations={stations}
          goalGb={mission.goal.dataGb}
          onFinish={() => navigate('../report')}
          gauges={gauges}
          title={null}
        />
      </div>
    )
  }

  return (
    <div className="flow-page">
      <section className="bp-group flow-brief">
        <h2>{t('bp.stage.flight')}</h2>
        {simulation.status === 'loading' && (
          <p className="flow-lead" role="status">
            {t('flow.flight.loading')}
          </p>
        )}
        {simulation.status === 'offline' && <p className="flow-lead">{t('flow.flight.needsServer')}</p>}
        {simulation.status === 'error' && (
          <>
            <p className="bp-error" role="alert">
              {t('report.error', { problem: simulation.problem })}
            </p>
            <div className="flow-nav flow-nav-wrap">
              <button type="button" className="mm-btn" onClick={flyAgain}>
                {t('report.retry')}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
