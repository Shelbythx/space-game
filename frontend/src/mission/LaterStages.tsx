import { useNavigate } from 'react-router-dom'
import { useGameText } from '../blueprint/format'

// Stage 4 «Flight» (D41) until task 010 fills it. The report is in src/report (task 011).

export function FlightStage() {
  const { t } = useGameText()
  const navigate = useNavigate()
  return (
    <div className="flow-page">
      <section className="bp-group flow-brief">
        <h2>{t('bp.stage.flight')}</h2>
        <p className="flow-lead">{t('flow.flight.soon')}</p>
      </section>
      <div className="flow-nav">
        <button type="button" className="mm-btn" onClick={() => navigate('../design')}>
          {'<'} {t('bp.stage.design')}
        </button>
        <button type="button" className="mm-btn" onClick={() => navigate('../report')}>
          {t('bp.stage.report')} {'>'}
        </button>
      </div>
    </div>
  )
}
