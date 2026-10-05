import { Field } from '@/components/ui'
import { cx } from '@/lib/cx'
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
}

export function ServiceIconPicker({
  value,
  serviceName = '',
  onChange,
  disabled,
}: ServiceIconPickerProps) {
  const selected = value ?? null
  const previewId = selected ?? defaultIconIdForService(serviceName || 'Service')
  const PreviewIcon = iconFromId(previewId)

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
    </Field>
  )
}
