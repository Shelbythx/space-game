import type { Evaluation, Mission, RendezvousProfile } from '../api/types'
import { useGameText } from '../blueprint/format'
import { Gauge } from '../flight/Gauge'
import { sampleSeries } from '../flight/geometry'
import { SPEEDS, type SpeedIndex, usePlayback } from '../flight/usePlayback'
import '../flight/flight.css'
import './rendezvous.css'

// ISS mission flight, part 1 (task 024): the chase from the insertion orbit to the station,
// replayed hour by hour from `simulate.rendezvous` — phase angle, altitude and propellant
// (D59: no physics here). The flight clock and gauges are the ones from the flight screen
// (task 010). The drawing is a schematic: the frame turns with the ISS, so the station stays
// on top and the ship comes up from behind; orbit radii are exaggerated to be visible.

interface Props {
  profile: RendezvousProfile
  mission: Mission
  evaluation: Evaluation
}

const SIZE = 320
const C = SIZE / 2
const EARTH_R = 64

/** Orbit radius on the drawing: 150 km → 96 px, 450 km → 140 px (not to scale). */
const radius = (altitudeKm: number) => 96 + ((Math.min(450, Math.max(150, altitudeKm)) - 150) / 300) * 44

const point = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const
}

export function RendezvousView({ profile, mission, evaluation }: Props) {
  const { t, num, unit } = useGameText()
  const lastHour = profile.hours[profile.hours.length - 1] ?? 0
  const playback = usePlayback(lastHour)
  const { day: hour, toggle, setSpeed } = playback
  const index = profile.stepHours > 0 ? hour / profile.stepHours : 0
  // The phase angle wraps at 360°, so it is not interpolated between hours.
  const phase = profile.phaseAngleDeg[Math.min(profile.phaseAngleDeg.length - 1, Math.floor(index))] ?? 0
  const altitude = sampleSeries(profile.altitudeKm, index)
  const fuel = sampleSeries(profile.propellantKg, index)

  const issAltitude = mission.catalogs.orbits[0]?.altitudeKm ?? 418
  const insertion = profile.altitudeKm[0] ?? altitude
  const docked = profile.dockedAtHours !== null && hour >= profile.dockedAtHours
  const ended = playback.finished && profile.dockedAtHours === null
  const step = docked
    ? 'docked'
    : ended
      ? 'missed'
      : altitude <= insertion + 0.5
        ? 'phasing'
        : altitude < issAltitude - 0.5
          ? 'transfer'
          : 'approach'

  // The ISS sits on top (−90°); the ship is `phase` degrees behind it along the motion.
  const issAngle = -90
  const shipAngle = issAngle + (docked ? 0 : phase)
  const [issX, issY] = point(radius(issAltitude), issAngle)
  const shipR = radius(altitude)
  const [shipX, shipY] = point(shipR, shipAngle)
  const arcLarge = phase > 180 ? 1 : 0
  const arcFrom = point(shipR, shipAngle)
  const arcTo = point(shipR, issAngle)

  const rv = evaluation.rendezvous
  const deadlineDays = mission.goal.dockingDeadlineDays ?? 5
  const number = (v: number, digits: number) => num(v, digits)

  return (
    <section className="fl rv" aria-label={t('rendezvous.title')}>
      <header className="fl-head">
        <h2 className="fl-head__title">{t('rendezvous.title')}</h2>
        <div className="fl-head__day">{t('rendezvous.hour', { hour: Math.floor(hour), total: lastHour })}</div>
        <div className={`fl-head__status rv-step rv-step--${step}`}>{t(`rendezvous.step.${step}`)}</div>
      </header>

      <div className="rv-stage">
        <svg className="rv-map" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={t('rendezvous.mapLabel')}>
          <circle className="rv-earth" cx={C} cy={C} r={EARTH_R} />
          <text className="rv-label" x={C} y={C + 4} textAnchor="middle">
            {t('rendezvous.earth')}
          </text>
          <circle className="rv-orbit rv-orbit--iss" cx={C} cy={C} r={radius(issAltitude)} />
          {!docked && <circle className="rv-orbit rv-orbit--ship" cx={C} cy={C} r={shipR} />}
          {!docked && phase > 0.5 && (
            <path
              className="rv-arc"
              d={`M ${arcFrom[0]} ${arcFrom[1]} A ${shipR} ${shipR} 0 ${arcLarge} 0 ${arcTo[0]} ${arcTo[1]}`}
            />
          )}
          <rect className="rv-iss" x={issX - 7} y={issY - 4} width={14} height={8} />
          <text className="rv-label rv-label--iss" x={issX} y={issY - 10} textAnchor="middle">
            {t('rendezvous.iss')}
          </text>
          <circle className={docked ? 'rv-ship rv-ship--docked' : 'rv-ship'} cx={shipX} cy={shipY} r={4.5} />
          {!docked && (
            <text className="rv-label rv-label--ship" x={shipX} y={shipY + 16} textAnchor="middle">
              {t('rendezvous.ship')}
            </text>
          )}
        </svg>
        <div className="rv-side">
          <p className="rv-phase">
            {docked ? t('rendezvous.dockedAt', { hours: number(profile.dockedAtHours ?? 0, 0), days: number((profile.dockedAtHours ?? 0) / 24, 1) }) : t('rendezvous.behind', { deg: number(phase, 0) })}
          </p>
          <p className="fl-legend__note">{t(`rendezvous.explain.${step}`)}</p>
          <dl className="rv-facts">
            <div>
              <dt>{t('rendezvous.fact.initial')}</dt>
              <dd>{number(profile.initialPhaseAngleDeg, 0)}°</dd>
            </div>
            {rv && (
              <>
                <div>
                  <dt>{t('rendezvous.fact.hohmann')}</dt>
                  <dd>
                    {number(rv.hohmannDeltaVms, 0)} {unit('ms')}
                  </dd>
                </div>
                <div>
                  <dt>{t('rendezvous.fact.planeChange')}</dt>
                  <dd>
                    {number(rv.planeChangeDeltaVms, 0)} {unit('ms')}
                  </dd>
                </div>
              </>
            )}
            <div>
              <dt>{t('rendezvous.fact.deadline')}</dt>
              <dd>{t('flow.goal.dockingValue', { days: deadlineDays })}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="fl-controls">
        <div className="fl-controls__row">
          <button type="button" className="fl-btn fl-btn--main" onClick={toggle}>
            {playback.finished ? t('flight:controls.replay') : playback.playing ? t('flight:controls.pause') : t('flight:controls.play')}
          </button>
          <div className="fl-controls__speed" role="group" aria-label={t('flight:controls.speed')}>
            {SPEEDS.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`fl-btn${playback.speed === i ? ' fl-btn--on' : ''}`}
                aria-pressed={playback.speed === i}
                onClick={() => setSpeed(i as SpeedIndex)}
              >
                ×{SPEEDS[i] / SPEEDS[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fl-gauges rv-gauges">
        <Gauge label={t('rendezvous.gauge.phase')} value={number(phase, 0)} unit="°" series={profile.phaseAngleDeg} index={index} />
        <Gauge label={t('rendezvous.gauge.altitude')} value={number(altitude, 1)} unit={unit('km')} series={profile.altitudeKm} index={index} />
        <Gauge label={t('rendezvous.gauge.propellant')} value={number(fuel, 0)} unit={unit('kg')} series={profile.propellantKg} index={index} />
      </div>
    </section>
  )
}
