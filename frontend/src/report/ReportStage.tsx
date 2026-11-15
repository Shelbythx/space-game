import { useNavigate } from 'react-router-dom'
import type { Check, MissionEvent, Report, SimulationResult, Status } from '../api/types'
import { STAGES, useMission } from '../mission/context'
import { demoReport } from './demoReport'
import { useReportText } from './reportText'
import { type AttemptsState, useSimulation } from './simulation'
import './report.css'

// Stage 5 «Report» (D41, task 011): the four NASA segments with their causal chains
// «decision → physics → consequence» (D49, D53), the bottleneck, four scores with their
// formulas (D82), mission limits, flight events with real DONKI storms (D83), the similar
// mission (D85) and the previous attempt. Everything comes from POST /api/simulate (D59);
// without the server the screen shows a demo built from the design checks.

const SCORES = ['missionSuccess', 'scienceValue', 'resourceEfficiency', 'decisionQuality'] as const

function StatusBadge({ status }: { status: Status }) {
  const { t } = useReportText()
  return <span className={`rp-status rp-status-${status}`}>{t(`report.status.${status}`)}</span>
}

function BackToStages() {
  const { t } = useReportText()
  const navigate = useNavigate()
  return (
    <section className="bp-group">
      <h3>{t('report.back')}</h3>
      <div className="flow-nav flow-nav-wrap">
        {STAGES.filter((s) => s !== 'report').map((s) => (
          <button key={s} type="button" className="mm-btn" onClick={() => navigate(`../${s}`)}>
            {'<'} {t(`bp.stage.${s}`)}
          </button>
        ))}
      </div>
    </section>
  )
}

function Bottleneck({ bottleneck }: { bottleneck: Report['bottleneck'] }) {
  const { t, say } = useReportText()
  return (
    <div className="rp-bottleneck">
      <span className="rp-bottleneck-label">
        {t('report.bottleneck.title')}: {t(`resource.${bottleneck.resource}`)}
      </span>
      <p>{say(bottleneck)}</p>
      <p className="bp-note">{t('report.bottleneck.hint')}</p>
    </div>
  )
}

function CheckList({ checks }: { checks: Array<Pick<Check, 'status' | 'code' | 'params'>> }) {
  const { say } = useReportText()
  return (
    <ul className="rp-checks">
      {checks.map((c, i) => (
        <li key={`${c.code}-${i}`}>
          <StatusBadge status={c.status} />
          <span>{say(c)}</span>
        </li>
      ))}
    </ul>
  )
}

function Scores({ report }: { report: Report }) {
  const { t } = useReportText()
  return (
    <section className="bp-group">
      <h3>{t('report.scores.title')}</h3>
      <div className="rp-scores">
        {SCORES.map((key) => {
          const score = report.scores[key]
          const value = Math.max(0, Math.min(100, score.value))
          const cargo = key === 'scienceValue' && score.formula.includes('cargo')
          return (
            <div key={key} className="rp-score">
              <span className="rp-score-name">{t(`report.scores.${key}.name`)}</span>
              <span className="rp-score-value">
                {score.value}
                <small>/100</small>
              </span>
              <span className="rp-bar" aria-hidden="true">
                <span style={{ width: `${value}%` }} />
              </span>
              <code className="rp-formula">{score.formula}</code>
              <p>{t(`report.scores.${key}.explain`, { context: cargo ? 'cargo' : undefined })}</p>
            </div>
          )
        })}
      </div>
      <p className="bp-note">{t('report.scores.source')}</p>
    </section>
  )
}

