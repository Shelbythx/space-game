import { HashRouter, Route, Routes } from 'react-router-dom'
import { BlueprintPage } from './blueprint/BlueprintPage'
import { LanguageScreen } from './menu/LanguageScreen'
import { MainMenu } from './menu/MainMenu'
import { MenuLayout } from './menu/MenuLayout'
import { SettingsScreen } from './menu/SettingsScreen'
import { NotFoundPage } from './pages/NotFoundPage'
import { SettingsProvider } from './settings/SettingsProvider'

// HashRouter: deep links live after "#", so the build runs from any static path.
export default function App() {
  return (
    <SettingsProvider>
      <HashRouter>
        <Routes>
          {/* Temporary entry until task 008 adds mission choice and stages. */}
          <Route path="blueprint" element={<BlueprintPage />} />
          <Route element={<MenuLayout />}>
            <Route index element={<MainMenu />} />
            <Route path="settings" element={<SettingsScreen />} />
            <Route path="language" element={<LanguageScreen />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </SettingsProvider>
  )
}
