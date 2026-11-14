import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LANGUAGES, setLanguage } from '../i18n'
import { useSfx } from '../settings/sfx'
import { PixelButton } from './PixelControls'
import { useMenuKeys } from './useMenuKeys'

export function LanguageScreen() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const sfx = useSfx()
  const root = useRef<HTMLDivElement>(null)

  const back = useCallback(() => {
    sfx('back')
    navigate('/')
  }, [navigate, sfx])
  useMenuKeys(root, back)

  return (
    <div className="mm-screen" ref={root}>
      <h2 className="mm-heading">{t('languageScreen.title')}</h2>
      <div className="mm-stack" role="group" aria-label={t('languageScreen.title')}>
        {LANGUAGES.map((lang) => {
          const current = i18n.language === lang.code
          return (
            <PixelButton
              key={lang.code}
              lang={lang.code}
              aria-pressed={current}
              className={current ? 'mm-btn-current' : undefined}
              onClick={() => {
                setLanguage(lang.code)
                sfx('select')
              }}
            >
              {current ? `> ${lang.label} <` : lang.label}
            </PixelButton>
          )
        })}
      </div>
      <p className="mm-note">{t('languageScreen.note')}</p>
      <div className="mm-stack">
        <PixelButton onClick={back}>{t('settings.done')}</PixelButton>
      </div>
    </div>
  )
}
