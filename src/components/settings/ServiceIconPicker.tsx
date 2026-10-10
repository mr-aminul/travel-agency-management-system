import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cx } from '@/lib/cx'
import { Field } from '@/components/ui'
import {
  SERVICE_ICON_OPTIONS,
  defaultIconIdForService,
  iconFromId,
  type ServiceIconId,
} from '@/lib/serviceIcons'

export type ServiceIconPickerProps = {
  /** Explicit pick; null/undefined means use the name-based default. */
  value?: ServiceIconId | null
  /** Used to preview the default when nothing is selected. */
  serviceName?: string
  onChange: (iconId: ServiceIconId | null) => void
  disabled?: boolean
  /**
   * `field` — labeled inline grid (e.g. add-service drawer).
   * `popover` — trigger opens a floating picker (e.g. catalog title icon).
   */
  variant?: 'field' | 'popover'
  /** Custom trigger content for `popover`. Defaults to a preview chip. */
  trigger?: ReactNode
  triggerClassName?: string
  triggerAriaLabel?: string
}

const PANEL_GAP_PX = 6
const PANEL_WIDTH_PX = 17.5 * 16
const VIEWPORT_PAD_PX = 8

function panelStyleForTrigger(trigger: DOMRect): CSSProperties {
  const width = Math.min(
    PANEL_WIDTH_PX,
    window.innerWidth - VIEWPORT_PAD_PX * 2,
  )
  const preferredLeft = trigger.left
  const left = Math.min(
    Math.max(VIEWPORT_PAD_PX, preferredLeft),
    window.innerWidth - width - VIEWPORT_PAD_PX,
  )
  const spaceBelow = window.innerHeight - trigger.bottom - VIEWPORT_PAD_PX
  const spaceAbove = trigger.top - VIEWPORT_PAD_PX
  const openUp = spaceBelow < 12 * 16 && spaceAbove > spaceBelow
  const maxHeight = Math.max(
    10 * 16,
    openUp ? spaceAbove - PANEL_GAP_PX : spaceBelow - PANEL_GAP_PX,
  )

  return {
    position: 'fixed',
    top: openUp ? undefined : trigger.bottom + PANEL_GAP_PX,
    bottom: openUp
      ? window.innerHeight - trigger.top + PANEL_GAP_PX
      : undefined,
    left,
    width,
    maxHeight,
    zIndex: 1200,
  }
}

function IconGrid({
  selected,
  onChange,
  disabled,
}: {
  selected: ServiceIconId | null
  onChange: (iconId: ServiceIconId | null) => void
  disabled?: boolean
}) {
  return (
    <div
      className="pd-service-icon-picker__grid"
      role="listbox"
      aria-label="Service icons"
    >
      <button
        type="button"
        role="option"
        aria-selected={selected == null}
        className={cx(
          'pd-service-icon-picker__option',
          selected == null && 'is-selected',
        )}
        disabled={disabled}
        onClick={() => onChange(null)}
        title="Use default"
      >
        <span className="pd-service-icon-picker__option-label">Auto</span>
      </button>
      {SERVICE_ICON_OPTIONS.map((option) => {
        const Icon = option.icon
        const isSelected = selected === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="option"
            aria-selected={isSelected}
            aria-label={option.label}
            className={cx(
              'pd-service-icon-picker__option',
              isSelected && 'is-selected',
            )}
            disabled={disabled}
            title={option.label}
            onClick={() => onChange(option.id)}
          >
            <Icon size={16} strokeWidth={2.25} aria-hidden />
          </button>
        )
      })}
    </div>
  )
}

export function ServiceIconPicker({
  value,
  serviceName = '',
  onChange,
  disabled,
  variant = 'field',
  trigger,
  triggerClassName,
  triggerAriaLabel = 'Choose service icon',
}: ServiceIconPickerProps) {
  const selected = value ?? null
  const previewId = selected ?? defaultIconIdForService(serviceName || 'Service')
  const PreviewIcon = iconFromId(previewId)
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open || variant !== 'popover') {
      setPanelStyle(undefined)
      return
    }

    const update = () => {
      const triggerEl = triggerRef.current
      if (!triggerEl) return
      setPanelStyle(panelStyleForTrigger(triggerEl.getBoundingClientRect()))
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, variant])

  useEffect(() => {
    if (!open || variant !== 'popover') return

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, variant])

  const pick = (next: ServiceIconId | null) => {
    onChange(next)
    if (variant === 'popover') {
      setOpen(false)
      triggerRef.current?.focus()
    }
  }

  if (variant === 'popover') {
    const panel =
      open && panelStyle ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Choose service icon"
          className="pd-service-icon-picker__panel"
          style={panelStyle}
        >
          <p className="pd-service-icon-picker__panel-hint">
            Optional. Leave on Auto to use the default for this service name.
          </p>
          <IconGrid selected={selected} onChange={pick} disabled={disabled} />
        </div>
      ) : null

    return (
      <div ref={containerRef} className="pd-service-icon-picker pd-service-icon-picker--popover">
        <button
          ref={triggerRef}
          type="button"
          className={cx(
            'pd-service-icon-picker__trigger',
            open && 'is-open',
            triggerClassName,
          )}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={triggerAriaLabel}
          disabled={disabled}
          onClick={() => setOpen((value) => !value)}
        >
          {trigger ?? (
            <>
              <span className="pd-service-icon-picker__preview-icon" aria-hidden>
                <PreviewIcon size={18} strokeWidth={2.25} />
              </span>
              <span className="pd-service-icon-picker__preview-label">
                {selected
                  ? (SERVICE_ICON_OPTIONS.find((option) => option.id === selected)
                      ?.label ?? 'Selected')
                  : 'Default'}
              </span>
            </>
          )}
        </button>
        {panel && typeof document !== 'undefined'
          ? createPortal(panel, document.body)
          : null}
      </div>
    )
  }

  return (
    <Field
      label="Icon"
      hint="Optional. Leave unset to use the default for this service name."
      className="pd-service-icon-picker"
    >
      <div className="pd-service-icon-picker__preview" aria-hidden>
        <span className="pd-service-icon-picker__preview-icon">
          <PreviewIcon size={18} strokeWidth={2.25} />
        </span>
        <span className="pd-service-icon-picker__preview-label">
          {selected
            ? (SERVICE_ICON_OPTIONS.find((option) => option.id === selected)
                ?.label ?? 'Selected')
            : 'Default'}
        </span>
      </div>
      <IconGrid selected={selected} onChange={pick} disabled={disabled} />
    </Field>
  )
}
