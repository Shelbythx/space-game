import type { Design, Evaluation, Mission, Side } from '../api/types'
import { ownerOf, useGameText } from './format'

// Blueprint drawing (D54): flat schematics on a dark grid, drawn by hand in SVG. Shapes
// follow real hardware from NASA's SmallSat State-of-the-Art 2026 tables (Pumpkin deployable
// wings, Redwire ROSA roll-out array, Blue Canyon XACT star tracker, VACCO tanks, Busek ion
// grid, patch and whip antennas). No NASA images are copied; numbers come from the catalog.

type Dir = 'down' | 'up' | 'right' | 'inside'

interface Props {
  mission: Mission
  design: Design
  evaluation: Evaluation | null
  selected: string | null
  onSelect: (key: string) => void
}

const BUS_SIZE = { small: { w: 120, h: 110 }, medium: { w: 160, h: 140 }, large: { w: 210, h: 180 } }
const CX = 330
const CY = 215

/** Rotate a glyph drawn pointing down (+y) so it points along `dir`. */
function orient(dir: Dir) {
  return dir === 'up' ? 'rotate(180)' : dir === 'right' ? 'rotate(-90)' : ''
}

function Glyph({ kind, partId }: { kind: string; partId: string }) {
  switch (kind) {
    case 'camera':
      return (
        <g>
          <rect x={-11} y={0} width={22} height={30} />
          <rect x={-14} y={30} width={28} height={6} />
          <circle cx={0} cy={44} r={7} />
          <line x1={-6} y1={8} x2={6} y2={8} />
        </g>
      )
    case 'radar':
      return (
        <g>
          <line x1={-14} y1={0} x2={-20} y2={12} />
          <line x1={14} y1={0} x2={20} y2={12} />
          <rect x={-46} y={12} width={92} height={8} />
          {[-36, -24, -12, 0, 12, 24, 36].map((x) => (
            <line key={x} x1={x} y1={12} x2={x} y2={20} />
          ))}
        </g>
      )
    case 'radiometer':
      return (
        <g>
          <line x1={0} y1={0} x2={0} y2={10} />
          <path d="M -16 14 Q 0 32 16 14 Z" />
          <line x1={0} y1={22} x2={0} y2={30} />
        </g>
      )
    case 'magnetometer':
      return (
        <g>
          <line x1={0} y1={0} x2={0} y2={38} strokeDasharray="4 3" />
          <rect x={-5} y={38} width={10} height={10} />
        </g>
      )
    case 'radio':
      return partId === 'radio-uhf' ? (
        <g>
          <line x1={-10} y1={0} x2={-22} y2={30} />
          <line x1={10} y1={0} x2={22} y2={30} />
          <rect x={-4} y={-2} width={8} height={5} />
        </g>
      ) : (
        <g>
          <rect x={-10} y={0} width={20} height={6} />
          <rect x={-8} y={6} width={16} height={4} />
          <text x={0} y={22} className="bp-glyph-text">
            {partId === 'radio-x' ? 'X' : 'S'}
          </text>
        </g>
      )
    case 'adcs':
      return partId === 'adcs-fine' ? (
        <g>
          <path d="M -7 0 L -12 24 L 12 24 L 7 0 Z" />
          <line x1={-10} y1={14} x2={10} y2={14} />
          <circle cx={0} cy={6} r={3} />
        </g>
      ) : (
        <g>
          <ellipse cx={0} cy={10} rx={14} ry={6} />
          <ellipse cx={0} cy={10} rx={9} ry={3} />
          <line x1={0} y1={0} x2={0} y2={4} />
        </g>
      )
    case 'propulsion':
      if (partId === 'prop-elec') {
        return (
          <g>
            <rect x={-12} y={0} width={24} height={16} />
            {[-8, -4, 0, 4, 8].map((x) => (
              <line key={x} x1={x} y1={16} x2={x} y2={22} />
            ))}
            <path d="M -14 26 Q 0 40 14 26" strokeDasharray="3 3" />
          </g>
        )
      }
      return (
        <g>
          <circle cx={0} cy={12} r={partId === 'prop-chem' ? 13 : 9} />
          <path d="M -5 26 L -9 38 L 9 38 L 5 26 Z" />
        </g>
      )
    case 'battery':
      return (
        <g>
          <rect x={-14} y={-9} width={28} height={18} />
          <rect x={14} y={-4} width={3} height={8} />
          <text x={-6} y={4} className="bp-glyph-text">+</text>
          <text x={6} y={4} className="bp-glyph-text">−</text>
        </g>
      )
    case 'computer':
      return (
        <g>
          <rect x={-11} y={-11} width={22} height={22} />
          <rect x={-5} y={-5} width={10} height={10} />
          {[-7, 0, 7].map((p) => (
            <g key={p}>
              <line x1={p} y1={-11} x2={p} y2={-15} />
              <line x1={p} y1={11} x2={p} y2={15} />
            </g>
          ))}
        </g>
      )
    case 'solar':
      return (
        <g>
          <rect x={-30} y={0} width={60} height={10} />
          {[-20, -10, 0, 10, 20].map((x) => (
            <line key={x} x1={x} y1={0} x2={x} y2={10} />
          ))}
        </g>
      )
    default:
      return <rect x={-8} y={0} width={16} height={16} />
  }
}

