// Demo page for the report (task 011): open /src/report/demo/index.html on the Vite dev
// server. Not part of the production build; uses made-up sample data, not the backend.
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { theme } from '../../theme'
import { Demo } from './Demo'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Demo />
    </ThemeProvider>
  </StrictMode>,
)
