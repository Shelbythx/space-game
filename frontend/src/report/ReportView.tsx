import { useTranslation } from 'react-i18next'
import { useGameText } from '../blueprint/format'
import { useReportText } from './reportText'
import { REPORT_NS } from './i18n'
import type { Params, PreviousAttempt, ReportData, ReportStage, ReportStatus, ScoreKey } from './types'
import './report.css'

interface Props {
  /** `simulate.report` from the backend. */
  report: ReportData
  /** The player's previous attempt at this mission, if any. */
  previous?: PreviousAttempt | null
  /** Go back to a stage to change the project (D41: the report returns to any stage). */
  onGoTo?: (stage: ReportStage) => void
}

const SCORE_KEYS: ScoreKey[] = ['missionSuccess', 'scienceValue', 'resourceEfficiency', 'decisionQuality']
const STAGES: ReportStage[] = ['goal', 'concept', 'design', 'flight']
const STATUS_MARK: Record<ReportStatus, string> = { ok: '✓', warn: '!', fail: '✕' }

/** i18n key for a backend code inside the report namespace (`check.space.slots` → as is). */
function bottleneckKey(resource: string, params: Params): string {
  if (resource === 'data' && 'usedKg' in params) return 'bottleneckText.dataCargo'
  if (resource === 'comms' && 'usedHours' in params) return 'bottleneckText.commsDocking'
  return `bottleneckText.${resource}`
}

function scoreValue(score: number | { value: number }): number {
  return typeof score === 'number' ? score : score.value
}

/**
 * Report stage (task 011): the four NASA segments with cause-and-effect chains, the
 * bottleneck, four scores with their formulas, a similar mission and the previous attempt.
 * Every number and formula comes from the backend (D59); this view only words them.
 */