function Segments({ report }: { report: Report }) {
  const { t, say } = useReportText()
  return (
    <section className="bp-group">
      <h3>{t('report.segments.title')}</h3>
      <p className="bp-note">{t('report.segments.hint')}</p>
      <div className="rp-segments">
        {report.segments.map((s) => (
          <article key={s.segment} className={`rp-seg rp-seg-${s.status}`}>
            <header>
              <h4>{t(`segment.${s.segment}`)}</h4>
              <StatusBadge status={s.status} />
            </header>
            <p className="rp-seg-what">{t(`report.segmentWhat.${s.segment}`)}</p>
            <ol className="rp-chain">
              {s.chain.map((link, i) => (
                <li key={`${link.code}-${i}`} className={`rp-link rp-link-${link.kind}`}>
                  <span className="rp-kind">{t(`report.kind.${link.kind}`)}</span>
                  <span className="rp-text">{say(link)}</span>
                  {link.formula && link.formula !== '—' && <code className="rp-formula">{link.formula}</code>}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  )
}

function Events({ events }: { events: MissionEvent[] }) {
  const { t, say, number, date } = useReportText()
  const donki = events.find((e) => e.source.kind === 'donki')?.source
  return (
    <section className="bp-group">
      <h3>{t('report.events.title')}</h3>
      {donki?.kind === 'donki' && (
        <p className="bp-note">
          {t('report.events.period', { start: date(donki.periodStart), end: date(donki.periodEnd) })}
        </p>
      )}
      {events.length === 0 ? (
        <p className="flow-lead">{t('report.events.none')}</p>
      ) : (
        <ol className="rp-events">
          {events.map((e, i) => (
            <li key={`${e.day}-${e.type}-${i}`} className={`rp-event rp-event-${e.type}`}>
              <span className="rp-day">{t('report.events.day', { day: e.day })}</span>
              <span className="rp-text">{say(e.message)}</span>
              <span className="rp-source">
                {e.source.kind === 'donki'
                  ? e.source.observedAt
                    ? t('report.events.donki', {
                        date: date(e.source.observedAt),
                        kp: e.source.kp === null ? '—' : number(e.source.kp),
                        id: e.source.eventId ?? '—',
                      })
                    : t('report.events.donkiMissing')
                  : t('report.events.seeded')}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function Comparison({ report }: { report: Report }) {
  const { t, number } = useReportText()
  const c = report.comparison
  return (
    <section className="bp-group">
      <h3>{t('report.comparison.title')}</h3>
      {!c ? (
        <p className="flow-lead">{t('report.comparison.none')}</p>
      ) : (
        <>
          <p className="flow-lead">
            <strong>{t(c.nameCode, { defaultValue: c.missionId })}</strong> — {t(`report.comparison.kind.${c.kind}`)}
          </p>
          <dl className="flow-facts">
            {Object.entries(c.deltas).map(([key, value]) => (
              <div key={key}>
                <dt>{t(`report.comparison.delta.${key}`)}</dt>
                <dd>
                  {value !== undefined && value > 0 ? '+' : ''}
                  {number(value ?? 0)} {t(`report.comparison.unit.${key}`)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="bp-note">
            {t('report.comparison.deltaHint')}
            {c.source?.note && ` ${t('report.comparison.source')}: ${c.source.note}.`}
            {c.source?.url && (
              <>
                {' '}
                <a href={c.source.url} target="_blank" rel="noreferrer">
                  {c.source.url}
                </a>
              </>
            )}
          </p>
        </>
      )}
    </section>
  )
}

function Attempts({ attempts, report }: { attempts: AttemptsState; report: Report }) {
  const { t, date } = useReportText()
  let body
  if (attempts.status === 'loading') body = <p className="flow-lead">{t('report.attempts.saving')}</p>
  else if (attempts.status === 'failed') body = <p className="flow-lead">{t('report.attempts.failed')}</p>
  else if (!attempts.previous) body = <p className="flow-lead">{t('report.attempts.first')}</p>
  else {
    const prev = attempts.previous
    body = (
      <>
        <p className="flow-lead">
          {t('report.attempts.previous', {
            when: `${date(prev.createdAt)} ${new Date(prev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          })}{' '}
          {t(prev.success ? 'report.attempts.wasSuccess' : 'report.attempts.wasFailure')}
        </p>
        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                <th>{t('report.attempts.score')}</th>
                <th>{t('report.attempts.before')}</th>
                <th>{t('report.attempts.now')}</th>
                <th>{t('report.attempts.change')}</th>
              </tr>
            </thead>
            <tbody>
              {SCORES.map((key) => {
                const before = prev.scores[key].value
                const now = report.scores[key].value
                const diff = now - before
                return (
                  <tr key={key}>
                    <td>{t(`report.scores.${key}.name`)}</td>
                    <td>{before}</td>
                    <td>{now}</td>
                    <td className={diff > 0 ? 'rp-up' : diff < 0 ? 'rp-down' : ''}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="bp-note">
          {t('report.attempts.bottleneckWas', { resource: t(`resource.${prev.bottleneck.resource}`).toLowerCase() })}
        </p>
      </>
    )
  }
  return (
    <section className="bp-group">
      <h3>{t('report.attempts.title')}</h3>
      {body}
    </section>
  )
}

function FullReport({ result, attempts, flyAgain }: { result: SimulationResult; attempts: AttemptsState; flyAgain: () => void }) {
  const { t } = useReportText()
  const navigate = useNavigate()
  const { report } = result
  return (
    <>
      <section className="bp-group flow-brief">
        <h2>{t('bp.stage.report')}</h2>
        <p className={report.success ? 'flow-verdict' : 'flow-verdict flow-verdict-fail'}>
          {t(report.success ? 'report.success' : 'report.failure')}
        </p>
        <p className="flow-lead">{t('report.lead')}</p>
        <Bottleneck bottleneck={report.bottleneck} />
        <div className="rp-seed">
          <span className="bp-note">{t('report.seed', { seed: result.seed })}</span>
          <div className="flow-nav flow-nav-wrap">
            <button type="button" className="mm-btn" onClick={() => navigate('../flight')}>
              {'<'} {t('bp.stage.flight')}
            </button>
            <button type="button" className="mm-btn" onClick={flyAgain}>
              {t('report.flyAgain')}
            </button>
          </div>
        </div>
      </section>
      <Scores report={report} />
      <Segments report={report} />
      <section className="bp-group">
        <h3>{t('report.limits')}</h3>
        <CheckList checks={report.limits} />
      </section>
      <Events events={result.events} />
      <Comparison report={report} />
      <Attempts attempts={attempts} report={report} />
    </>
  )
}

function DemoView() {
  const { t } = useReportText()
  const { evaluation, mission } = useMission()
  if (!evaluation || !mission) return <p className="bp-loading">{t('bp.evaluating')}</p>
  const demo = demoReport(evaluation, mission)
  return (
    <>
      <section className="bp-group flow-brief">
        <h2>{t('bp.stage.report')}</h2>
        <p className="rp-demo-tag">{t('report.demo.tag')}</p>
        <p className={demo.success ? 'flow-verdict' : 'flow-verdict flow-verdict-fail'}>
          {t(demo.success ? 'report.demo.ready' : 'report.demo.notReady')}
        </p>
        <p className="flow-lead">{t('report.demo.note')}</p>
        {demo.bottleneck && <Bottleneck bottleneck={demo.bottleneck} />}
      </section>
      <section className="bp-group">
        <h3>{t('report.segments.title')}</h3>
        <div className="rp-segments">
          {demo.segments.map((s) => (
            <article key={s.segment} className={`rp-seg rp-seg-${s.status}`}>
              <header>
                <h4>{t(`segment.${s.segment}`)}</h4>
                <StatusBadge status={s.status} />
              </header>
              <p className="rp-seg-what">{t(`report.segmentWhat.${s.segment}`)}</p>
              {s.checks.length ? <CheckList checks={s.checks} /> : <p className="bp-note">{t('report.demo.noChecks')}</p>}
            </article>
          ))}
        </div>
      </section>
      <section className="bp-group">
        <h3>{t('report.limits')}</h3>
        <CheckList checks={demo.limits} />
      </section>
      <section className="bp-group">
        <h3>{t('report.demo.serverTitle')}</h3>
        <p className="flow-lead">{t('report.demo.needsServer')}</p>
      </section>
    </>
  )
}

export function ReportStage() {
  const { t } = useReportText()
  const { design } = useMission()
  const { simulation, attempts, flyAgain } = useSimulation(design)

  return (
    <div className="flow-page rp-page">
      {simulation.status === 'loading' && (
        <section className="bp-group flow-brief">
          <h2>{t('bp.stage.report')}</h2>
          <p className="flow-lead rp-wait" role="status">
            {t('report.loading')}
          </p>
        </section>
      )}
      {simulation.status === 'error' && (
        <section className="bp-group flow-brief">
          <h2>{t('bp.stage.report')}</h2>
          <p className="bp-error" role="alert">
            {t('report.error', { problem: simulation.problem })}
          </p>
          <div className="flow-nav flow-nav-wrap">
            <button type="button" className="mm-btn" onClick={flyAgain}>
              {t('report.retry')}
            </button>
          </div>
        </section>
      )}
      {simulation.status === 'offline' && <DemoView />}
      {simulation.status === 'ready' && <FullReport result={simulation.result} attempts={attempts} flyAgain={flyAgain} />}
      <BackToStages />
    </div>
  )
}
