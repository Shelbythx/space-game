import { useState } from 'react'
import { setLanguage } from '../../i18n'
import { RendezvousView } from '../RendezvousView'
import { sampleDocked, sampleLate } from './sampleProfile'

/** Demo page only: two made-up approaches and the two languages. */
export function Demo() {
  const [sample, setSample] = useState<'docked' | 'late'>('docked')
  return (
    <>
      <div style={{ display: 'flex', gap: 8, padding: '8px 16px', fontFamily: 'monospace', color: '#8fb0d0' }}>
        <span>demo · sample data:</span>
        <button type="button" onClick={() => setSample('docked')}>docks on day 2</button>
        <button type="button" onClick={() => setSample('late')}>docks late</button>
        <span style={{ marginLeft: 'auto' }} />
        <button type="button" onClick={() => setLanguage('en')}>EN</button>
        <button type="button" onClick={() => setLanguage('uk')}>UK</button>
      </div>
      {sample === 'docked' ? (
        <RendezvousView key="docked" profile={sampleDocked} deadlineDays={5} onFinish={() => alert('report')} />
      ) : (
        <RendezvousView key="late" profile={sampleLate} deadlineDays={5} />
      )}
    </>
  )
}
