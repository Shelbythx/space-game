import { useNavigate } from 'react-router-dom'
import { useAdvisor } from '../advisor/useAdvisorState'
import type { Check, MissionEvent, Report, SimulationResult, Status } from '../api/types'
import { STAGES, useMission } from '../mission/context'
import { demoReport } from './demoReport'
import { ReportView } from './ReportView'
import { useReportText } from './reportText'
import { type AttemptsState, useSimulation } from './simulation'
import './report-stage.css'

// Stage 5 «Report» (D41, task 011). The full report — segments with causal chains (D49),
// bottleneck, four scores with formulas (D82), limits, similar mission (D85) and the previous
// attempt — is TheAdvental's ReportView (integration 15.11.2026, team decision). This wrapper
// runs the simulation (POST /api/simulate, D59), keeps the seed with «Fly again», lists flight
// events with real DONKI storms (D83) and, without the server, shows a demo built from the
// design checks.

function StatusBadge({ status }: { status: Status }) {
  const { t } = useReportText()
  return <span className={`rs-status rs-status-${status}`}>{t(`report.status.${status}`)}</span>
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
    <div className="rs-bottleneck">
      <span className="rs-bottleneck-label">
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
    <ul className="rs-checks">
      {checks.map((c, i) => (
        <li key={`${c.code}-${i}`}>
          <StatusBadge status={c.status} />
          <span>{say(c)}</span>
        </li>
      ))}
    </ul>
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
        <ol className="rs-events">
          {events.map((e, i) => (
            <li key={`${e.day}-${e.type}-${i}`} className={`rs-event rs-event-${e.type}`}>
              <span className="rs-day">{t('report.events.day', { day: e.day })}</span>
              <span className="rs-text">{say(e.message)}</span>
              <span className="rs-source">
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

function AttemptStatus({ attempts }: { attempts: AttemptsState }) {
  const { t } = useReportText()
  if (attempts.status === 'loading') return <span className="bp-note">{t('report.attempts.saving')}</span>
  if (attempts.status === 'failed') return <span className="bp-note">{t('report.attempts.failed')}</span>
  return null
}

function FullReport({ result, attempts, flyAgain }: { result: SimulationResult; attempts: AttemptsState; flyAgain: () => void }) {
  const { t } = useReportText()
  const navigate = useNavigate()
  const advisor = useAdvisor()
  return (
    <>
      <ReportView
        // ReportView's local types (report/types.ts) take `comparison: null`, the API may omit it.
        report={{ ...result.report, comparison: result.report.comparison ?? null }}
        previous={attempts.status === 'ready' ? attempts.previous : null}
        onGoTo={(stage) => navigate(`../${stage}`)}
      />
      <section className="bp-group">
        <div className="rs-seed">
          <span className="bp-note">{t('report.seed', { seed: result.seed })}</span>
          <AttemptStatus attempts={attempts} />
          <div className="flow-nav flow-nav-wrap">
            <button type="button" className="mm-btn" onClick={flyAgain}>
              {t('report.flyAgain')}
            </button>
            {/* The mentor explains this very flight in the mission's chat (D111, task 049). */}
            {advisor && (
              <button
                type="button"
                className="mm-btn"
                disabled={advisor.busy}
                onClick={() => advisor.explainReport(result.seed, t('advisor.explainRequest'))}
              >
                {t('advisor.explain')}
              </button>
            )}
          </div>
        </div>
      </section>
      <Events events={result.events} />
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
        <p className="rs-demo-tag">{t('report.demo.tag')}</p>
        <p className={demo.success ? 'flow-verdict' : 'flow-verdict flow-verdict-fail'}>
          {t(demo.success ? 'report.demo.ready' : 'report.demo.notReady')}
        </p>
        <p className="flow-lead">{t('report.demo.note')}</p>
        {demo.bottleneck && <Bottleneck bottleneck={demo.bottleneck} />}
      </section>
      <section className="bp-group">
        <h3>{t('report.segments.title')}</h3>
        <div className="rs-segments">
          {demo.segments.map((s) => (
            <article key={s.segment} className={`rs-seg rs-seg-${s.status}`}>
              <header>
                <h4>{t(`segment.${s.segment}`)}</h4>
                <StatusBadge status={s.status} />
              </header>
              <p className="rs-seg-what">{t(`report.segmentWhat.${s.segment}`)}</p>
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
    <div className="flow-page rs-page">
      {simulation.status === 'loading' && (
        <section className="bp-group flow-brief">
          <p className="flow-lead rs-wait" role="status">
            {t('report.loading')}
          </p>
        </section>
      )}
      {simulation.status === 'error' && (
        <section className="bp-group flow-brief">
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
      {/* ReportView has its own «back to a stage» buttons; the other states need ours. */}
      {simulation.status !== 'ready' && <BackToStages />}
    </div>
  )
}
