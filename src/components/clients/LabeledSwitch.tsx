import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type LabeledSwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'role'
> & {
  label: string
  /** Off track uses destructive red (Access / Messaging entitlements). */
  offDanger?: boolean
}

/**
 * Accessible on/off control with label (replaces legacy pd-switch).
 *
 * The checkbox sits opacity-0 over the visible track (not `sr-only`).
 * `sr-only` parks the control off-canvas; focusing it makes the browser
 * `scrollIntoView`, and with `.pd-app-shell { overflow: clip }` that can
 * escalate to the window and shove the white page body above the shell.
 */
export function LabeledSwitch({
  label,
  id,
  className,
  disabled,
  offDanger = false,
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
      <span className="relative inline-flex h-5 w-9 shrink-0">
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          disabled={disabled}
          {...props}
        />
        <span
          aria-hidden
          className={cn(
            'pointer-events-none relative h-5 w-9 rounded-full transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-background after:shadow-sm after:transition-transform peer-checked:after:translate-x-4 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50',
            offDanger
              ? 'bg-destructive peer-checked:!bg-primary'
              : 'bg-muted peer-checked:bg-primary',
          )}
        />
      </span>
      <span>{label}</span>
    </label>
  )
}
