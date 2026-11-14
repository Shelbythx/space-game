import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, setLanguage, type LanguageCode } from '../i18n'

export function LanguageSwitch() {
  const { t, i18n } = useTranslation()
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={i18n.language}
      onChange={(_, code: LanguageCode | null) => code && setLanguage(code)}
      aria-label={t('menu.language')}
    >
      {LANGUAGES.map((lang) => (
        <ToggleButton key={lang.code} value={lang.code} lang={lang.code}>
          {lang.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
