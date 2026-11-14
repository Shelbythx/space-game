import { createContext, useContext } from 'react'
import { readStorage } from '../lib/storage'

// Player settings, modelled on the settings of «yourself.» (D63): sound on/off, volume,
// plus sky motion for players who prefer less movement. Language lives in i18n.
export interface Settings {
  soundOn: boolean
  /** 0..1 */
  volume: number
  /** Rotating starry sky in the menu; off by default when the OS asks for reduced motion. */
  skyMotion: boolean
}

export const SETTINGS_KEY = 'smdg.settings.v1'

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function loadSettings(): Settings {
  const defaults: Settings = { soundOn: true, volume: 0.8, skyMotion: !prefersReducedMotion() }
  const raw = readStorage(SETTINGS_KEY)
  if (!raw) return defaults
  try {
    const saved = JSON.parse(raw) as Partial<Settings>
    return {
      soundOn: typeof saved.soundOn === 'boolean' ? saved.soundOn : defaults.soundOn,
      volume: typeof saved.volume === 'number' ? clamp01(saved.volume) : defaults.volume,
      skyMotion: typeof saved.skyMotion === 'boolean' ? saved.skyMotion : defaults.skyMotion,
    }
  } catch {
    return defaults
  }
}

export interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext)
  if (!value) throw new Error('useSettings must be used inside <SettingsProvider>')
  return value
}
