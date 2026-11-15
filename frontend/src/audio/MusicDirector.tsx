import { useEffect, useSyncExternalStore } from 'react'
import { useSettings } from '../settings/context'
import { music } from './music'
import { getReportOutcome, onReportOutcome } from './outcome'
import { SCENE_TRACK, type Scene, sceneForPath } from './tracks'

function subscribe(listener: () => void) {
  const stop = onReportOutcome(listener)
  window.addEventListener('hashchange', listener)
  return () => {
    stop()
    window.removeEventListener('hashchange', listener)
  }
}

function currentScene(): Scene {
  const scene = sceneForPath(window.location.hash.replace(/^#/, ''))
  return scene === 'report' && getReportOutcome() === 'failure' ? 'reportFailed' : scene
}

/**
 * Plays the track of the current stage (task 012). Renders nothing; mount it once inside
 * <SettingsProvider>. It follows the hash route, so stages do not need to start the music,
 * and it obeys the sound switch and volume from the settings.
 */
export function MusicDirector() {
  const { settings } = useSettings()
  const scene = useSyncExternalStore(subscribe, currentScene)

  useEffect(() => {
    music.setVolume(settings.volume, settings.soundOn)
  }, [settings.volume, settings.soundOn])

  useEffect(() => {
    music.play(SCENE_TRACK[scene])
  }, [scene])

  return null
}
