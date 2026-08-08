import { useId, type InputHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  /** `outlined` (default) = notched label on the control border. */
  labelVariant?: 'default' | 'outlined'
  hint?: string
  error?: string
}

export function Input({
  label,
  labelVariant = 'outlined',
  hint,
  error,
  id,
  className,
  disabled,
  ...props
}: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined
  const outlined = Boolean(label) && labelVariant === 'outlined'

  return (
    <div
      className={cx(
        'pd-field',
        outlined && 'pd-field--outlined',
        error && 'pd-field--error',
        className,
      )}
    >
      {label ? (
        <label className="pd-field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className="pd-field__control"
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <p id={errorId} className="pd-field__error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="pd-field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
