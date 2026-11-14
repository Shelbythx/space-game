import { HashRouter, Route, Routes } from 'react-router-dom'
import { useServerWake } from './api/useServerWake'
import { MenuPage } from './pages/MenuPage'
import { NotFoundPage } from './pages/NotFoundPage'

// HashRouter: GitHub Pages has no rewrites, so deep links must live after "#" (D61).
export default function App() {
  const server = useServerWake()
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MenuPage server={server} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </HashRouter>
  )
}
