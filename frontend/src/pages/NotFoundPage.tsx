import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PixelButton } from '../menu/PixelControls'
import { useMenuKeys } from '../menu/useMenuKeys'

export function NotFoundPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const root = useRef<HTMLDivElement>(null)
  const back = useCallback(() => navigate('/'), [navigate])
  useMenuKeys(root, back)

  return (
    <div className="mm-screen" ref={root}>
      <h2 className="mm-heading">{t('notFound.title')}</h2>
      <p className="mm-tagline">{t('notFound.body')}</p>
      <div className="mm-stack">
        <PixelButton onClick={back}>{t('notFound.back')}</PixelButton>
      </div>
    </div>
  )
}
