import { useId, type TextareaHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  /** `outlined` (default) = notched label on the control border. */
  labelVariant?: 'default' | 'outlined'
  hint?: string
  error?: string
}

export function Textarea({
  label,
  labelVariant = 'outlined',
  hint,
  error,
  id,
  className,
  disabled,
  rows = 4,
  ...props
}: TextareaProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
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
        <label className="pd-field__label" htmlFor={fieldId}>
          {label}
        </label>
      ) : null}
      <textarea
        id={fieldId}
        className="pd-field__control pd-field__control--textarea"
        disabled={disabled}
        rows={rows}
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
