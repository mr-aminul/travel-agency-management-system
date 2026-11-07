import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/shadcn/button'

export type SegmentedNavItem = {
  id: string
  label: ReactNode
  /** When set, renders a router NavLink instead of a button. */
  to?: string
  end?: boolean
}

/**
 * Pill tab strip matching Client detail sections.
 * Supports either controlled buttons or NavLink items.
 */
export function SegmentedNav({
  items,
  value,
  onValueChange,
  'aria-label': ariaLabel,
  className,
}: {
  items: SegmentedNavItem[]
  value?: string
  onValueChange?: (value: string) => void
  'aria-label': string
  className?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef(new Map<string, HTMLElement>())
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(
    null,
  )
  const [activeId, setActiveId] = useState(value ?? items[0]?.id)

  useEffect(() => {
    if (value != null) setActiveId(value)
  }, [value])

  const updateIndicator = useCallback(() => {
    const current = value ?? activeId
    const node = current ? buttonRefs.current.get(current) : undefined
    if (!node) return
    setIndicator({ left: node.offsetLeft, width: node.offsetWidth })
  }, [activeId, value])

  useLayoutEffect(() => {
    updateIndicator()
  }, [updateIndicator, items.length])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new ResizeObserver(() => updateIndicator())
    observer.observe(root)
    window.addEventListener('resize', updateIndicator)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateIndicator)
    }
  }, [updateIndicator])

  const setRef =
    (id: string): Ref<HTMLElement> =>
    (node) => {
      if (node) buttonRefs.current.set(id, node)
      else buttonRefs.current.delete(id)
    }

  const tabClass = (isActive: boolean) =>
    cn(
      'relative z-[1] h-full min-h-0 shrink-0 rounded-md px-3 text-sm font-medium shadow-none',
      isActive
        ? 'text-primary-foreground hover:!bg-transparent hover:text-primary-foreground'
        : 'text-muted-foreground hover:!bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)] hover:text-foreground',
    )

  return (
    <div
      ref={rootRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex h-9 max-w-full items-stretch self-start overflow-x-auto rounded-lg border border-input bg-card p-0.5',
        className,
      )}
    >
      {indicator ? (
        <span
          aria-hidden
          className="pointer-events-none absolute top-0.5 bottom-0.5 z-0 rounded-md bg-primary transition-[left,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: indicator.left, width: indicator.width }}
        />
      ) : null}
      {items.map((item) => {
        if (item.to) {
          return (
            <NavLink
              key={item.id}
              ref={setRef(item.id) as Ref<HTMLAnchorElement>}
              to={item.to}
              end={item.end}
              role="tab"
              className={({ isActive }) =>
                cn(
                  'group/button inline-flex items-center justify-center gap-1.5 border border-transparent bg-clip-padding whitespace-nowrap transition-all outline-none select-none',
                  tabClass(isActive),
                )
              }
            >
              {item.label}
            </NavLink>
          )
        }

        const isActive = (value ?? activeId) === item.id
        return (
          <Button
            key={item.id}
            ref={setRef(item.id) as Ref<HTMLButtonElement>}
            type="button"
            variant="ghost"
            role="tab"
            aria-selected={isActive}
            className={tabClass(isActive)}
            onClick={() => {
              setActiveId(item.id)
              onValueChange?.(item.id)
            }}
          >
            {item.label}
          </Button>
        )
      })}
    </div>
  )
}
