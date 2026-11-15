import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MusicDirector } from './audio/MusicDirector'
import { BlueprintPage } from './blueprint/BlueprintPage'
import { LanguageScreen } from './menu/LanguageScreen'
import { MainMenu } from './menu/MainMenu'
import { MenuLayout } from './menu/MenuLayout'
import { SettingsScreen } from './menu/SettingsScreen'
import { ConceptStage } from './mission/ConceptStage'
import { CreditsScreen } from './mission/CreditsScreen'
import { GoalStage } from './mission/GoalStage'
import { FlightStage } from './mission/LaterStages'
import { MissionSelect } from './mission/MissionSelect'
import { MissionShell } from './mission/MissionShell'
import { NotFoundPage } from './pages/NotFoundPage'
import { ReportStage } from './report/ReportStage'
import { SettingsProvider } from './settings/SettingsProvider'

// HashRouter: deep links live after "#", so the build runs from any static path.
// Menu screens share the starry sky; the five mission stages (D41) share one mission state.
export default function App() {
  return (
    <SettingsProvider>
      <MusicDirector />
      <HashRouter>
        <Routes>
          <Route path="mission/:missionId" element={<MissionShell />}>
            <Route index element={<Navigate to="goal" replace />} />
            <Route path="goal" element={<GoalStage />} />
            <Route path="concept" element={<ConceptStage />} />
            <Route path="design" element={<BlueprintPage />} />
            <Route path="flight" element={<FlightStage />} />
            <Route path="report" element={<ReportStage />} />
          </Route>
          {/* Old link from task 009. */}
          <Route path="blueprint" element={<Navigate to="/mission/sat-orbit/design" replace />} />
          <Route element={<MenuLayout />}>
            <Route index element={<MainMenu />} />
            <Route path="missions" element={<MissionSelect />} />
            <Route path="credits" element={<CreditsScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
            <Route path="language" element={<LanguageScreen />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </SettingsProvider>
  )
}
