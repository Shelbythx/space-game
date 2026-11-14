import type { ButtonHTMLAttributes } from 'react'

export function PixelButton({ className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={['mm-btn', className].filter(Boolean).join(' ')} {...rest} />
}

interface SliderProps {
  label: string
  /** 0..100 */
  value: number
  onChange: (value: number) => void
  ariaLabel: string
}

/** Blocky slider: the whole control looks like a button, the label sits on top. */
export function PixelSlider({ label, value, onChange, ariaLabel }: SliderProps) {
  return (
    <label className="mm-slider">
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        aria-label={ariaLabel}
        aria-valuetext={label}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
      />
      <span className="mm-slider-label" aria-hidden="true">
        {label}
      </span>
    </label>
  )
}
