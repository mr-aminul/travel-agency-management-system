import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search, X, type LucideIcon } from 'lucide-react'
import { cx } from '@/lib/cx'

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
  icon?: LucideIcon
}

export type SelectSize = 'md' | 'sm'

/** Keeps call sites that read `event.target.value` working. */
export type SelectChangeEvent<T extends string | string[] = string> = {
  target: { value: T; name?: string }
}

type SelectPropsBase = {
  label?: string
  /** Accessible name when there is no visible label. */
  'aria-label'?: string
  /** `outlined` = notched label on the control border (Material-style). */
  labelVariant?: 'default' | 'outlined'
  hint?: string
  error?: string
  options?: SelectOption[]
  placeholder?: string
  disabled?: boolean
  required?: boolean
  id?: string
  name?: string
  className?: string
  /** Compact trigger for dense tables; panel stays the shared menu. */
  size?: SelectSize
  searchable?: boolean
  searchPlaceholder?: string
  readOnly?: boolean
}

export type SelectProps =
  | (SelectPropsBase & {
      multiple?: false
      value?: string
      defaultValue?: string
      onChange?: (event: SelectChangeEvent<string>) => void
    })
  | (SelectPropsBase & {
      multiple: true
      value?: string[]
      defaultValue?: string[]
      onChange?: (event: SelectChangeEvent<string[]>) => void
    })

const PANEL_GAP_PX = 4
const PANEL_MIN_WIDTH_PX = 12 * 16
const VIEWPORT_PAD_PX = 8

function normalizeMulti(value: string[] | undefined): string[] {
  return value ?? []
}

function panelStyleForTrigger(
  trigger: DOMRect,
  preferredMinWidth: number,
): CSSProperties {
  const width = Math.max(trigger.width, preferredMinWidth)
  const left = Math.min(
    Math.max(VIEWPORT_PAD_PX, trigger.left),
    window.innerWidth - width - VIEWPORT_PAD_PX,
  )
  const spaceBelow = window.innerHeight - trigger.bottom - VIEWPORT_PAD_PX
  const spaceAbove = trigger.top - VIEWPORT_PAD_PX
  const openUp = spaceBelow < 12 * 16 && spaceAbove > spaceBelow

  return {
    position: 'fixed',
    top: openUp ? undefined : trigger.bottom + PANEL_GAP_PX,
    bottom: openUp
      ? window.innerHeight - trigger.top + PANEL_GAP_PX
      : undefined,
    left,
    width,
    maxHeight: Math.max(
      10 * 16,
      openUp ? spaceAbove - PANEL_GAP_PX : spaceBelow - PANEL_GAP_PX,
    ),
  }
}

