import { useState } from 'react'
import { setLanguage } from '../../i18n'
import { ReportView } from '../ReportView'
import { sampleIssReport, samplePrevious, sampleReport } from './sampleReport'

/** Demo page only: two made-up reports and the two languages. */
export function Demo() {
  const [sample, setSample] = useState<'orbit' | 'iss'>('orbit')
  return (
    <>
      <div style={{ display: 'flex', gap: 8, padding: '8px 16px', fontFamily: 'monospace', color: '#8fb0d0' }}>
        <span>demo · sample data:</span>
        <button type="button" onClick={() => setSample('orbit')}>mission 1</button>
        <button type="button" onClick={() => setSample('iss')}>ISS cargo</button>
        <span style={{ marginLeft: 'auto' }} />
        <button type="button" onClick={() => setLanguage('en')}>EN</button>
        <button type="button" onClick={() => setLanguage('uk')}>UK</button>
      </div>
      {sample === 'orbit' ? (
        <ReportView report={sampleReport} previous={samplePrevious} onGoTo={(stage) => alert(stage)} />
      ) : (
        <ReportView report={sampleIssReport} onGoTo={(stage) => alert(stage)} />
      )}
    </>
  )
}
