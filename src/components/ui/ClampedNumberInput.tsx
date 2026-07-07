import { useState } from 'react'

interface ClampedNumberInputProps {
  /** The authoritative numeric value */
  value: number
  /** Called with the final clamped value after blur / Enter */
  onChange: (clamped: number) => void
  /** Minimum allowed value (inclusive) */
  min: number
  /** Maximum allowed value (inclusive) */
  max: number
  /** HTML input aria-label */
  'aria-label'?: string
  /** Extra className for the <input> */
  className?: string
  /** Inline styles for the <input> */
  style?: React.CSSProperties
  /** Extra props forwarded to the underlying <input> */
  inputProps?: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur' | 'onKeyDown'>
}

/**
 * A number input that does NOT clamp on every keystroke.
 *
 * While the user is typing, the raw string is displayed as-is so
 * multi-digit entry (e.g. "100") works normally. Clamping to [min, max]
 * only happens when the user finishes editing (blur or Enter).
 *
 * This avoids the classic "typing 100 jumps to 30 → 300" bug.
 */
export function ClampedNumberInput({
  value,
  onChange,
  min,
  max,
  className,
  style,
  'aria-label': ariaLabel,
  inputProps,
}: ClampedNumberInputProps) {
  // `editing` holds the raw string while the user is actively typing.
  // `null` means "not editing" — display the authoritative `value`.
  const [editing, setEditing] = useState<string | null>(null)

  const displayValue = editing !== null ? editing : String(value)

  const commit = () => {
    if (editing === null) return
    const num = Number(editing)
    if (Number.isNaN(num)) {
      // Invalid input → revert to previous value
      setEditing(null)
      return
    }
    const clamped = Math.max(min, Math.min(max, num))
    setEditing(null)
    if (clamped !== value) {
      onChange(clamped)
    }
  }

  return (
    <input
      type="number"
      value={displayValue}
      onChange={(e) => setEditing(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
          ;(e.target as HTMLInputElement).blur()
        }
        if (e.key === 'Escape') {
          setEditing(null) // revert
          ;(e.target as HTMLInputElement).blur()
        }
      }}
      aria-label={ariaLabel}
      className={className}
      style={style}
      {...inputProps}
    />
  )
}
