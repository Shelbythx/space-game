import { useEffect, useRef } from 'react'
import type { Calc, CalcResource, GameVersion } from '../api/types'
import { useGameText } from './format'

// Calculation sheet (D94): formula, substituted numbers, result and the NASA document —
// in full for the advanced version, one summary line each for the simple one.

const RELATED: Record<string, CalcResource[]> = {
  mass: ['mass'],
  power: ['power', 'orbit'],
  budget: ['budget'],
  data: ['data'],
  comms: ['comms', 'orbit'],
  time: ['time'],
}

interface Props {
  resource: string
  calc: Calc[]
  version: GameVersion
  onClose: () => void
}

export function CalcSheet({ resource, calc, version, onClose }: Props) {
  const { t, msg, num } = useGameText()
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (!d.open) d.showModal()
    // Native listeners: dialog events do not bubble to React's root. Esc fires "cancel"
    // at once; "close" is a fallback for any other way the dialog gets closed.
    d.addEventListener('cancel', onClose)
    d.addEventListener('close', onClose)
    return () => {
      d.removeEventListener('cancel', onClose)
      d.removeEventListener('close', onClose)
    }
  }, [onClose])

  const close = () => {
    dialog.current?.close()
    onClose()
  }

  const items = calc.filter((c) => (RELATED[resource] ?? [resource]).includes(c.resource))
  const sourceLabel = (kind: string) =>
    kind === 'nasa' ? t('bp.sourceNasa') : kind === 'calculated' ? t('bp.sourceCalculated') : t('bp.sourceEstimate')

  return (
    <dialog ref={dialog} className="bp-dialog" aria-labelledby="bp-calc-title">
      <h2 id="bp-calc-title">{t('bp.calcTitle', { resource: t(`resource.${resource}`) })}</h2>
      {items.length === 0 && <p className="bp-note">{t('bp.calcEmpty')}</p>}
      {items.map((c) => (
        <article key={c.code} className="bp-calc">
          <h3>{t(`${c.code}.title`)}</h3>
          <p className="bp-calc-summary">{msg(c.summary)}</p>
          {version === 'advanced' && (
            <dl>
              <dt>{t('bp.formula')}</dt>
              <dd className="bp-mono">{c.formula}</dd>
              <dt>{t('bp.inputs')}</dt>
              <dd className="bp-mono">
                {c.inputs.map((i) => `${i.name} = ${num(i.value, 3)}${i.unit ? ` ${i.unit}` : ''}`).join(';  ')}
              </dd>
              <dt>{t('bp.result')}</dt>
              <dd className="bp-mono">
                {c.result.name} = {num(c.result.value, 3)} {c.result.unit}
              </dd>
              <dt>{t('bp.source')}</dt>
              <dd>
                <span className={`bp-src bp-src-${c.source.kind}`}>{sourceLabel(c.source.kind)}</span> {c.source.note}
              </dd>
            </dl>
          )}
        </article>
      ))}
      <div className="bp-dialog-actions">
        <button type="button" className="mm-btn bp-close" onClick={close}>
          {t('bp.close')}
        </button>
      </div>
    </dialog>
  )
}
