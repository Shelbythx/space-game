import type { OrbitStrip as Strip } from '../api/types'
import { useGameText } from './format'

// One orbit as a strip (D94): sunlight, Earth's shadow and ground contacts, from
// evaluate.orbitStrip — shows why the battery and the radio matter.

export function OrbitStrip({ strip, altitudeKm }: { strip: Strip; altitudeKm: number }) {
  const { t, name, num, unit } = useGameText()
  const pct = (min: number) => `${(min / strip.periodMin) * 100}%`
  return (
    <figure className="bp-strip">
      <figcaption>
        {t('bp.orbitStrip')} · {num(altitudeKm, 0)} {unit('km')} · T = {num(strip.periodMin)} {unit('min')}
      </figcaption>
      <div className="bp-strip-track">
        {strip.eclipse && (
          <span
            className="bp-strip-shadow"
            style={{ left: pct(strip.eclipse.startMin), width: pct(strip.eclipse.endMin - strip.eclipse.startMin) }}
            title={`${t('bp.shadow')}: ${num(strip.eclipse.endMin - strip.eclipse.startMin)} ${unit('min')}`}
          />
        )}
        {strip.contacts.map((c) => (
          <span
            key={`${c.stationId}-${c.startMin}`}
            className="bp-strip-contact"
            style={{ left: pct(c.startMin), width: pct(Math.max(0.5, c.endMin - c.startMin)) }}
            title={t('bp.contact', { station: name(c.stationId) })}
          />
        ))}
      </div>
      <div className="bp-strip-legend">
        <span>
          <i className="bp-key bp-key-sun" /> {t('bp.sunlit')}
        </span>
        <span>
          <i className="bp-key bp-key-shadow" /> {t('bp.shadow')}
          {strip.eclipse ? ` ${num(strip.eclipse.endMin - strip.eclipse.startMin)} ${unit('min')}` : ' 0'}
        </span>
        <span>
          <i className="bp-key bp-key-contact" />{' '}
          {strip.contacts.length > 0
            ? `${t('bp.contact', { station: name(strip.contacts[0].stationId) })} ${num(strip.contacts[0].endMin - strip.contacts[0].startMin)} ${unit('min')}`
            : t('bp.noContact')}
        </span>
      </div>
    </figure>
  )
}
