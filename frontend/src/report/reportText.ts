import { useCallback } from 'react'
import type { Message } from '../api/types'
import { useGameText } from '../blueprint/format'

// Report texts from backend codes (docs/api.md «Ланцюжки», «Вузьке місце», «Події»). The
// report has numbers of very different sizes (air density ~10⁻¹³ kg/m³, data in thousands
// of GB, shares 0–1), so it formats them by size; the meaning stays the backend's.

const SUPERSCRIPT: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
}

/** A zero in this param switches the text to its «_zero» variant (no engine, nothing lost). */
const ZERO_CONTEXT: Record<string, string> = {
  'chain.decision.propulsion': 'ispS',
  'chain.physics.storage': 'lostGb',
}

export function useReportText() {
  const { t, name, lang } = useGameText()
  const locale = lang === 'uk' ? 'uk-UA' : 'en-US'

  const number = useCallback(
    (value: number): string => {
      const abs = Math.abs(value)
      if (abs !== 0 && abs < 0.001) {
        const [mantissa, exponent] = value.toExponential(1).split('e')
        const power = String(Number(exponent))
          .split('')
          .map((c) => SUPERSCRIPT[c] ?? c)
          .join('')
        return `${Number(mantissa).toLocaleString(locale)}·10${power}`
      }
      if (abs < 10) return value.toLocaleString(locale, { maximumSignificantDigits: 3 })
      return value.toLocaleString(locale, { maximumFractionDigits: abs < 100 ? 1 : 0 })
    },
    [locale],
  )

  const say = useCallback(
    (m: Message): string => {
      const params: Record<string, string> = {}
      for (const [key, value] of Object.entries(m.params)) {
        if (typeof value !== 'number') params[key] = name(value)
        else if (key.endsWith('Fraction')) params[key] = number(value * 100)
        else params[key] = number(value)
      }
      let context: string | undefined
      const zeroParam = ZERO_CONTEXT[m.code]
      if (zeroParam && m.params[zeroParam] === 0) context = 'zero'
      if (m.code === 'chain.decision.relay') context = m.params.relay ? 'on' : 'off'
      if (m.code === 'bottleneck.data' && 'usedKg' in m.params) context = 'cargo'
      if (m.code === 'bottleneck.comms' && 'usedHours' in m.params) context = 'docking'
      return t(m.code, { ...params, context })
    },
    [t, name, number],
  )

  /** Date of a real event (DONKI) in the player's language. */
  const date = useCallback(
    (iso: string) => {
      const d = new Date(iso)
      return Number.isNaN(d.getTime())
        ? iso
        : d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
    },
    [locale],
  )

  return { t, say, number, date }
}
