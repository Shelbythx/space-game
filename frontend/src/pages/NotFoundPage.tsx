import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h2" sx={{ fontSize: '1.6rem' }}>
          {t('notFound.title')}
        </Typography>
        <Typography color="text.secondary" sx={{ my: 2 }}>
          {t('notFound.body')}
        </Typography>
        <Button component={Link} to="/">
          {t('notFound.back')}
        </Button>
      </Box>
    </Box>
  )
}