function Wings({ partId, busW }: { partId: string; busW: number }) {
  const half = busW / 2
  if (partId === 'solar-deploy') {
    const wing = (sign: number) => {
      const x0 = sign * (half + 10)
      const panels = [0, 1].map((i) => {
        const x = sign > 0 ? x0 + i * 62 : x0 - (i + 1) * 62
        return (
          <g key={i}>
            <rect x={x} y={-34} width={58} height={68} />
            {[1, 2, 3].map((c) => (
              <line key={c} x1={x + c * 14.5} y1={-34} x2={x + c * 14.5} y2={34} />
            ))}
            <line x1={x} y1={0} x2={x + 58} y2={0} />
          </g>
        )
      })
      return (
        <g key={sign}>
          <line x1={sign * half} y1={0} x2={x0} y2={0} />
          {panels}
        </g>
      )
    }
    return <g className="bp-part bp-solar">{[wing(-1), wing(1)]}</g>
  }
  if (partId === 'solar-roll') {
    const roll = (sign: number) => {
      const x0 = sign * (half + 8)
      const x1 = sign * (half + 150)
      const left = Math.min(x0, x1)
      return (
        <g key={sign}>
          <circle cx={x0} cy={0} r={7} />
          <rect x={left} y={-26} width={142} height={52} />
          {Array.from({ length: 9 }, (_, i) => left + (i + 1) * 14.2).map((x) => (
            <line key={x} x1={x} y1={-26} x2={x} y2={26} />
          ))}
          <line x1={x0} y1={-30} x2={x1} y2={-30} strokeDasharray="6 3" />
          <line x1={x0} y1={30} x2={x1} y2={30} strokeDasharray="6 3" />
        </g>
      )
    }
    return <g className="bp-part bp-solar">{[roll(-1), roll(1)]}</g>
  }
  return null
}

