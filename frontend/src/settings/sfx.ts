import { useCallback } from 'react'
import { useSettings } from './context'

// Interface blips synthesised with WebAudio — no sound files, so no licences (D63).
// Music and the full sound manager arrive in task 012.

export type Sfx = 'move' | 'select' | 'back' | 'toggle' | 'deny'

type Step = { freq: number; at: number; dur: number }
const PATTERNS: Record<Sfx, { wave: OscillatorType; gain: number; steps: Step[] }> = {
  move: { wave: 'square', gain: 0.035, steps: [{ freq: 540, at: 0, dur: 0.035 }] },
  select: {
    wave: 'square',
    gain: 0.045,
    steps: [
      { freq: 660, at: 0, dur: 0.05 },
      { freq: 990, at: 0.05, dur: 0.07 },
    ],
  },
  back: {
    wave: 'square',
    gain: 0.04,
    steps: [
      { freq: 880, at: 0, dur: 0.05 },
      { freq: 587, at: 0.05, dur: 0.07 },
    ],
  },
  toggle: { wave: 'triangle', gain: 0.08, steps: [{ freq: 740, at: 0, dur: 0.07 }] },
  deny: {
    wave: 'sawtooth',
    gain: 0.03,
    steps: [
      { freq: 196, at: 0, dur: 0.08 },
      { freq: 147, at: 0.09, dur: 0.12 },
    ],
  },
}

let audioContext: AudioContext | null = null

function getAudio(): AudioContext | null {
  if (audioContext) return audioContext
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    audioContext = new Ctor()
  } catch {
    return null
  }
  return audioContext
}

export function playSfx(kind: Sfx, volume: number): void {
  if (volume <= 0) return
  const audio = getAudio()
  if (!audio) return
  if (audio.state === 'suspended') void audio.resume().catch(() => {})
  const pattern = PATTERNS[kind]
  const start = audio.currentTime + 0.005
  for (const step of pattern.steps) {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = pattern.wave
    osc.frequency.setValueAtTime(step.freq, start + step.at)
    const peak = pattern.gain * volume
    gain.gain.setValueAtTime(0.0001, start + step.at)
    gain.gain.exponentialRampToValueAtTime(peak, start + step.at + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + step.at + step.dur)
    osc.connect(gain).connect(audio.destination)
    osc.start(start + step.at)
    osc.stop(start + step.at + step.dur + 0.02)
  }
}

/** Returns a function that plays a blip if sound is on, at the player's volume. */
export function useSfx(): (kind: Sfx) => void {
  const { settings } = useSettings()
  const { soundOn, volume } = settings
  return useCallback(
    (kind: Sfx) => {
      if (soundOn) playSfx(kind, volume)
    },
    [soundOn, volume],
  )
}
