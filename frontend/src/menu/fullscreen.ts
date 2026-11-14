import { useEffect, useState } from 'react'

type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void }
type FsDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}

export function canFullscreen(): boolean {
  const root = document.documentElement as FsElement
  return Boolean(root.requestFullscreen || root.webkitRequestFullscreen)
}

export function isFullscreen(): boolean {
  const doc = document as FsDocument
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement)
}

/** iPhone Safari has no fullscreen API; the way there is "Add to Home Screen". */
export function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

export function toggleFullscreen(): void {
  const doc = document as FsDocument
  try {
    if (isFullscreen()) {
      const exit = doc.exitFullscreen?.bind(doc) ?? doc.webkitExitFullscreen?.bind(doc)
      void Promise.resolve(exit?.()).catch(() => {})
      return
    }
    const root = document.documentElement as FsElement
    const request = root.requestFullscreen?.bind(root) ?? root.webkitRequestFullscreen?.bind(root)
    void Promise.resolve(request?.()).catch(() => {})
  } catch {
    // Some embedded browsers refuse fullscreen; nothing else to do.
  }
}

export function useIsFullscreen(): boolean {
  const [on, setOn] = useState(isFullscreen)
  useEffect(() => {
    const sync = () => setOn(isFullscreen())
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [])
  return on
}
