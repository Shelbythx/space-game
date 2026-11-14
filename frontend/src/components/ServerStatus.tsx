import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import type { ServerState } from '../api/useServerWake'
import { blueprint } from '../theme'

const COLOR: Record<ServerState, string> = {
  waking: blueprint.warn,
  ready: blueprint.ok,
  unreachable: blueprint.fail,
}

export function ServerStatus({ state }: { state: ServerState }) {
  const { t } = useTranslation()
  return (
    <Box role="status" aria-live="polite" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        component="span"
        aria-hidden
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: COLOR[state],
          flexShrink: 0,
          animation: state === 'waking' ? 'smdg-pulse 1.2s ease-in-out infinite' : 'none',
          '@keyframes smdg-pulse': { '50%': { opacity: 0.3 } },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />
      <Typography variant="body2" color="text.secondary">
        {t(`server.${state}`)}
      </Typography>
    </Box>
  )
}