export function ReportView({ report, previous, onGoTo }: Props) {
  const { t, i18n } = useTranslation(REPORT_NS)
  const { word } = useGameText()
  // Params range from air density (~10⁻¹³ kg/m³) to thousands of GB: format them by size.
  const { number } = useReportText()

  const format = (value: number) =>
    new Intl.NumberFormat(i18n.language, { maximumFractionDigits: Math.abs(value) < 10 ? 2 : 1 }).format(value)

  /** Backend params with numbers in the reader's locale and catalog ids as names. */
  const words = (code: string, params: Params, override?: string) => {
    // `relay` comes as 0 or 1; it reads better as two sentences than as a number.
    const key = override ?? (code === 'chain.decision.relay' ? `${code}${Number(params.relay) ? 'On' : 'Off'}` : code)
    return t(key, {
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, typeof v === 'number' ? number(v) : word(k, String(v))])),
      defaultValue: code,
    })
  }

  const reference = report.comparison
  const referenceName = reference
    ? t(reference.nameCode, { defaultValue: reference.missionId })
    : null

  return (
    <section className="rp" aria-label={t('title')}>
      <header className={`rp-head rp-head--${report.success ? 'ok' : 'fail'}`}>
        <div>
          <h2 className="rp-head__title">{t('title')}</h2>
          <p className="rp-head__lead">{t('lead')}</p>
        </div>
        <div className="rp-head__verdict">{report.success ? t('success') : t('failure')}</div>
      </header>

      <div className="rp-scores" role="list" aria-label={t('scores.title')}>
        {SCORE_KEYS.map((key) => {
          const score = report.scores[key]
          const before = previous ? scoreValue(previous.scores[key]) : null
          const diff = before === null ? 0 : score.value - before
          return (
            <div key={key} className="rp-score" role="listitem">
              <div className="rp-score__label">{t(`scores.${key}`)}</div>
              <div className="rp-score__value">
                {format(score.value)}
                <span className="rp-score__of">{t('scores.outOf')}</span>
              </div>
              <div className="rp-score__bar">
                <div style={{ width: `${Math.max(0, Math.min(100, score.value))}%` }} />
              </div>
              <code className="rp-score__formula" title={t('formula')}>
                {score.formula}
              </code>
              {before !== null && (
                <div className={`rp-score__prev rp-score__prev--${diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'}`}>
                  {diff > 0 ? '▲' : diff < 0 ? '▼' : '='} {t('previous.was', { value: format(before) })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="rp-row">
        <div className={`rp-card rp-bottleneck rp-bottleneck--${report.bottleneck.resource}`}>
          <div className="rp-card__title">{t('bottleneck.title')}</div>
          <div className="rp-bottleneck__lead">{t('bottleneck.lead')}</div>
          <div className="rp-bottleneck__resource">{t(`resource.${report.bottleneck.resource}`)}</div>
          <div className="rp-bottleneck__text">
            {words(report.bottleneck.code, report.bottleneck.params, bottleneckKey(report.bottleneck.resource, report.bottleneck.params))}
          </div>
        </div>

        <div className="rp-card rp-limits">
          <div className="rp-card__title">{t('limits.title')}</div>
          <ul className="rp-checks">
            {report.limits.map((limit) => (
              <li key={limit.code} className={`rp-check rp-check--${limit.status}`}>
                <span className="rp-check__mark" aria-label={t(`status.${limit.status}`)}>
                  {STATUS_MARK[limit.status]}
                </span>
                <span>{words(limit.code, limit.params)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rp-segments">
        {report.segments.map((segment) => (
          <article key={segment.segment} className={`rp-segment rp-segment--${segment.status}`}>
            <header className="rp-segment__head">
              <div>
                <h3 className="rp-segment__name">{t(`segmentName.${segment.segment}`)}</h3>
                <div className="rp-segment__hint">{t(`segmentHint.${segment.segment}`)}</div>
              </div>
              <span className={`rp-badge rp-badge--${segment.status}`}>
                {STATUS_MARK[segment.status]} {t(`status.${segment.status}`)}
              </span>
            </header>
            {segment.chain.length === 0 ? (
              <p className="rp-segment__empty">{t('noChain')}</p>
            ) : (
              <ol className="rp-chain">
                {segment.chain.map((link, index) => (
                  <li key={`${link.code}-${index}`} className={`rp-link rp-link--${link.kind}`}>
                    <div className="rp-link__kind">{t(`kind.${link.kind}`)}</div>
                    <div className="rp-link__text">{words(link.code, link.params)}</div>
                    {/* The backend sends «—» where a link has no formula (a plain count). */}
                    {link.formula && link.formula !== '—' && <code className="rp-link__formula">{link.formula}</code>}
                  </li>
                ))}
              </ol>
            )}
          </article>
        ))}
      </div>

      <div className="rp-row">
        <div className="rp-card rp-compare">
          <div className="rp-card__title">{t('comparison.title')}</div>
          {reference ? (
            <>
              <div className="rp-compare__name">{referenceName}</div>
              <div className="rp-compare__kind">{t(`comparison.${reference.kind}`)}</div>
              <div className="rp-compare__sub">{t('comparison.delta')}</div>
              <dl className="rp-deltas">
                {Object.entries(reference.deltas).map(([key, value]) => (
                  <div key={key} className="rp-delta">
                    <dt>{t(`comparison.deltaKey.${key}`)}</dt>
                    <dd>
                      {value === 0
                        ? t('comparison.same')
                        : `${value! > 0 ? '+' : '−'}${format(Math.abs(value!))} ${t(`comparison.unit.${key}`)}`}
                    </dd>
                  </div>
                ))}
              </dl>
              {reference.source?.note && (
                <div className="rp-compare__source">
                  {reference.source.url ? (
                    <a href={reference.source.url} target="_blank" rel="noreferrer">
                      {t('comparison.source', { note: reference.source.note })}
                    </a>
                  ) : (
                    t('comparison.source', { note: reference.source.note })
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="rp-muted">{t('comparison.none')}</p>
          )}
        </div>

        <div className="rp-card rp-previous">
          <div className="rp-card__title">{t('previous.title')}</div>
          {previous ? (
            <ul className="rp-prev">
              {SCORE_KEYS.map((key) => {
                const before = scoreValue(previous.scores[key])
                const now = report.scores[key].value
                const verdict = now > before ? 'better' : now < before ? 'worse' : 'same'
                return (
                  <li key={key}>
                    <span>{t(`scores.${key}`)}</span>
                    <span className={`rp-prev__value rp-prev__value--${verdict}`}>
                      {format(before)} → {format(now)} · {t(`previous.${verdict}`)}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="rp-muted">{t('previous.none')}</p>
          )}
        </div>
      </div>

      {onGoTo && (
        <nav className="rp-card rp-nav" aria-label={t('nav.title')}>
          <div className="rp-card__title">{t('nav.title')}</div>
          <p className="rp-muted">{t('nav.lead')}</p>
          <div className="rp-nav__row">
            {STAGES.map((stage, index) => (
              <button key={stage} type="button" className="rp-btn" onClick={() => onGoTo(stage)}>
                {index + 1}. {t(`nav.${stage}`)}
              </button>
            ))}
          </div>
        </nav>
      )}
    </section>
  )
}
