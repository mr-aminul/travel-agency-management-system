import { useId, type InputHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label: string
  /** Hide the visible label (keeps it for assistive tech). */
  hideLabel?: boolean
}

export function Checkbox({
  label,
  id,
  className,
  disabled,
  hideLabel = false,
  ...props
}: CheckboxProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <label
      className={cx(
        'pd-check',
        hideLabel && 'pd-check--icon-only',
        disabled && 'is-disabled',
        className,
      )}
      htmlFor={inputId}
    >
      <input
        id={inputId}
        type="checkbox"
        className="pd-check__input"
        disabled={disabled}
        {...props}
      />
      <span className="pd-check__box" aria-hidden />
      <span className={cx('pd-check__label', hideLabel && 'pd-sr-only')}>
        {label}
      </span>
    </label>
  )
}
