import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { Message } from '../api/types'

// Turns backend message codes and raw params into player text (docs/api.md «Коди
// повідомлень»): ids become catalog names, numbers are formatted for the language.

export const camel = (id: string) => id.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())

const CATEGORY_KEYS = new Set(['bus', 'solar', 'battery', 'radio', 'computer', 'adcs', 'propulsion'])
const INSTRUMENTS = new Set(['magnetometer', 'radiometer', 'camera', 'radar'])

export function useGameText() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-US'

  const num = useCallback(
    (value: number, digits = 1) => value.toLocaleString(locale, { maximumFractionDigits: digits }),
    [locale],
  )

  const name = useCallback(
    (id: string): string => {
      if (CATEGORY_KEYS.has(id)) return t(`category.${id}`)
      if (INSTRUMENTS.has(id)) return t(`instrument.${id}`)
      for (const group of ['part', 'station', 'orbit', 'launch', 'instrument']) {
        const key = `${group}.${camel(id)}`
        if (i18n.exists(key)) return t(key)
      }
      return id
    },
    [t, i18n],
  )

  /** A text param from the backend in the player's words: a side, a bus size, a band or a catalog id. */
  const word = useCallback(
    (key: string, value: string): string => {
      if (key === 'side' || key === 'expectedSide') return t(`side.${value}`)
      if (key === 'busSize' || key === 'maxBusSize') return t(`busSize.${value}`)
      if (key === 'band') return value.toUpperCase()
      return name(value)
    },
    [t, name],
  )

  const msg = useCallback(
    (m: Message): string => {
      const params: Record<string, string> = {}
      for (const [key, value] of Object.entries(m.params)) {
        params[key] = typeof value === 'number' ? num(value) : word(key, value)
      }
      return t(m.code, params)
    },
    [t, num, word],
  )

  /** Unit in the player's language («kg» / «кг»), keys in game.*.json «unit». */
  const unit = useCallback((key: string) => t(`unit.${key}`), [t])

  return { t, num, name, word, msg, unit, lang: i18n.language }
}

/** Role that owns a design decision (D92, docs/api.md «Хто власник рішення»). */
export function ownerOf(key: string): 'planner' | 'engineer' | 'scientist' | 'designer' {
  if (key === 'bus' || key === 'layout') return 'designer'
  if (CATEGORY_KEYS.has(key)) return 'engineer'
  if (['orbit', 'launch', 'stations'].includes(key)) return 'planner'
  return 'scientist'
}
