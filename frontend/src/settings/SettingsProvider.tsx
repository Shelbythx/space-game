import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { writeStorage } from '../lib/storage'
import { loadSettings, SETTINGS_KEY, SettingsContext, type Settings } from './context'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  useEffect(() => {
    writeStorage(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const value = useMemo(() => ({ settings, update }), [settings, update])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
