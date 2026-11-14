import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useSfx } from '../settings/sfx'
import { PixelButton } from './PixelControls'
import { useMenuKeys } from './useMenuKeys'

type Mode = 'solo' | 'coop' | 'arcade'

export function MainMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const sfx = useSfx()
  const root = useRef<HTMLDivElement>(null)
  const [notice, setNotice] = useState<Mode | null>(null)
  useMenuKeys(root)

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), 3200)
    return () => window.clearTimeout(id)
  }, [notice])

  // The three modes are built in later tasks; until then they say so.
  const openMode = (mode: Mode) => {
    sfx('deny')
    setNotice(mode)
  }
  const go = (path: string) => {
    sfx('select')
    navigate(path)
  }

  return (
    <div className="mm-screen" ref={root}>
      <header className="mm-title">
        <p className="mm-kicker">NASA Space Apps 2026</p>
        <h1 className="mm-logo">
          <span>Space Mission</span>
          <span className="mm-logo-accent">Design Game</span>
        </h1>
        <p className="mm-tagline">{t('app.tagline')}</p>
      </header>

      <nav className="mm-stack" aria-label={t('menu.label')}>
        <p className="mm-group" aria-hidden="true">
          {t('menu.scienceMode')}
        </p>
        <PixelButton onClick={() => openMode('solo')}>{t('menu.solo')}</PixelButton>
        <PixelButton onClick={() => openMode('coop')}>{t('menu.coop')}</PixelButton>
        <p className="mm-group" aria-hidden="true">
          {t('menu.arcadeMode')}
        </p>
        <PixelButton onClick={() => openMode('arcade')}>{t('menu.arcade')}</PixelButton>
        <div className="mm-row">
          <PixelButton onClick={() => go('/settings')}>{t('menu.settings')}</PixelButton>
          <PixelButton onClick={() => go('/language')}>{t('menu.language')}</PixelButton>
        </div>
      </nav>

      <div className="mm-toast-slot" role="status" aria-live="polite">
        {notice && <div className="mm-toast">{t(`menu.soon.${notice}`)}</div>}
      </div>
    </div>
  )
}
