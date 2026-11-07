import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type LabeledSwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'role'
> & {
  label: string
}

/** Accessible on/off control with label (replaces legacy pd-switch). */
export function LabeledSwitch({
  label,
  id,
  className,
  disabled,
  ...props
}: LabeledSwitchProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 text-sm',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        className="peer sr-only"
        disabled={disabled}
        {...props}
      />
      <span
        aria-hidden
        className="relative h-5 w-9 shrink-0 rounded-full bg-muted transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 peer-checked:bg-primary after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-background after:shadow-sm after:transition-transform peer-checked:after:translate-x-4"
      />
      <span>{label}</span>
    </label>
  )
}
