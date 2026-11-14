import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../settings/context'
import { playSfx, useSfx } from '../settings/sfx'
import { canFullscreen, isIos, toggleFullscreen, useIsFullscreen } from './fullscreen'
import { PixelButton, PixelSlider } from './PixelControls'
import { useMenuKeys } from './useMenuKeys'

export function SettingsScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { settings, update } = useSettings()
  const sfx = useSfx()
  const fullscreen = useIsFullscreen()
  const root = useRef<HTMLDivElement>(null)

  const back = useCallback(() => {
    sfx('back')
    navigate('/')
  }, [navigate, sfx])
  useMenuKeys(root, back)

  const state = (on: boolean) => t(on ? 'settings.on' : 'settings.off')
  const volumePct = Math.round(settings.volume * 100)

  return (
    <div className="mm-screen" ref={root}>
      <h2 className="mm-heading">{t('settings.title')}</h2>

      <div className="mm-options">
        <PixelButton
          aria-pressed={settings.soundOn}
          onClick={() => {
            const next = !settings.soundOn
            update({ soundOn: next })
            if (next) playSfx('toggle', settings.volume)
          }}
        >
          {t('settings.sound', { state: state(settings.soundOn) })}
        </PixelButton>

        <PixelSlider
          label={t('settings.volume', { value: volumePct })}
          ariaLabel={t('settings.volumeLabel')}
          value={volumePct}
          onChange={(value) => update({ volume: value / 100 })}
        />

        <PixelButton
          aria-pressed={settings.skyMotion}
          onClick={() => {
            update({ skyMotion: !settings.skyMotion })
            sfx('toggle')
          }}
        >
          {t('settings.sky', { state: state(settings.skyMotion) })}
        </PixelButton>

        {canFullscreen() ? (
          <PixelButton
            aria-pressed={fullscreen}
            onClick={() => {
              toggleFullscreen()
              sfx('toggle')
            }}
          >
            {t('settings.fullscreen', { state: state(fullscreen) })}
          </PixelButton>
        ) : (
          <p className="mm-option-note">{isIos() ? t('settings.fullscreenIos') : t('settings.fullscreenNone')}</p>
        )}
      </div>

      <p className="mm-keys">{t('settings.keys')}</p>

      <div className="mm-stack">
        <PixelButton onClick={back}>{t('settings.done')}</PixelButton>
      </div>
    </div>
  )
}
