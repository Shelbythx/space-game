import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReportText } from '../report/reportText'
import type { AdvisorAnswer } from './types'
import { useAdvisor } from './useAdvisorState'
import './advisor.css'

// The mentor chat panel (task 049, D111): a button in the corner of every mission stage and a
// side panel. Claude answers are plain text; demo answers are game message codes shown with
// the same texts as the rest of the game and the «demo answer without AI» mark.

function AnswerBody({ answer }: { answer: AdvisorAnswer }) {
  const { say } = useReportText()
  if (answer.text === null) {
    const [first, ...rest] = answer.messages
    return (
      <>
        {first && <p>{say(first)}</p>}
        {rest.length > 0 && (
          <ul>
            {rest.map((m, i) => (
              <li key={`${m.code}-${i}`}>{say(m)}</li>
            ))}
          </ul>
        )}
      </>
    )
  }
  // Plain text: paragraphs split by blank lines, «- » lines as a list.
  return (
    <>
      {answer.text.split(/\n\s*\n/).map((block, i) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
        const items = lines.filter((l) => l.startsWith('- '))
        if (items.length > 0 && items.length === lines.length)
          return (
            <ul key={i}>
              {items.map((l, j) => (
                <li key={j}>{l.slice(2)}</li>
              ))}
            </ul>
          )
        return <p key={i}>{lines.join(' ')}</p>
      })}
    </>
  )
}

export function AdvisorChat() {
  const { t } = useTranslation()
  const advisor = useAdvisor()
  const [question, setQuestion] = useState('')
  const log = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const count = advisor?.entries.length ?? 0
  const open = advisor?.open ?? false

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight })
  }, [count, open])

  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])

  if (!advisor) return null
  const { entries, setOpen, busy, ask } = advisor

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!question.trim() || busy) return
    ask(question)
    setQuestion('')
  }

  const suggestions = [t('advisor.suggest.first'), t('advisor.suggest.power'), t('advisor.suggest.budget')]

  return (
    <>
      {!open && (
        <button type="button" className="mm-btn adv-toggle" onClick={() => setOpen(true)} aria-expanded={false}>
          {t('advisor.open')}
        </button>
      )}
      {open && (
        <aside className="adv-panel" aria-label={t('advisor.title')}>
          <header className="adv-head">
            <h2>{t('advisor.title')}</h2>
            <button type="button" className="adv-close" onClick={() => setOpen(false)} aria-label={t('advisor.close')}>
              ×
            </button>
          </header>

          <div className="adv-log" ref={log} aria-live="polite">
            {entries.length === 0 && (
              <div className="adv-empty">
                <p>{t('advisor.empty')}</p>
                <div className="adv-suggest">
                  {suggestions.map((s) => (
                    <button key={s} type="button" disabled={busy} onClick={() => ask(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {entries.map((e) => {
              if (e.from === 'player')
                return (
                  <div key={e.id} className="adv-msg adv-msg-player">
                    <span className="adv-who">{t('advisor.you')}</span>
                    <p>{e.text}</p>
                  </div>
                )
              if (e.from === 'pending')
                return (
                  <div key={e.id} className="adv-msg adv-msg-advisor" role="status">
                    <span className="adv-who">{t('advisor.mentor')}</span>
                    <p className="adv-thinking">{t('advisor.thinking')}</p>
                  </div>
                )
              if (e.from === 'error')
                return (
                  <div key={e.id} className="adv-msg adv-msg-error" role="alert">
                    <p>{t(e.code)}</p>
                  </div>
                )
              return (
                <div key={e.id} className="adv-msg adv-msg-advisor">
                  <span className="adv-who">
                    {t('advisor.mentor')}
                    <span className={`adv-badge adv-badge-${e.answer.source}`}>
                      {e.answer.source === 'demo' ? t('advisor.demoBadge') : t('advisor.aiBadge')}
                    </span>
                  </span>
                  <AnswerBody answer={e.answer} />
                </div>
              )
            })}
          </div>

          <form className="adv-form" onSubmit={submit}>
            <textarea
              ref={input}
              value={question}
              maxLength={500}
              rows={2}
              placeholder={t('advisor.placeholder')}
              onChange={(e) => setQuestion(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
                // Keys typed here must not reach the game's shortcuts.
                e.stopPropagation()
              }}
              aria-label={t('advisor.placeholder')}
            />
            <button type="submit" className="mm-btn adv-send" disabled={busy || !question.trim()}>
              {t('advisor.send')}
            </button>
          </form>
        </aside>
      )}
    </>
  )
}
