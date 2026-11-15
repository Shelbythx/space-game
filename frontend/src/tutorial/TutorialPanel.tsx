import { useState } from 'react'
import { useGameText } from '../blueprint/format'
import { readStorage, writeStorage } from '../lib/storage'
import { STAGES, type Stage, useMission } from '../mission/context'
import './tutorial.css'

// Training level «First CubeSat» (D78, task 025): step-by-step hints over the simple
// version — what to do on this stage, why it matters, what the roles say right now, and
// the terms that appear here for the first time (D53). The hints only explain; every
// number still comes from the backend (D59).

const TERMS: Record<Stage, string[]> = {
  goal: ['cubesat', 'iss', 'budget'],
  concept: ['orbit', 'inclination', 'shadow', 'groundStation'],
  design: ['margin', 'slots', 'uhf'],
  flight: ['drag', 'groundTrack', 'contact'],
  report: ['bottleneck', 'segment', 'seed'],
}

const HIDDEN_KEY = 'smdg.tutorial.hidden'

export function TutorialPanel({ stage }: { stage: Stage }) {
  const { t, msg } = useGameText()
  const { evaluation } = useMission()
  const [open, setOpen] = useState(() => readStorage(HIDDEN_KEY) !== '1')
  const toggle = () => {
    writeStorage(HIDDEN_KEY, open ? '1' : '0')
    setOpen(!open)
  }

  // On the stages where the player changes the design, the first warning of a role says
  // what to look at now.
  const live = stage === 'concept' || stage === 'design'
  const warning = live ? evaluation?.comments.find((c) => c.severity === 'warn') : undefined

  return (
    <aside className="tt-panel" aria-label={t('tutorial.title')}>
      <header className="tt-head">
        <span className="tt-step">{t('tutorial.step', { n: STAGES.indexOf(stage) + 1, total: STAGES.length })}</span>
        <h3>{t(`tutorial.${stage}.title`)}</h3>
        <button type="button" className="tt-toggle" aria-expanded={open} onClick={toggle}>
          {open ? t('tutorial.hide') : t('tutorial.show')}
        </button>
      </header>
      {open && (
        <div className="tt-body">
          <p>
            <b>{t('tutorial.do')}</b> {t(`tutorial.${stage}.do`)}
          </p>
          <p>
            <b>{t('tutorial.why')}</b> {t(`tutorial.${stage}.why`)}
          </p>
          {live && evaluation && (
            <p className="tt-now">
              <b>{t('tutorial.now')}</b>{' '}
              {warning ? `${msg(warning.message)}${warning.advice ? ` ${msg(warning.advice)}` : ''}` : t('tutorial.allGood')}
            </p>
          )}
          <div className="tt-terms">
            <span className="tt-terms-label">{t('tutorial.terms')}</span>
            {TERMS[stage].map((key) => (
              <details key={key} className="tt-term">
                <summary>{t(`tutorial.term.${key}.name`)}</summary>
                <p>{t(`tutorial.term.${key}.text`)}</p>
              </details>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
