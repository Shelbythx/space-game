import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import type { ServerState } from '../api/useServerWake'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { ServerStatus } from '../components/ServerStatus'

// Placeholder menu for the skeleton (task 007). The mission flow arrives in task 008.
export function MenuPage({ server }: { server: ServerState }) {
  const { t } = useTranslation()
  const items = ['start', 'coop', 'arcade', 'settings'] as const

  return (
    <Box
      component="main"
      sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, py: 6 }}
    >
      <Stack spacing={4} sx={{ width: '100%', maxWidth: 420 }}>
        <Box>
          <Typography variant="overline" color="primary">
            NASA Space Apps 2026
          </Typography>
          <Typography variant="h1" sx={{ fontSize: { xs: '1.9rem', sm: '2.4rem' }, mt: 0.5 }}>
            {t('app.title')}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1.5 }}>
            {t('app.tagline')}
          </Typography>
        </Box>

        <Stack spacing={1.5} component="nav">
          {items.map((item) => (
            <Button key={item} size="large" disabled fullWidth sx={{ justifyContent: 'space-between' }}>
              <span>{t(`menu.${item}`)}</span>
              <Typography component="span" variant="caption" color="text.secondary">
                {t('menu.comingSoon')}
              </Typography>
            </Button>
          ))}
        </Stack>

        <Stack spacing={2}>
          <LanguageSwitch />
          <ServerStatus state={server} />
        </Stack>
      </Stack>
    </Box>
  )
}
