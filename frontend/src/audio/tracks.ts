// The game's music: Stiluss's own tracks from assets/audio (assets/CREDITS.md). Each track
// exists as .ogg and as an .mp3 copy (D64); the browser gets the one it can play.
import breaktimeMp3 from '../../../assets/audio/breaktime.mp3?url'
import breaktimeOgg from '../../../assets/audio/breaktime.ogg?url'
import finalMp3 from '../../../assets/audio/final.mp3?url'
import finalOgg from '../../../assets/audio/final.ogg?url'
import forgtnMp3 from '../../../assets/audio/forgtn.mp3?url'
import forgtnOgg from '../../../assets/audio/forgtn.ogg?url'
import missilostMp3 from '../../../assets/audio/missilost.mp3?url'
import missilostOgg from '../../../assets/audio/missilost.ogg?url'
import prostranstvoMp3 from '../../../assets/audio/prostranstvo.mp3?url'
import prostranstvoOgg from '../../../assets/audio/prostranstvo.ogg?url'
import vrataMp3 from '../../../assets/audio/vrata.mp3?url'
import vrataOgg from '../../../assets/audio/vrata.ogg?url'

export type TrackId = 'prostranstvo' | 'breaktime' | 'forgtn' | 'vrata' | 'final' | 'missilost'

const FILES: Record<TrackId, { ogg: string; mp3: string }> = {
  prostranstvo: { ogg: prostranstvoOgg, mp3: prostranstvoMp3 },
  breaktime: { ogg: breaktimeOgg, mp3: breaktimeMp3 },
  forgtn: { ogg: forgtnOgg, mp3: forgtnMp3 },
  vrata: { ogg: vrataOgg, mp3: vrataMp3 },
  final: { ogg: finalOgg, mp3: finalMp3 },
  missilost: { ogg: missilostOgg, mp3: missilostMp3 },
}

/** Where the player is; each scene has its own track. */
export type Scene = 'menu' | 'briefing' | 'design' | 'flight' | 'report' | 'reportFailed'

export const SCENE_TRACK: Record<Scene, TrackId> = {
  menu: 'prostranstvo',
  briefing: 'breaktime',
  design: 'forgtn',
  flight: 'vrata',
  report: 'final',
  reportFailed: 'missilost',
}

let oggSupport: boolean | null = null

/** URL of the track in a format this browser plays (Safari often lacks Ogg Vorbis). */
export function trackUrl(id: TrackId): string {
  if (oggSupport === null) {
    try {
      oggSupport = new Audio().canPlayType('audio/ogg; codecs="vorbis"') !== ''
    } catch {
      oggSupport = false
    }
  }
  return oggSupport ? FILES[id].ogg : FILES[id].mp3
}

/**
 * Scene for a route of the game (hash path, `#/mission/sat-orbit/design`). Lets the music
 * follow the stages without each stage having to start it.
 */
export function sceneForPath(path: string): Scene {
  const stage = /^\/?mission\/[^/]+\/([a-z]+)/.exec(path)?.[1]
  switch (stage) {
    case 'goal':
    case 'concept':
      return 'briefing'
    case 'design':
      return 'design'
    case 'flight':
      return 'flight'
    case 'report':
      return 'report'
    default:
      return 'menu'
  }
}
