import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { EventStrip } from './EventStrip'
import { FlightMap } from './FlightMap'
import { Gauge } from './Gauge'
import { sampleSeries } from './geometry'
import { FLIGHT_NS } from './i18n'
import type { FlightEvent, FlightSimulation, FlightStation, SeriesKey } from './types'
import { SPEEDS, type SpeedIndex, usePlayback } from './usePlayback'
import './flight.css'

interface Props {
  /** The `POST /api/simulate` response (or the part of it the flight screen replays). */
  simulation: FlightSimulation
  /** Selected ground stations with their positions from the mission catalog. */
  stations: FlightStation[]
  /** `goal.dataGb` of the mission; omit for missions without a data goal. */
  goalGb?: number
  /** Called from the "To the report" button once the replay has ended. */
  onFinish?: () => void
}

const GAUGES: Array<{ key: SeriesKey; unit: 'pct' | 'gb' | 'km' | 'kg'; digits: number }> = [
  { key: 'batteryMinPct', unit: 'pct', digits: 0 },
  { key: 'dataStoredGb', unit: 'gb', digits: 1 },
  { key: 'dataDeliveredGb', unit: 'gb', digits: 1 },
  { key: 'altitudeKm', unit: 'km', digits: 1 },
  { key: 'propellantKg', unit: 'kg', digits: 2 },
]

/** How long (in real seconds) an event tints the map after the clock passes it. */
const FLASH_SECONDS = 2.5

function endsMission(event: FlightEvent): boolean {
  return event.type === 'reentry' || event.message.code === 'event.debrisLoss'
}

/**
 * Flight stage (task 010): replays one simulation on a flat map of the Earth. Everything
 * shown — track, shadow, contacts, series, events — comes from the backend (D59).
 */
