import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type RadioProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label: string
  icon?: ReactNode
}

export function Radio({
  label,
  icon,
  id,
  className,
  disabled,
  ...props
}: RadioProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <label
      className={cx('pd-radio', disabled && 'is-disabled', className)}
      htmlFor={inputId}
    >
      <input
        id={inputId}
        type="radio"
        className="pd-radio__input"
        disabled={disabled}
        {...props}
      />
      <span className="pd-radio__dot" aria-hidden />
      {icon ? (
        <span className="pd-radio__icon" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="pd-radio__label">{label}</span>
    </label>
  )
}

export type RadioGroupProps = {
  legend?: string
  name: string
  options: Array<{
    value: string
    label: string
    icon?: ReactNode
    disabled?: boolean
  }>
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  className?: string
  disabled?: boolean
}

export function RadioGroup({
  legend,
  name,
  options,
  value,
  defaultValue,
  onChange,
  className,
  disabled,
}: RadioGroupProps) {
  return (
    <fieldset className={cx('pd-radio-group', className)} disabled={disabled}>
      {legend ? <legend className="pd-radio-group__legend">{legend}</legend> : null}
      <div className="pd-radio-group__options">
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            label={option.label}
            icon={option.icon}
            value={option.value}
            disabled={option.disabled || disabled}
            checked={value !== undefined ? value === option.value : undefined}
            defaultChecked={
              value === undefined ? defaultValue === option.value : undefined
            }
            onChange={() => onChange?.(option.value)}
          />
        ))}
      </div>
    </fieldset>
  )
}
