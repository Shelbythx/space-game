import { useEffect, type RefObject } from 'react'
import { useSettings } from '../settings/context'
import { playSfx } from '../settings/sfx'
import { toggleFullscreen } from './fullscreen'

// Keyboard control as in «yourself.»: arrows or WASD move between menu items,
// Enter / Space / E select, Esc goes back, M toggles sound, F toggles fullscreen.

const ITEMS = 'button:not([disabled]), input[type="range"]'

function isRange(el: Element | null): el is HTMLInputElement {
  return el instanceof HTMLInputElement && el.type === 'range'
}

export function useMenuKeys(root: RefObject<HTMLElement | null>, onBack?: () => void): void {
  const { settings, update } = useSettings()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.repeat && (e.code === 'KeyF' || e.code === 'KeyM')) return
      const container = root.current
      if (!container) return
      const items = Array.from(container.querySelectorAll<HTMLElement>(ITEMS))
      const active = document.activeElement
      const index = items.indexOf(active as HTMLElement)
      const sound = (kind: Parameters<typeof playSfx>[0]) => {
        if (settings.soundOn) playSfx(kind, settings.volume)
      }
      const move = (step: number) => {
        if (!items.length) return
        const next = index < 0 ? (step > 0 ? 0 : items.length - 1) : (index + step + items.length) % items.length
        items[next].focus()
        sound('move')
      }

      switch (e.code) {
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault()
          move(1)
          break
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault()
          move(-1)
          break
        case 'ArrowRight':
        case 'KeyD':
        case 'ArrowLeft':
        case 'KeyA': {
          const forward = e.code === 'ArrowRight' || e.code === 'KeyD'
          if (isRange(active)) {
            if (e.code === 'KeyA' || e.code === 'KeyD') {
              e.preventDefault()
              if (forward) active.stepUp(5)
              else active.stepDown(5)
              active.dispatchEvent(new Event('input', { bubbles: true }))
            }
            break // arrows on a slider keep their native behaviour
          }
          e.preventDefault()
          move(forward ? 1 : -1)
          break
        }
        case 'KeyE':
          if (active instanceof HTMLButtonElement && container.contains(active)) {
            e.preventDefault()
            active.click()
          }
          break
        case 'Escape':
        case 'Backspace':
          if (onBack) {
            e.preventDefault()
            onBack()
          }
          break
        case 'KeyM':
          e.preventDefault()
          update({ soundOn: !settings.soundOn })
          if (!settings.soundOn) playSfx('toggle', settings.volume)
          break
        case 'KeyF':
          e.preventDefault()
          toggleFullscreen()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [root, onBack, settings.soundOn, settings.volume, update])
}
