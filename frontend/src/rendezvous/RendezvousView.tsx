import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Gauge } from '../flight/Gauge'
import { sampleSeries } from '../flight/geometry'
import { FLIGHT_NS } from '../flight/i18n'
import type { RendezvousProfile } from '../flight/types'
import { type SpeedIndex, usePlayback } from '../flight/usePlayback'
import '../flight/flight.css'
import './rendezvous.css'

interface Props {
  /** `simulate.rendezvous` for the ISS mission. */
  profile: RendezvousProfile
  /** `goal.dockingDeadlineDays` of the mission, if known: marks the deadline on the strip. */
  deadlineDays?: number
  /** Called from the "To the report" button. */
  onFinish?: () => void
}

/** Mission hours per real second at each speed. */
const HOUR_SPEEDS = [1, 4, 16] as const

const SIZE = 320
const CENTER = SIZE / 2
const EARTH_R = 50
const LOW_R = 92
const HIGH_R = 130
const ARC_R = 111
const RAD = Math.PI / 180

type Stage = 'phasing' | 'transfer' | 'approach' | 'docked' | 'notDocked'

/** Point on the scheme: angle in degrees clockwise from the top. */
function at(radius: number, angleDeg: number): [number, number] {
  return [CENTER + radius * Math.sin(angleDeg * RAD), CENTER - radius * Math.cos(angleDeg * RAD)]
}

/** Phase angle at a fractional step, going the short way round where the series wraps 0↔360. */
function samplePhase(series: number[], index: number): number {
  if (series.length === 0) return 0
  const clamped = Math.max(0, Math.min(series.length - 1, index))
  const low = Math.floor(clamped)
  const high = Math.min(series.length - 1, low + 1)
  const step = ((series[high] - series[low] + 540) % 360) - 180
  return (((series[low] + step * (clamped - low)) % 360) + 360) % 360
}

/**
 * Mission 2 flight (task 024): the ship catching up with the ISS, seen from above the
 * orbit. A replay of `simulate.rendezvous` — phase angle, altitude and propellant per hour
 * come from the backend (D59); the scheme only places them on screen and is not to scale.
 */
