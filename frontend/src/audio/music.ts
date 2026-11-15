import { type TrackId, trackUrl } from './tracks'

/** Music sits under the interface sounds: this share of the player's volume. */
const MUSIC_LEVEL = 0.55
const FADE_MS = 1200

interface Deck {
  audio: HTMLAudioElement
  track: TrackId | null
  /** 0..1 position of this deck in the crossfade. */
  level: number
}

/**
 * One music player for the whole game: two <audio> decks crossfade when the track changes,
 * music pauses while the tab is hidden, and starts after the first click or key press
 * (browsers block sound before the player has touched the page).
 */
class MusicPlayer {
  private decks: [Deck, Deck] | null = null
  private front = 0
  private wanted: TrackId | null = null
  private volume = 0.8
  private enabled = true
  private unlocked = false
  private frame = 0

  private ensure(): [Deck, Deck] {
    if (this.decks) return this.decks
    const make = (): Deck => {
      const audio = new Audio()
      audio.loop = true
      audio.preload = 'auto'
      audio.volume = 0
      return { audio, track: null, level: 0 }
    }
    this.decks = [make(), make()]
    document.addEventListener('visibilitychange', () => this.sync())
    const unlock = () => {
      this.unlocked = true
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      this.sync()
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return this.decks
  }

  /** Track to play now; `null` — silence. */
  play(track: TrackId | null): void {
    if (track === this.wanted) return
    this.wanted = track
    const decks = this.ensure()
    const current = decks[this.front]
    if (track !== null && current.track !== track) {
      // Put the new track on the other deck and fade across.
      this.front = 1 - this.front
      const next = decks[this.front]
      next.track = track
      next.audio.src = trackUrl(track)
      next.audio.currentTime = 0
    }
    this.sync()
  }

  setVolume(volume: number, enabled: boolean): void {
    this.volume = volume
    this.enabled = enabled
    this.sync()
  }

  /** Start/stop decks to match the wanted state and run the fade. */
  private sync(): void {
    if (!this.decks) return
    const audible = this.enabled && this.volume > 0 && this.unlocked && !document.hidden && this.wanted !== null
    for (const [index, deck] of this.decks.entries()) {
      const shouldPlay = audible && deck.track !== null && (index === this.front || deck.level > 0)
      if (shouldPlay && deck.audio.paused) void deck.audio.play().catch(() => {})
      if (!audible && !deck.audio.paused) deck.audio.pause()
    }
    cancelAnimationFrame(this.frame)
    if (audible) this.fade(performance.now())
  }

  private fade(previous: number): void {
    this.frame = requestAnimationFrame((now) => {
      const decks = this.decks!
      const step = (now - previous) / FADE_MS
      let moving = false
      for (const [index, deck] of decks.entries()) {
        const target = index === this.front ? 1 : 0
        if (deck.level !== target) {
          deck.level = target > deck.level ? Math.min(1, deck.level + step) : Math.max(0, deck.level - step)
          moving = true
        }
        deck.audio.volume = Math.max(0, Math.min(1, deck.level * this.volume * MUSIC_LEVEL))
        if (deck.level === 0 && !deck.audio.paused) deck.audio.pause()
      }
      if (moving) this.fade(now)
    })
  }
}

export const music = new MusicPlayer()
