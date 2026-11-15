// «< value >» switch in the menu's pixel style (D95) for the simple version.

export function Cycle({ label, value, onPrev, onNext, disabled }: { label: string; value: string; onPrev: () => void; onNext: () => void; disabled?: boolean }) {
  return (
    <div className="bp-cycle">
      <span className="bp-cycle-label">{label}</span>
      <button type="button" className="mm-btn bp-cycle-btn" onClick={onPrev} disabled={disabled} aria-label={`${label}: <`}>
        {'<'}
      </button>
      <span className="bp-cycle-value">{value}</span>
      <button type="button" className="mm-btn bp-cycle-btn" onClick={onNext} disabled={disabled} aria-label={`${label}: >`}>
        {'>'}
      </button>
    </div>
  )
}
