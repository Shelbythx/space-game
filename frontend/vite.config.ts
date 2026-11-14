import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base + HashRouter: the build works on GitHub Pages under /<repo>/ and from any
// static host without server rewrites (D61).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173 },
})