export function RendezvousView({ profile, deadlineDays, onFinish }: Props) {
  const { t, i18n } = useTranslation([FLIGHT_NS, 'translation'])
  const lastHour = profile.hours[profile.hours.length - 1] ?? 0
  const playback = usePlayback(lastHour, HOUR_SPEEDS)
  const { day: hour, seek, toggle, setSpeed } = playback
  const index = profile.stepHours > 0 ? hour / profile.stepHours : 0

  const number = (value: number, digits: number) =>
    new Intl.NumberFormat(i18n.language, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)

  const insertionKm = profile.altitudeKm[0] ?? 0
  const targetKm = Math.max(...profile.altitudeKm, insertionKm)
  const altitude = sampleSeries(profile.altitudeKm, index)
  const propellant = sampleSeries(profile.propellantKg, index)
  const climb = targetKm > insertionKm ? Math.max(0, Math.min(1, (altitude - insertionKm) / (targetKm - insertionKm))) : 0

  const docked = profile.dockedAtHours !== null && hour >= profile.dockedAtHours
  const stage: Stage = docked
    ? 'docked'
    : playback.finished
      ? 'notDocked'
      : climb <= 0
        ? 'phasing'
        : climb < 1
          ? 'transfer'
          : 'approach'

  const phase = docked ? 0 : samplePhase(profile.phaseAngleDeg, index)
  const shipR = LOW_R + (HIGH_R - LOW_R) * climb
  const [issX, issY] = at(HIGH_R, 0)
  const [shipX, shipY] = docked ? [issX, issY] : at(shipR, phase)
  const [arcStartX, arcStartY] = at(ARC_R, 0)
  const [arcEndX, arcEndY] = at(ARC_R, phase)
  const [labelX, labelY] = at(ARC_R - 16, phase / 2)

  const deadlineHours = deadlineDays !== undefined ? deadlineDays * 24 : null
  const span = lastHour || 1

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.key === ' ') {
        event.preventDefault()
        toggle()
      } else if (event.key === 'ArrowRight') {
        seek(hour + lastHour / 50)
      } else if (event.key === 'ArrowLeft') {
        seek(hour - lastHour / 50)
      } else if (event.key === '1' || event.key === '2' || event.key === '3') {
        setSpeed((Number(event.key) - 1) as SpeedIndex)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hour, lastHour, seek, toggle, setSpeed])

  return (
    <section className="fl rv" aria-label={t('rv.title')}>
      <header className="fl-head">
        <h2 className="fl-head__title">{t('rv.title')}</h2>
        <div className="fl-head__day">
          {t('rv.elapsed', { days: Math.floor(hour / 24), hours: Math.floor(hour % 24) })}
        </div>
        <div className={`fl-head__status rv-status--${stage}`}>{t(`rv.stage.${stage}`)}</div>
      </header>

      <div className="rv-body">
        <div className="fl-stage rv-scheme">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={t('rv.schemeLabel')}>
            <circle className="rv-earth" cx={CENTER} cy={CENTER} r={EARTH_R} />
            <text className="rv-earth__name" x={CENTER} y={CENTER + 3}>
              {t('rv.earth')}
            </text>

            <circle className="rv-orbit rv-orbit--low" cx={CENTER} cy={CENTER} r={LOW_R} />
            <circle className="rv-orbit rv-orbit--iss" cx={CENTER} cy={CENTER} r={HIGH_R} />
            <text className="rv-orbit__label" x={CENTER} y={CENTER + LOW_R - 4}>
              {t('rv.insertionOrbit', { km: number(insertionKm, 0) })}
            </text>
            <text className="rv-orbit__label rv-orbit__label--iss" x={CENTER} y={CENTER + HIGH_R + 11}>
              {t('rv.issOrbit', { km: number(targetKm, 0) })}
            </text>

            {/* Direction of flight: counter-clockwise, so "ahead" is to the left of the top. */}
            <path
              className="rv-direction"
              d={`M ${at(HIGH_R + 14, 40).join(' ')} A ${HIGH_R + 14} ${HIGH_R + 14} 0 0 0 ${at(HIGH_R + 14, 18).join(' ')}`}
              markerEnd="url(#rv-arrow)"
            />
            <defs>
              <marker id="rv-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto">
                <path className="rv-direction__head" d="M0 0 L6 3 L0 6 Z" />
              </marker>
            </defs>

            {!docked && (
              <g className="rv-phase">
                <line x1={CENTER} y1={CENTER} x2={issX} y2={issY} />
                <line x1={CENTER} y1={CENTER} x2={shipX} y2={shipY} />
                <path
                  className="rv-phase__arc"
                  d={`M ${arcStartX} ${arcStartY} A ${ARC_R} ${ARC_R} 0 ${phase > 180 ? 1 : 0} 1 ${arcEndX} ${arcEndY}`}
                />
                <text className="rv-phase__value" x={labelX} y={labelY + 3}>
                  {number(phase, 0)}°
                </text>
              </g>
            )}

            <g className={`rv-iss${docked ? ' rv-iss--docked' : ''}`} transform={`translate(${issX} ${issY})`}>
              {docked && <circle className="rv-iss__ring" r={15} />}
              <rect className="rv-iss__panel" x={-13} y={-3} width={8} height={6} />
              <rect className="rv-iss__panel" x={5} y={-3} width={8} height={6} />
              <rect className="rv-iss__body" x={-4} y={-4} width={8} height={8} />
              <text className="rv-iss__name" x={0} y={-10}>
                {t('rv.iss')}
              </text>
            </g>

            {!docked && (
              <g className="rv-ship" transform={`translate(${shipX} ${shipY})`}>
                <circle className="rv-ship__halo" r={8} />
                <rect className="rv-ship__body" x={-3} y={-3} width={6} height={6} />
              </g>
            )}
          </svg>
          <div className="fl-legend">
            <span className="fl-legend__item rv-legend--low">{t('rv.legend.low')}</span>
            <span className="fl-legend__item rv-legend--iss">{t('rv.legend.iss')}</span>
            <span className="fl-legend__item rv-legend--phase">{t('rv.legend.phase')}</span>
            <span className="fl-legend__note">{t('rv.notToScale')}</span>
          </div>
        </div>

        <div className="rv-side">
          <div className={`fl-event rv-card rv-card--${stage}`} aria-live="polite">
            <div className="fl-event__title">{t('rv.now')}</div>
            <div className="fl-event__head">
              <span className="fl-event__type">{t(`rv.stage.${stage}`)}</span>
            </div>
            <div className="fl-event__text">{t(`rv.explain.${stage}`)}</div>
            {profile.dockedAtHours !== null && (
              <div className="fl-event__source">
                {t('rv.dockedAt', {
                  days: Math.floor(profile.dockedAtHours / 24),
                  hours: Math.floor(profile.dockedAtHours % 24),
                })}
                {deadlineDays !== undefined && ` · ${t('rv.deadline', { days: deadlineDays })}`}
              </div>
            )}
          </div>

          <div className="fl-gauges rv-gauges">
            <Gauge
              label={t('rv.gauge.phase')}
              value={number(phase, 0)}
              unit="°"
              series={profile.phaseAngleDeg}
              index={index}
            />
            <Gauge
              label={t('gauge.altitudeKm')}
              value={number(altitude, 0)}
              unit={t('unit.km')}
              series={profile.altitudeKm}
              index={index}
            />
            <Gauge
              label={t('gauge.propellantKg')}
              value={number(propellant, 0)}
              unit={t('unit.kg')}
              series={profile.propellantKg}
              index={index}
            />
          </div>
        </div>
      </div>

      <div className="fl-controls">
        <div className="fl-strip">
          <div className="fl-strip__rail">
            <div className="fl-strip__done" style={{ width: `${(hour / span) * 100}%` }} />
            <input
              className="fl-strip__scrub"
              type="range"
              min={0}
              max={lastHour}
              step={1}
              value={Math.round(hour)}
              aria-label={t('rv.scrub')}
              onChange={(e) => seek(Number(e.target.value))}
            />
            {profile.dockedAtHours !== null && (
              <span
                className="rv-mark rv-mark--dock"
                style={{ left: `${(Math.min(profile.dockedAtHours, span) / span) * 100}%` }}
                title={t('rv.stage.docked')}
              />
            )}
            {deadlineHours !== null && deadlineHours <= lastHour && (
              <span
                className="rv-mark rv-mark--deadline"
                style={{ left: `${(deadlineHours / span) * 100}%` }}
                title={t('rv.deadline', { days: deadlineDays })}
              />
            )}
          </div>
          <div className="fl-strip__scale">
            <span>0</span>
            <span>{t('rv.hoursScale', { hours: lastHour })}</span>
          </div>
        </div>
        <div className="fl-controls__row">
          <button type="button" className="fl-btn fl-btn--main" onClick={toggle}>
            {playback.finished ? t('controls.replay') : playback.playing ? t('controls.pause') : t('controls.play')}
          </button>
          <div className="fl-controls__speed" role="group" aria-label={t('controls.speed')}>
            {HOUR_SPEEDS.map((value, i) => (
              <button
                key={value}
                type="button"
                className={`fl-btn${playback.speed === i ? ' fl-btn--on' : ''}`}
                aria-pressed={playback.speed === i}
                onClick={() => setSpeed(i as SpeedIndex)}
              >
                ×{value / HOUR_SPEEDS[0]}
              </button>
            ))}
          </div>
          {onFinish && (
            <button type="button" className="fl-btn fl-btn--report" onClick={onFinish}>
              {t('controls.toReport')}
            </button>
          )}
        </div>
        <div className="fl-controls__keys">{t('rv.keys')}</div>
      </div>
    </section>
  )
}
