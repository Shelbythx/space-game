import { useNavigate } from 'react-router-dom'
import { useGameText } from '../blueprint/format'
import { STAGES, useMission } from './context'

// Stages 4 «Flight» and 5 «Report» (D41) until tasks 010 and 011 fill them. The report
// already lists the evaluation's checks by NASA segment and returns to any stage.

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

export function ReportStage() {
  const { t, msg } = useGameText()
  const navigate = useNavigate()
  const { evaluation } = useMission()
  const fails = evaluation?.checks.filter((c) => c.status === 'fail') ?? []
  return (
    <div className="flow-page">
      <section className="bp-group flow-brief">
        <h2>{t('bp.stage.report')}</h2>
        <p className="flow-lead">{t('flow.report.soon')}</p>
        {evaluation && (
          <p className={fails.length ? 'flow-verdict flow-verdict-fail' : 'flow-verdict'}>
            {fails.length ? t('flow.report.notReady', { count: fails.length }) : t('flow.report.ready')}
          </p>
        )}
        <ul className="flow-list">
          {fails.map((c, i) => (
            <li key={`${c.code}-${i}`}>
              {t(`segment.${c.segment}`)}: {msg(c)}
            </li>
          ))}
        </ul>
      </section>
      <section className="bp-group">
        <h3>{t('flow.report.back')}</h3>
        <div className="flow-nav flow-nav-wrap">
          {STAGES.filter((s) => s !== 'report').map((s) => (
            <button key={s} type="button" className="mm-btn" onClick={() => navigate(`../${s}`)}>
              {t(`bp.stage.${s}`)}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
