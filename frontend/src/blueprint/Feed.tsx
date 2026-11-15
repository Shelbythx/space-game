import { useEffect, useState } from 'react'
import type { CheckSegment, Evaluation, GameVersion } from '../api/types'
import { useGameText } from './format'

// Role comments (D48) with a typewriter effect for the newest line (idea from «yourself.»,
// D63) and checks grouped by the four NASA segments plus mission limits (D23).

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Remounted per text (key), so it always starts from the first letter. */
function Typewriter({ text }: { text: string }) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? text.length : 0))
  useEffect(() => {
    if (shown >= text.length) return
    const id = window.setTimeout(() => setShown((n) => Math.min(text.length, n + 2)), 18)
    return () => window.clearTimeout(id)
  }, [shown, text])
  return (
    <>
      {text.slice(0, shown)}
      <span className="bp-sr">{text.slice(shown)}</span>
    </>
  )
}

const SEGMENTS: CheckSegment[] = ['mission', 'launch', 'space', 'ground', 'user']

export function Feed({ evaluation, version }: { evaluation: Evaluation; version: GameVersion }) {
  const { t, msg } = useGameText()
  return (
    <div className="bp-feed">
      <section className="bp-group" aria-live="polite">
        <h3>{t('bp.feed')}</h3>
        {evaluation.comments.length === 0 && <p className="bp-note">{t('bp.noComments')}</p>}
        <ul className="bp-comments">
          {evaluation.comments.map((c, i) => (
            <li key={`${c.message.code}-${i}`} className={`bp-comment bp-comment-${c.severity}`}>
              <span className={`bp-role bp-role-${c.role}`}>{t(`role.${c.role}`)}</span>
              <span className="bp-comment-text">
                {i === 0 ? <Typewriter key={msg(c.message)} text={msg(c.message)} /> : msg(c.message)}
              </span>
              {version === 'simple' && c.advice && <span className="bp-advice">{msg(c.advice)}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="bp-group">
        <h3>{t('bp.checks')}</h3>
        {SEGMENTS.map((segment) => {
          const list = evaluation.checks.filter((c) => c.segment === segment)
          if (list.length === 0) return null
          return (
            <div key={segment} className="bp-seg">
              <span className="bp-seg-name">{t(`segment.${segment}`)}</span>
              <ul>
                {list.map((c, i) => (
                  <li key={`${c.code}-${i}`} className={`bp-check bp-check-${c.status}`}>
                    <span className="bp-dot" aria-hidden="true" />
                    <span className="bp-sr">{c.status}: </span>
                    {msg(c)}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>
    </div>
  )
}