export function FlightView({ simulation, stations, goalGb, onFinish }: Props) {
  const { t, i18n } = useTranslation([FLIGHT_NS, 'translation'])
  const { timeline, groundTrack, contacts, events } = simulation

  const lastDay = timeline.days[timeline.days.length - 1] ?? 0
  const playback = usePlayback(lastDay)
  const { day, seek, toggle, setSpeed } = playback
  const index = timeline.stepDays > 0 ? day / timeline.stepDays : 0

  const sorted = useMemo(() => [...events].sort((a, b) => a.day - b.day), [events])
  const past = sorted.filter((event) => event.day <= day)
  const latest = past[past.length - 1] ?? null
  const flashing = latest !== null && day - latest.day <= FLASH_SECONDS * SPEEDS[playback.speed] && day > 0
  const lost = past.some(endsMission)
  const nextEvent = sorted.find((event) => event.day > day) ?? null

  const number = (value: number, digits: number) =>
    new Intl.NumberFormat(i18n.language, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)

  const delivered = sampleSeries(timeline.dataDeliveredGb, index)
  const expected = goalGb && lastDay > 0 ? (goalGb * day) / lastDay : 0

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.key === ' ') {
        event.preventDefault()
        toggle()
      } else if (event.key === 'ArrowRight') {
        seek(day + lastDay / 50)
      } else if (event.key === 'ArrowLeft') {
        seek(day - lastDay / 50)
      } else if (event.key === 'n' || event.key === 'N') {
        if (nextEvent) seek(nextEvent.day)
      } else if (event.key === '1' || event.key === '2' || event.key === '3') {
        setSpeed((Number(event.key) - 1) as SpeedIndex)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [day, lastDay, nextEvent, seek, toggle, setSpeed])

  return (
    <section className="fl" aria-label={t('title')}>
      <header className="fl-head">
        <h2 className="fl-head__title">{t('title')}</h2>
        <div className="fl-head__day">{t('day', { day: Math.floor(day), total: lastDay })}</div>
        {(playback.finished || lost) && (
          <div className={`fl-head__status${lost ? ' fl-head__status--lost' : ''}`}>
            {lost ? t('status.lost') : t('status.complete')}
          </div>
        )}
      </header>

      <div className="fl-stage">
        <FlightMap
          groundTrack={groundTrack}
          stations={stations}
          contacts={contacts}
          trackPhase={playback.trackPhase}
          activeEvent={flashing && latest ? latest.type : null}
          lost={lost}
        />
        <div className="fl-legend">
          <span className="fl-legend__item fl-legend__item--lit">{t('legend.lit')}</span>
          <span className="fl-legend__item fl-legend__item--shadow">{t('legend.shadow')}</span>
          <span className="fl-legend__item fl-legend__item--zone">{t('legend.zone')}</span>
          <span className="fl-legend__item fl-legend__item--contact">{t('legend.contact')}</span>
          <span className="fl-legend__note">{t('trackNote', { count: groundTrack.orbitCount })}</span>
        </div>
      </div>

      <div className="fl-controls">
        <EventStrip events={sorted} day={day} lastDay={lastDay} onSeek={seek} />
        <div className="fl-controls__row">
          <button type="button" className="fl-btn fl-btn--main" onClick={toggle}>
            {playback.finished ? t('controls.replay') : playback.playing ? t('controls.pause') : t('controls.play')}
          </button>
          <div className="fl-controls__speed" role="group" aria-label={t('controls.speed')}>
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
          <button type="button" className="fl-btn" disabled={!nextEvent} onClick={() => nextEvent && seek(nextEvent.day)}>
            {t('controls.nextEvent')}
          </button>
          {onFinish && (
            <button type="button" className="fl-btn fl-btn--report" onClick={onFinish}>
              {t('controls.toReport')}
            </button>
          )}
        </div>
        <div className="fl-controls__keys">{t('controls.keys')}</div>
      </div>

      <div className={`fl-event${latest ? ` fl-event--${latest.type}` : ''}${flashing ? ' fl-event--flash' : ''}`} aria-live="polite">
        <div className="fl-event__title">{t('events.title')}</div>
        {latest ? (
          <>
            <div className="fl-event__head">
              <span className="fl-event__type">{t(`eventType.${latest.type}`)}</span>
              <span className="fl-event__day">{t('events.dayLabel', { day: latest.day })}</span>
            </div>
            <div className="fl-event__text">{t(latest.message.code, latest.message.params)}</div>
            <div className="fl-event__source">
              {latest.source.kind === 'donki' && latest.source.observedAt
                ? t('events.donki', {
                    date: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long', timeZone: 'UTC' }).format(
                      new Date(latest.source.observedAt),
                    ),
                  })
                : latest.source.kind === 'seeded'
                  ? t('events.seeded')
                  : null}
            </div>
          </>
        ) : (
          <div className="fl-event__text fl-event__text--none">{t('events.none')}</div>
        )}
      </div>

      {goalGb !== undefined && (
        <div className="fl-goal">
          <div className="fl-goal__head">
            <span className="fl-goal__title">{t('goal.title')}</span>
            <span className="fl-goal__value">
              {delivered >= goalGb
                ? t('goal.reached')
                : t('goal.data', { delivered: number(delivered, 0), goal: number(goalGb, 0) })}
            </span>
          </div>
          <div className="fl-goal__bar">
            <div className="fl-goal__fill" style={{ width: `${Math.min(100, (delivered / goalGb) * 100)}%` }} />
            <div className="fl-goal__pace" style={{ left: `${Math.min(100, (expected / goalGb) * 100)}%` }} />
          </div>
          <div className="fl-goal__note">{t('goal.pace', { expected: number(expected, 0) })}</div>
        </div>
      )}

      <div className="fl-gauges">
        {GAUGES.map(({ key, unit, digits }) => (
          <Gauge
            key={key}
            label={t(`gauge.${key}`)}
            value={number(sampleSeries(timeline[key], index), digits)}
            unit={t(`unit.${unit}`)}
            series={timeline[key]}
            index={index}
          />
        ))}
      </div>

      <div className="fl-stations">
        <div className="fl-stations__title">{t('stations.title')}</div>
        <ul className="fl-stations__list">
          {contacts.map((contact) => {
            const station = stations.find((s) => s.id === contact.stationId)
            const name =
              contact.stationId === 'tdrs'
                ? t('stations.tdrs')
                : t(station?.nameCode ?? contact.stationId, { defaultValue: contact.stationId })
            return (
              <li key={contact.stationId} className={contact.contactsPerDay > 0 ? undefined : 'fl-stations__silent'}>
                <span className="fl-stations__name">{name}</span>
                <span className="fl-stations__stat">
                  {contact.contactsPerDay > 0
                    ? t('stations.perDay', {
                        contacts: number(contact.contactsPerDay, 0),
                        minutes: number(contact.minutesPerDay, 0),
                      })
                    : t('stations.silent')}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

    </section>
  )
}