export function Select(props: SelectProps) {
  const {
    label,
    labelVariant = 'outlined',
    hint,
    error,
    id,
    className,
    disabled,
    options = [],
    placeholder,
    required,
    name,
    size = 'md',
    searchable = false,
    searchPlaceholder = 'Search…',
    readOnly = false,
  } = props
  const ariaLabel = props['aria-label']
  const outlined = Boolean(label) && labelVariant === 'outlined'

  const multiple = props.multiple === true
  const autoId = useId()
  const selectId = id ?? autoId
  const listboxId = `${selectId}-listbox`
  const searchId = `${selectId}-search`
  const hintId = hint ? `${selectId}-hint` : undefined
  const errorId = error ? `${selectId}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  const isControlled = props.value !== undefined
  const [uncontrolledSingle, setUncontrolledSingle] = useState(
    !multiple ? (props.defaultValue as string | undefined) ?? '' : '',
  )
  const [uncontrolledMulti, setUncontrolledMulti] = useState(
    multiple ? normalizeMulti(props.defaultValue as string[] | undefined) : [],
  )

  const singleValue = isControlled
    ? ((props.value as string | undefined) ?? '')
    : uncontrolledSingle
  const multiValue = isControlled
    ? normalizeMulti(props.value as string[] | undefined)
    : uncontrolledMulti

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>()

  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listboxRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<Array<HTMLDivElement | null>>([])

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((option) => option.label.toLowerCase().includes(q))
  }, [options, query])

  const selectedOptions = multiple
    ? options.filter((option) => multiValue.includes(option.value))
    : options.filter((option) => option.value === singleValue)

  const displayLabel = (() => {
    if (multiple) {
      if (selectedOptions.length === 0) return placeholder ?? 'Select…'
      if (selectedOptions.length === 1) return selectedOptions[0].label
      if (selectedOptions.length === 2) {
        return `${selectedOptions[0].label}, ${selectedOptions[1].label}`
      }
      return `${selectedOptions.length} selected`
    }
    return selectedOptions[0]?.label ?? placeholder ?? 'Select…'
  })()

  const isPlaceholder = selectedOptions.length === 0
  const SelectedIcon =
    !multiple && selectedOptions.length === 1
      ? selectedOptions[0].icon
      : undefined
  const valueIconSize = size === 'sm' ? 12 : 15

  const getEnabledIndexes = () =>
    filteredOptions
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((index) => index >= 0)

  const updatePanelPosition = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    setPanelStyle(
      panelStyleForTrigger(
        trigger.getBoundingClientRect(),
        multiple || size === 'sm' ? PANEL_MIN_WIDTH_PX : trigger.offsetWidth,
      ),
    )
  }

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(undefined)
      return
    }

    updatePanelPosition()
    window.addEventListener('resize', updatePanelPosition)
    window.addEventListener('scroll', updatePanelPosition, true)
    return () => {
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, true)
    }
  }, [open, multiple, size])

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }

    const enabledIndexes = filteredOptions
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((index) => index >= 0)

    if (multiple) {
      const firstSelected = filteredOptions.findIndex(
        (option) => multiValue.includes(option.value) && !option.disabled,
      )
      setActiveIndex(
        firstSelected >= 0 ? firstSelected : (enabledIndexes[0] ?? 0),
      )
    } else {
      const selectedIndex = filteredOptions.findIndex(
        (option) => option.value === singleValue,
      )
      setActiveIndex(
        selectedIndex >= 0 && !filteredOptions[selectedIndex]?.disabled
          ? selectedIndex
          : (enabledIndexes[0] ?? 0),
      )
    }

    if (searchable) {
      searchRef.current?.focus()
    } else {
      listboxRef.current?.focus()
    }
    // Only re-initialize when the menu opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-only sync
  }, [open])

  useEffect(() => {
    if (!open || !query) return
    const firstEnabled = filteredOptions.findIndex((option) => !option.disabled)
    setActiveIndex(firstEnabled >= 0 ? firstEnabled : 0)
  }, [query, open, filteredOptions])

  useEffect(() => {
    if (!open) return
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const emitSingle = (nextValue: string) => {
    if (!isControlled) setUncontrolledSingle(nextValue)
    if (!multiple) {
      props.onChange?.({ target: { value: nextValue, name } })
    }
  }

  const emitMulti = (nextValue: string[]) => {
    if (!isControlled) setUncontrolledMulti(nextValue)
    if (multiple) {
      props.onChange?.({ target: { value: nextValue, name } })
    }
  }

  const toggleMultiValue = (optionValue: string) => {
    const next = multiValue.includes(optionValue)
      ? multiValue.filter((entry) => entry !== optionValue)
      : [...multiValue, optionValue]
    emitMulti(next)
  }

  const commitSingle = (nextValue: string) => {
    emitSingle(nextValue)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const moveActive = (delta: number) => {
    const enabledIndexes = getEnabledIndexes()
    if (!enabledIndexes.length) return
    const currentPos = enabledIndexes.indexOf(activeIndex)
    const start = currentPos >= 0 ? currentPos : 0
    const nextPos =
      (start + delta + enabledIndexes.length) % enabledIndexes.length
    setActiveIndex(enabledIndexes[nextPos])
  }

  const activateOption = (option: SelectOption) => {
    if (option.disabled) return
    if (multiple) {
      toggleMultiValue(option.value)
      return
    }
    commitSingle(option.value)
  }

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || readOnly) return

    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault()
      setOpen(true)
    }
  }

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const enabledIndexes = getEnabledIndexes()

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveActive(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveActive(-1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      if (enabledIndexes.length) setActiveIndex(enabledIndexes[0])
    } else if (event.key === 'End') {
      event.preventDefault()
      if (enabledIndexes.length) {
        setActiveIndex(enabledIndexes[enabledIndexes.length - 1])
      }
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = filteredOptions[activeIndex]
      if (option) activateOption(option)
    } else if (event.key === ' ' && event.target === listboxRef.current) {
      event.preventDefault()
      const option = filteredOptions[activeIndex]
      if (option) activateOption(option)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  const activeOption = filteredOptions[activeIndex]

  const panel = open ? (
    <div
      ref={panelRef}
      className={cx('pd-select__panel', size === 'sm' && 'pd-select__panel--sm')}
      style={panelStyle}
      onKeyDown={handlePanelKeyDown}
    >
      {searchable ? (
        <div className="pd-select__search">
          <Search
            className="pd-select__search-icon"
            size={15}
            strokeWidth={2.25}
            aria-hidden
          />
          <input
            ref={searchRef}
            id={searchId}
            type="search"
            className="pd-select__search-input"
            placeholder={searchPlaceholder}
            value={query}
            aria-label={searchPlaceholder}
            aria-controls={listboxId}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === ' ') {
                // Keep spaces in the query; don't toggle options.
                event.stopPropagation()
              }
            }}
          />
          {query ? (
            <button
              type="button"
              className="pd-select__search-clear"
              aria-label="Clear search"
              onClick={() => {
                setQuery('')
                searchRef.current?.focus()
              }}
            >
              <X size={14} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        id={listboxId}
        role="listbox"
        tabIndex={searchable ? -1 : 0}
        aria-multiselectable={multiple || undefined}
        aria-labelledby={label ? selectId : undefined}
        aria-label={!label ? ariaLabel : undefined}
        aria-activedescendant={
          activeOption ? `${selectId}-option-${activeOption.value}` : undefined
        }
        className="pd-select__options"
        ref={listboxRef}
      >
        {filteredOptions.length === 0 ? (
          <div className="pd-select__empty">No matches</div>
        ) : (
          filteredOptions.map((option, index) => {
            const isSelected = multiple
              ? multiValue.includes(option.value)
              : option.value === singleValue
            const isActive = index === activeIndex
            const OptionIcon = option.icon
            return (
              <div
                key={option.value}
                ref={(node) => {
                  optionRefs.current[index] = node
                }}
                id={`${selectId}-option-${option.value}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                className={cx(
                  'pd-select__option',
                  multiple && 'pd-select__option--multi',
                  isSelected && 'is-selected',
                  isActive && 'is-active',
                  option.disabled && 'is-disabled',
                )}
                onMouseEnter={() => {
                  if (!option.disabled) setActiveIndex(index)
                }}
                onClick={() => activateOption(option)}
              >
                {multiple ? (
                  <span
                    className={cx(
                      'pd-select__checkbox',
                      isSelected && 'is-checked',
                    )}
                    aria-hidden
                  >
                    {isSelected ? <Check size={12} strokeWidth={3} /> : null}
                  </span>
                ) : null}
                {OptionIcon ? (
                  <OptionIcon
                    className="pd-select__option-icon"
                    size={15}
                    strokeWidth={2.25}
                    aria-hidden
                  />
                ) : null}
                <span className="pd-select__option-label">{option.label}</span>
                {!multiple && isSelected ? (
                  <Check
                    className="pd-select__check"
                    size={16}
                    strokeWidth={2.25}
                    aria-hidden
                  />
                ) : null}
              </div>
            )
          })
        )}
      </div>

      {multiple && multiValue.length > 0 ? (
        <div className="pd-select__footer">
          <button
            type="button"
            className="pd-select__clear-selection"
            onClick={() => emitMulti([])}
          >
            Clear selection
          </button>
        </div>
      ) : null}
    </div>
  ) : null

  return (
    <div
      ref={containerRef}
      className={cx(
        'pd-field',
        'pd-select',
        size === 'sm' && 'pd-select--sm',
        multiple && 'pd-select--multiple',
        outlined && 'pd-field--outlined',
        outlined && 'pd-select--outlined',
        error && 'pd-field--error',
        open && 'is-open',
        className,
      )}
    >
      {label ? (
        <label className="pd-field__label" htmlFor={selectId}>
          {label}
        </label>
      ) : null}

      {name && !multiple ? (
        <input type="hidden" name={name} value={singleValue} />
      ) : null}
      {name && multiple
        ? multiValue.map((entry) => (
            <input key={entry} type="hidden" name={name} value={entry} />
          ))
        : null}

      <div className="pd-select__control">
        <button
          ref={triggerRef}
          id={selectId}
          type="button"
          className={cx(
            'pd-field__control',
            'pd-field__control--select',
            'pd-select__trigger',
            isPlaceholder && 'pd-select__trigger--placeholder',
          )}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          aria-readonly={readOnly || undefined}
          onClick={() => {
            if (!disabled && !readOnly) setOpen((current) => !current)
          }}
          onKeyDown={handleTriggerKeyDown}
        >
          <span className="pd-select__value">
            {SelectedIcon ? (
              <SelectedIcon
                className="pd-select__value-icon"
                size={valueIconSize}
                strokeWidth={2.25}
                aria-hidden
              />
            ) : null}
            {displayLabel}
          </span>
          <ChevronDown
            className="pd-select__chevron"
            size={size === 'sm' ? 14 : 16}
            strokeWidth={2.25}
            aria-hidden
          />
        </button>

        {panel && typeof document !== 'undefined'
          ? createPortal(panel, document.body)
          : null}
      </div>

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
