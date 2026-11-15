import { useMemo } from 'react'

interface Props {
  label: string
  value: string
  unit: string
  series: number[]
  /** Cursor position, fractional index into `series`. */
  index: number
}

const WIDTH = 100
const HEIGHT = 26

/** A counter with a small chart of the whole backend series and a cursor on "now". */
export function Gauge({ label, value, unit, series, index }: Props) {
  const line = useMemo(() => {
    if (series.length < 2) return ''
    const min = Math.min(...series)
    const max = Math.max(...series)
    const span = max - min || 1
    return series
      .map((v, i) => {
        const x = (i / (series.length - 1)) * WIDTH
        const y = HEIGHT - 2 - ((v - min) / span) * (HEIGHT - 4)
        return `${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(' ')
  }, [series])

  const cursorX = series.length > 1 ? (Math.min(index, series.length - 1) / (series.length - 1)) * WIDTH : 0

  return (
    <div className="fl-gauge">
      <div className="fl-gauge__label">{label}</div>
      <div className="fl-gauge__value">
        {value}
        <span className="fl-gauge__unit">{unit}</span>
      </div>
      <svg className="fl-gauge__chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
        <polyline className="fl-gauge__line" points={line} />
        <line className="fl-gauge__cursor" x1={cursorX} y1={0} x2={cursorX} y2={HEIGHT} />
      </svg>
    </div>
  )
}
