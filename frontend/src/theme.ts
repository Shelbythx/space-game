import { createTheme } from '@mui/material/styles'

// Blueprint look (D54): dark drafting background, grid, thin cyan lines, mono numbers.
export const blueprint = {
  paper: '#0b1a2e',
  panel: '#10243d',
  line: '#2f5d8a',
  grid: 'rgba(120, 180, 230, 0.08)',
  ink: '#e6f1ff',
  inkMuted: '#8fb0d0',
  accent: '#5cc8ff',
  ok: '#5fd39a',
  warn: '#f2c14e',
  fail: '#ff6b6b',
} as const

export const monoFont = '"IBM Plex Mono", ui-monospace, monospace'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: blueprint.paper, paper: blueprint.panel },
    primary: { main: blueprint.accent },
    success: { main: blueprint.ok },
    warning: { main: blueprint.warn },
    error: { main: blueprint.fail },
    text: { primary: blueprint.ink, secondary: blueprint.inkMuted },
    divider: blueprint.line,
  },
  shape: { borderRadius: 2 },
  typography: {
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    h1: { fontFamily: monoFont, fontWeight: 500, letterSpacing: '0.04em' },
    h2: { fontFamily: monoFont, fontWeight: 500, letterSpacing: '0.04em' },
    button: { fontFamily: monoFont, letterSpacing: '0.08em' },
    overline: { fontFamily: monoFont, letterSpacing: '0.16em' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: blueprint.paper,
          backgroundImage: `linear-gradient(${blueprint.grid} 1px, transparent 1px),
            linear-gradient(90deg, ${blueprint.grid} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          minHeight: '100vh',
        },
      },
    },
    MuiPaper: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderColor: blueprint.line, backgroundImage: 'none' } },
    },
    MuiButton: {
      defaultProps: { variant: 'outlined', disableElevation: true },
    },
  },
})
