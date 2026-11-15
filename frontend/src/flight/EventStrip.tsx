import { useTranslation } from 'react-i18next'
import { FLIGHT_NS } from './i18n'
import type { FlightEvent } from './types'

interface Props {
  events: FlightEvent[]
  day: number
  lastDay: number
  onSeek: (day: number) => void
}

/** Mission time as a strip: event marks from the backend, a cursor, and a scrubber. */
export function EventStrip({ events, day, lastDay, onSeek }: Props) {
  const { t } = useTranslation([FLIGHT_NS, 'translation'])
  const span = lastDay || 1

  return (
    <div className="fl-strip">
      <div className="fl-strip__rail">
        <div className="fl-strip__done" style={{ width: `${(day / span) * 100}%` }} />
        <input
          className="fl-strip__scrub"
          type="range"
          min={0}
          max={lastDay}
          step={1}
          value={Math.round(day)}
          aria-label={t('controls.scrub')}
          onChange={(e) => onSeek(Number(e.target.value))}
        />
        {events.map((event, index) => (
          <button
            key={`${event.day}-${event.type}-${index}`}
            type="button"
            className={`fl-strip__mark fl-strip__mark--${event.type}${event.day <= day ? ' fl-strip__mark--past' : ''}`}
            style={{ left: `${(Math.min(event.day, span) / span) * 100}%` }}
            title={t('events.jump', { day: event.day, type: t(`eventType.${event.type}`) })}
            aria-label={t('events.jump', { day: event.day, type: t(`eventType.${event.type}`) })}
            onClick={() => onSeek(event.day)}
          />
        ))}
      </div>
      <div className="fl-strip__scale">
        <span>0</span>
        <span>{Math.round(lastDay / 2)}</span>
        <span>{lastDay}</span>
      </div>
    </div>
  )
}
