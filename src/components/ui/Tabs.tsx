import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cx } from '@/lib/cx'

export type TabItem = {
  id: string
  label: ReactNode
  content: ReactNode
  disabled?: boolean
}

export type TabsProps = HTMLAttributes<HTMLDivElement> & {
  items: TabItem[]
  defaultValue?: string
  value?: string
  onValueChange?: (id: string) => void
  listLabel?: string
}

type IndicatorStyle = {
  left: number
  width: number
  ready: boolean
}

export function Tabs({
  items,
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  listLabel = 'Sections',
  ...props
}: TabsProps) {
  const baseId = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef(new Map<string, HTMLButtonElement>())
  const firstEnabled = items.find((item) => !item.disabled)?.id
  const [uncontrolled, setUncontrolled] = useState(
    defaultValue ?? firstEnabled ?? '',
  )
  const [indicator, setIndicator] = useState<IndicatorStyle>({
    left: 0,
    width: 0,
    ready: false,
  })
  const activeId = controlledValue ?? uncontrolled

  const select = (id: string) => {
    if (controlledValue === undefined) setUncontrolled(id)
    onValueChange?.(id)
  }

  const enabledIds = items.filter((item) => !item.disabled).map((item) => item.id)

  const updateIndicator = useEffectEvent(() => {
    const list = listRef.current
    const tab = tabRefs.current.get(activeId)
    if (!list || !tab) return

    const listRect = list.getBoundingClientRect()
    const tabRect = tab.getBoundingClientRect()
    setIndicator({
      left: tabRect.left - listRect.left + list.scrollLeft,
      width: tabRect.width,
      ready: true,
    })
  })

  useLayoutEffect(() => {
    updateIndicator()
  }, [activeId, items])

  useEffect(() => {
    const list = listRef.current
    if (!list) return

    const onScrollOrResize = () => updateIndicator()
    list.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize)

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(onScrollOrResize)
        : null
    observer?.observe(list)

    return () => {
      list.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
      observer?.disconnect()
    }
  }, [])

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const index = enabledIds.indexOf(id)
    if (index < 0) return

    let nextIndex = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % enabledIds.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + enabledIds.length) % enabledIds.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = enabledIds.length - 1
    } else {
      return
    }

    event.preventDefault()
    const nextId = enabledIds[nextIndex]
    select(nextId)
    document.getElementById(`${baseId}-tab-${nextId}`)?.focus()
  }

  const active = items.find((item) => item.id === activeId) ?? items[0]

  return (
    <div className={cx('pd-tabs', className)} {...props}>
      <div
        ref={listRef}
        className="pd-tabs__list"
        role="tablist"
        aria-label={listLabel}
      >
        {items.map((item) => {
          const selected = item.id === active?.id
          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node) tabRefs.current.set(item.id, node)
                else tabRefs.current.delete(item.id)
              }}
              id={`${baseId}-tab-${item.id}`}
              type="button"
              role="tab"
              className={cx('pd-tabs__tab', selected && 'is-selected')}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => select(item.id)}
              onKeyDown={(event) => onTabKeyDown(event, item.id)}
            >
              {item.label}
            </button>
          )
        })}
        <span
          className={cx(
            'pd-tabs__indicator',
            indicator.ready && 'is-ready',
          )}
          aria-hidden
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width,
          }}
        />
      </div>
      {items.map((item) => {
        const selected = item.id === active?.id
        return (
          <div
            key={item.id}
            id={`${baseId}-panel-${item.id}`}
            role="tabpanel"
            className={cx('pd-tabs__panel', !selected && 'is-hidden')}
            aria-labelledby={`${baseId}-tab-${item.id}`}
            hidden={!selected}
          >
            {selected ? item.content : null}
          </div>
        )
      })}
    </div>
  )
}