export function Drawing({ mission, design, evaluation, selected, onSelect }: Props) {
  const { t, name, num, unit } = useGameText()
  const cat = mission.catalogs
  const bus = cat.parts.find((p) => p.id === design.parts.bus)
  const size = BUS_SIZE[bus?.specs.busSize ?? 'medium']
  const x0 = CX - size.w / 2
  const y0 = CY - size.h / 2
  const layout = evaluation?.layout ?? {}
  const wrongKeys = new Set(
    (evaluation?.checks ?? []).filter((c) => c.code === 'check.space.wrongSide').map((c) => String(c.params.partId)),
  )

  // What sits on which side (layout from the evaluation; deployable arrays have no side).
  const placed: Array<{ key: string; kind: string; partId: string; side: Side }> = []
  for (const category of ['radio', 'adcs', 'propulsion', 'battery', 'computer', 'solar'] as const) {
    const partId = design.parts[category]
    if (category === 'propulsion' && partId === 'prop-none') continue
    if (category === 'solar' && partId !== 'solar-body') continue
    const side = layout[category]
    if (!side) continue
    placed.push({ key: category, kind: category, partId, side })
  }
  for (const id of design.instrumentIds) {
    const side = layout[id]
    if (side) placed.push({ key: id, kind: id, partId: id, side })
  }
  const bySide = (side: Side) => placed.filter((p) => p.side === side)

  const partTitle = (key: string, partId: string) => {
    const item = cat.parts.find((p) => p.id === partId) ?? cat.instruments.find((i) => i.id === partId)
    if (!item) return name(partId)
    return `${name(partId)} · ${num(item.massKg, 2)} ${unit('kg')} · ${num(item.consumptionW)} ${unit('w')} · ${t('bp.owner', { role: t(`role.${ownerOf(key)}`) })}`
  }

  const renderSide = (side: Side, dir: Dir) => {
    const items = bySide(side)
    return items.map((item, i) => {
      let x = 0
      let y = 0
      if (dir === 'down' || dir === 'up') {
        x = x0 + (size.w * (i + 1)) / (items.length + 1)
        y = dir === 'down' ? y0 + size.h : y0
      } else if (dir === 'right') {
        x = x0 + size.w
        y = y0 + (size.h * (i + 1)) / (items.length + 1)
      } else {
        const cols = 2
        x = x0 + size.w * (0.3 + 0.4 * (i % cols))
        y = y0 + size.h * (0.3 + 0.4 * Math.floor(i / cols))
      }
      const cls = ['bp-part', wrongKeys.has(item.key) ? 'bp-wrong' : '', selected === item.key ? 'bp-selected' : '']
        .filter(Boolean)
        .join(' ')
      // Neighbouring labels alternate in height so long names do not overlap.
      const stagger = (i % 2) * 15
      const labelOffset = dir === 'down' ? 62 + stagger : dir === 'up' ? -56 - stagger : 0
      return (
        <g
          key={item.key}
          className={cls}
          transform={`translate(${x} ${y})`}
          onClick={() => onSelect(item.key)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(item.key)}
          aria-label={partTitle(item.key, item.partId)}
        >
          <title>{partTitle(item.key, item.partId)}</title>
          <g transform={orient(dir)}>
            <Glyph kind={item.kind} partId={item.partId} />
          </g>
          {dir !== 'inside' && dir !== 'right' && (
            <text className="bp-label" x={0} y={labelOffset} textAnchor="middle">
              {shortName(name(item.partId))}
            </text>
          )}
        </g>
      )
    })
  }

  const launch = cat.launches.find((l) => l.id === design.launchId)
  const busTooLarge = (evaluation?.checks ?? []).some((c) => c.code === 'check.launch.busTooLarge')
  const overCapacity = (evaluation?.checks ?? []).some((c) => c.code === 'check.launch.overCapacity')
  const fits = !busTooLarge && !overCapacity
  const fairingScale = { small: 0.6, medium: 0.8, large: 1 }[launch?.maxBusSize ?? 'medium']
  const busInFairing = { small: 0.45, medium: 0.6, large: 0.8 }[bus?.specs.busSize ?? 'medium']

  return (
    <svg className="bp-svg" viewBox="0 0 660 430" role="img" aria-label={t('bp.drawing')}>
      <defs>
        <pattern id="bp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" className="bp-grid" />
        </pattern>
      </defs>
      <rect x={0} y={0} width={660} height={430} fill="url(#bp-grid)" />

      {/* direction marks */}
      <text className="bp-axis" x={CX} y={20} textAnchor="middle">↑ {t('bp.space')}</text>
      <text className="bp-axis" x={CX} y={420} textAnchor="middle">↓ {t('bp.earth')}</text>
      <text className="bp-axis" x={648} y={CY + 4} textAnchor="end">{t('bp.sun')} →</text>
      <circle className="bp-sun" cx={648} cy={CY - 24} r={8} />

      {/* deployable or roll-out arrays */}
      <g transform={`translate(${CX} ${CY})`} onClick={() => onSelect('solar')} className={selected === 'solar' ? 'bp-selected' : ''}>
        <Wings partId={design.parts.solar} busW={size.w} />
      </g>

      {/* bus with slots */}
      <g className={['bp-bus', selected === 'bus' ? 'bp-selected' : ''].join(' ')} onClick={() => onSelect('bus')}>
        <title>{partTitle('bus', design.parts.bus)}</title>
        <rect x={x0} y={y0} width={size.w} height={size.h} />
        <rect x={x0 + 6} y={y0 + 6} width={size.w - 12} height={size.h - 12} className="bp-inner" />
        <text className="bp-label bp-bus-label" x={CX} y={y0 + size.h - 12} textAnchor="middle">
          {name(design.parts.bus)}
          {evaluation && ` · ${t('bp.slotsUsed', { used: evaluation.resources.mass.slotsUsed, slots: evaluation.resources.mass.slots })}`}
        </text>
      </g>

      {renderSide('earth', 'down')}
      {renderSide('space', 'up')}
      {renderSide('sun', 'right')}
      {renderSide('inside', 'inside')}

      {/* fairing fit check */}
      <g className={fits ? 'bp-fairing' : 'bp-fairing bp-fail'} transform="translate(46 330)">
        <title>{t('bp.fairing', { launch: launch ? name(launch.id) : '' })}</title>
        <g transform={`scale(${fairingScale})`}>
          <path d="M -26 70 L -26 0 Q -26 -40 0 -70 Q 26 -40 26 0 L 26 70 Z" />
          <rect x={-26 * busInFairing} y={10} width={52 * busInFairing} height={52 * busInFairing} className="bp-fairing-bus" />
        </g>
        <text className="bp-label" x={40} y={-10}>{launch ? name(launch.id) : ''}</text>
        <text className={fits ? 'bp-label bp-ok-text' : 'bp-label bp-fail-text'} x={40} y={8}>
          {fits ? t('bp.fits') : t('bp.doesNotFit')}
        </text>
      </g>
    </svg>
  )
}

function shortName(full: string) {
  return full.length > 16 ? `${full.slice(0, 15)}…` : full
}
