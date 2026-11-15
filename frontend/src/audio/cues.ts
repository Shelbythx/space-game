import { useCallback } from 'react'
import { useSettings } from '../settings/context'

// Game sounds synthesised with WebAudio — no files, so nothing to license (D63). The menu
// blips stay in settings/sfx.ts; these are the mission cues of task 012.

export type Cue = 'click' | 'warning' | 'countdown' | 'go' | 'event' | 'success' | 'failure'

type Note = { freq: number; at: number; dur: number; wave?: OscillatorType }
const CUES: Record<Cue, { gain: number; notes: Note[] }> = {
  click: { gain: 0.04, notes: [{ freq: 1200, at: 0, dur: 0.025, wave: 'square' }] },
  warning: {
    gain: 0.05,
    notes: [
      { freq: 880, at: 0, dur: 0.12, wave: 'triangle' },
      { freq: 660, at: 0.16, dur: 0.18, wave: 'triangle' },
    ],
  },
  countdown: { gain: 0.06, notes: [{ freq: 1000, at: 0, dur: 0.09, wave: 'sine' }] },
  go: { gain: 0.07, notes: [{ freq: 1500, at: 0, dur: 0.35, wave: 'sine' }] },
  event: {
    gain: 0.05,
    notes: [
      { freq: 520, at: 0, dur: 0.09, wave: 'square' },
      { freq: 520, at: 0.13, dur: 0.09, wave: 'square' },
      { freq: 780, at: 0.26, dur: 0.16, wave: 'square' },
    ],
  },
  success: {
    gain: 0.05,
    notes: [
      { freq: 523, at: 0, dur: 0.12, wave: 'triangle' },
      { freq: 659, at: 0.12, dur: 0.12, wave: 'triangle' },
      { freq: 784, at: 0.24, dur: 0.12, wave: 'triangle' },
      { freq: 1047, at: 0.36, dur: 0.3, wave: 'triangle' },
    ],
  },
  failure: {
    gain: 0.045,
    notes: [
      { freq: 392, at: 0, dur: 0.18, wave: 'sawtooth' },
      { freq: 330, at: 0.2, dur: 0.18, wave: 'sawtooth' },
      { freq: 262, at: 0.4, dur: 0.4, wave: 'sawtooth' },
    ],
  },
}

let context: AudioContext | null = null

function audio(): AudioContext | null {
  if (context) return context
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    context = new Ctor()
  } catch {
    return null
  }
  return context
}

export function playCue(cue: Cue, volume: number): void {
  if (volume <= 0) return
  const ctx = audio()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  const { gain, notes } = CUES[cue]
  const start = ctx.currentTime + 0.005
  for (const note of notes) {
    const osc = ctx.createOscillator()
    const amp = ctx.createGain()
    osc.type = note.wave ?? 'square'
    osc.frequency.setValueAtTime(note.freq, start + note.at)
    amp.gain.setValueAtTime(0.0001, start + note.at)
    amp.gain.exponentialRampToValueAtTime(gain * volume, start + note.at + 0.008)
    amp.gain.exponentialRampToValueAtTime(0.0001, start + note.at + note.dur)
    osc.connect(amp).connect(ctx.destination)
    osc.start(start + note.at)
    osc.stop(start + note.at + note.dur + 0.02)
  }
}

/** Countdown before launch: 3, 2, 1 beeps and a long "go", one second apart. */
export function playCountdown(volume: number, seconds = 3): () => void {
  const timers = Array.from({ length: seconds + 1 }, (_, i) =>
    window.setTimeout(() => playCue(i < seconds ? 'countdown' : 'go', volume), i * 1000),
  )
  return () => timers.forEach((id) => window.clearTimeout(id))
}

/** Plays a cue if sound is on, at the player's volume. */
export function useCue(): (cue: Cue) => void {
  const { settings } = useSettings()
  const { soundOn, volume } = settings
  return useCallback((cue: Cue) => soundOn && playCue(cue, volume), [soundOn, volume])
}
