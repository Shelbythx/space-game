import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PixelButton } from '../menu/PixelControls'
import { useMenuKeys } from '../menu/useMenuKeys'
import './mission.css'

// Credits with the NASA sources the game uses (rule 9 in CLAUDE.md, assets/CREDITS.md,
// docs/physics-sources.md). Names of documents stay in English, as published.

const NASA_SOURCES: Array<[string, string]> = [
  ['Earth Fact Sheet — NSSDCA, NASA GSFC', 'credits.use.constants'],
  ['S. L. Rickman, Introduction to Orbital Mechanics and Spacecraft Attitudes for Thermal Engineers — NASA NESC (NTRS 20205003902)', 'credits.use.orbit'],
  ['GMAT Mathematical Specifications — NASA GSFC (NTRS 20080031744)', 'credits.use.gmat'],
  ["Beginner's Guide to Aeronautics: Drag Equation, Ideal Rocket Equation — NASA Glenn", 'credits.use.glenn'],
  ['U.S. Standard Atmosphere, 1976 — NASA-TM-X-74335', 'credits.use.atmosphere'],
  ['NASA-STD-8719.14C, Process for Limiting Orbital Debris', 'credits.use.debris'],
  ['GSFC-STD-1000 Rev I, Rules for the Design… (Gold Rules)', 'credits.use.margins'],
  ['State-of-the-Art of Small Spacecraft Technology, 2026 — NASA Ames SSVI', 'credits.use.parts'],
  ['NASA Systems Engineering Handbook, SP-2016-6105 Rev 2', 'credits.use.scores'],
  ["Near Earth Network Users' Guide, 453-NENUG — NASA GSFC", 'credits.use.stations'],
  ['Guidelines on Lithium-ion Battery Use in Space Applications, NASA/TM-2009-215751', 'credits.use.battery'],
  ['DONKI Space Weather Database — NASA CCMC', 'credits.use.donki'],
]

export function CreditsScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const root = useRef<HTMLDivElement>(null)
  const back = useCallback(() => navigate('/'), [navigate])
  useMenuKeys(root, back)

  return (
    <div className="mm-screen" ref={root}>
      <h2 className="mm-heading">{t('credits.title')}</h2>
      <div className="flow-credits">
        <section>
          <h3>{t('credits.nasa')}</h3>
          <ul>
            {NASA_SOURCES.map(([doc, use]) => (
              <li key={doc}>
                <strong>{doc}</strong>
                <span>{t(use)}</span>
              </li>
            ))}
          </ul>
          <p className="mm-note">{t('credits.noLogo')}</p>
        </section>
        <section>
          <h3>{t('credits.team')}</h3>
          <ul>
            <li>
              <strong>{t('credits.music')}</strong>
              <span>Stiluss</span>
            </li>
            <li>
              <strong>{t('credits.fonts')}</strong>
              <span>Tiny5 (Stefie Justprince), IBM Plex Sans / Mono (IBM) — SIL OFL 1.1</span>
            </li>
            <li>
              <strong>{t('credits.ai')}</strong>
              <span>{t('credits.aiText')}</span>
            </li>
          </ul>
        </section>
      </div>
      <div className="mm-stack">
        <PixelButton onClick={back}>{t('settings.done')}</PixelButton>
      </div>
    </div>
  )
}
