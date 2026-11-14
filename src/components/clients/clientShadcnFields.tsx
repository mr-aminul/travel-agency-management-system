import { useId, type ChangeEvent, type ComponentProps } from 'react'
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field'
import { Input as ShadcnInput } from '@/components/shadcn/input'
import { Textarea as ShadcnTextarea } from '@/components/shadcn/textarea'
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import { cn } from '@/lib/utils'

type TextFieldProps = ComponentProps<'input'> & {
  label: string
  error?: string
  /** Smaller label + control for dense sheets. */
  compact?: boolean
  /** Extra classes on the field label (after compact defaults). */
  labelClassName?: string
  /** Extra classes on the field stack (gap between label and control). */
  fieldClassName?: string
}

export function Input({
  label,
  error,
  id,
  required,
  compact,
  labelClassName,
  fieldClassName,
  className,
  ...props
}: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <Field
      data-invalid={error ? true : undefined}
      className={cn(compact ? 'gap-1' : undefined, fieldClassName)}
    >
      <div className="flex items-baseline gap-1">
        {/* Keep required * outside the label so getByLabelText(label) matches exact text. */}
        <FieldLabel
          htmlFor={inputId}
          className={cn(
            compact && 'text-xs font-medium text-muted-foreground',
            labelClassName,
          )}
        >
          {label}
        </FieldLabel>
        {required ? (
          <span
            className={cn('text-destructive', compact && 'text-xs')}
            aria-hidden="true"
          >
            *
          </span>
        ) : null}
      </div>
      <ShadcnInput
        {...props}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(
          'bg-[var(--color-surface)]',
          compact && 'h-8 text-sm',
          className,
        )}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}

type AreaFieldProps = ComponentProps<'textarea'> & {
  label: string
  error?: string
}

export function Textarea({ label, error, id, className, ...props }: AreaFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <ShadcnTextarea
        {...props}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn('bg-[var(--color-surface)]', className)}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}

type Choice = { value: string; label: string }

type SelectFieldProps = {
  label: string
  value: string
  options: Choice[]
  error?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  placeholder?: string
  className?: string
  compact?: boolean
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onBlur?: () => void
}

export function Select({
  label,
  value,
  options,
  error,
  required,
  disabled,
  readOnly,
  className,
  compact,
  onChange,
  onBlur,
}: SelectFieldProps) {
  const autoId = useId()
  return (
    <Field
      data-invalid={error ? true : undefined}
      className={compact ? 'gap-1' : undefined}
    >
      <div className="flex items-baseline gap-1">
        <FieldLabel
          htmlFor={autoId}
          className={
            compact
              ? 'text-xs font-medium text-muted-foreground'
              : undefined
          }
        >
          {label}
        </FieldLabel>
        {required ? (
          <span
            className={cn('text-destructive', compact && 'text-xs')}
            aria-hidden="true"
          >
            *
          </span>
        ) : null}
      </div>
      <ShadcnSelect
        value={value || '__none__'}
        disabled={disabled || readOnly}
        onValueChange={(next) =>
          onChange({
            target: { value: next === '__none__' ? '' : next },
          } as ChangeEvent<HTMLSelectElement>)
        }
      >
        <SelectTrigger
          id={autoId}
          className={cn(
            'w-full bg-[var(--color-surface)]',
            compact ? 'h-8' : 'h-9',
            className,
          )}
          onBlur={onBlur}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value || '__none__'} value={option.value || '__none__'}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </ShadcnSelect>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}
