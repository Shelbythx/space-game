import { useState } from 'react'
import { setLanguage } from '../../i18n'
import { FlightView } from '../FlightView'
import { sampleDecay, sampleMission, sampleStations } from './sampleData'

/** Switches between two made-up flights and the two languages. Demo page only. */
export function Demo() {
  const [sample, setSample] = useState<'mission' | 'decay'>('mission')
  return (
    <>
      <div style={{ display: 'flex', gap: 8, padding: '8px 16px', fontFamily: 'monospace', color: '#8fb0d0' }}>
        <span>demo · sample data:</span>
        <button type="button" onClick={() => setSample('mission')}>mission 1</button>
        <button type="button" onClick={() => setSample('decay')}>orbit decay</button>
        <span style={{ marginLeft: 'auto' }} />
        <button type="button" onClick={() => setLanguage('en')}>EN</button>
        <button type="button" onClick={() => setLanguage('uk')}>UK</button>
      </div>
      {sample === 'mission' ? (
        <FlightView key="mission" simulation={sampleMission} stations={sampleStations} goalGb={500} onFinish={() => alert('report')} />
      ) : (
        <FlightView key="decay" simulation={sampleDecay} stations={sampleStations} goalGb={20} />
      )}
    </>
  )
}
