import { Avatar } from '@/components/ui'
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { cx } from '@/lib/cx'
import {
  placeholderHintsFromGroups,
  presentSearchResults,
  readRecentSearchIds,
  rememberSearchVisit,
  SEARCH_PLACEHOLDER_FALLBACK,
  SEARCH_SCOPES,
  useTypewriterPlaceholder,
  type HighlightRange,
  type RankedSearchItem,
  type SearchItem,
  type SearchScope,
} from '@/lib/search'

export type GlobalSearchHandle = {
  show: () => void
  hide: () => void
  isVisible: () => boolean
}

type GlobalSearchPaletteProps = {
  items: SearchItem[]
  onClose?: () => void
  /** Typewriter Recent/Jump To hints — home hero only, not the top bar. */
  animatePlaceholder?: boolean
}

function HighlightedText({
  text,
  ranges,
}: {
  text: string
  ranges: HighlightRange[]
}) {
  if (ranges.length === 0) return text

  const parts: ReactNode[] = []
  let cursor = 0
  ranges.forEach((range, index) => {
    const start = Math.max(0, Math.min(range.start, text.length))
    const end = Math.max(start, Math.min(range.end, text.length))
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(
      <mark key={`${start}-${end}-${index}`} className="pd-global-search__mark">
        {text.slice(start, end)}
      </mark>,
    )
    cursor = end
  })
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

function SearchKbd({ children }: { children: ReactNode }) {
  return <kbd className="pd-global-search__kbd">{children}</kbd>
}

export const GlobalSearchPalette = forwardRef<
  GlobalSearchHandle,
  GlobalSearchPaletteProps
>(function GlobalSearchPalette(
  { items, onClose, animatePlaceholder = false },
  ref,
) {
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const openRef = useRef(false)
  const listId = useId()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [chipScope, setChipScope] = useState<SearchScope>('all')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentIds, setRecentIds] = useState(readRecentSearchIds)

  openRef.current = open

  const presented = useMemo(
    () => presentSearchResults(items, query, chipScope, recentIds),
    [chipScope, items, query, recentIds],
  )
  const results = presented.flat

  const idleHints = useMemo(() => {
    if (!animatePlaceholder) return []
    return placeholderHintsFromGroups(
      presentSearchResults(items, '', 'all', recentIds).groups,
    )
  }, [animatePlaceholder, items, recentIds])
  const typewriter = useTypewriterPlaceholder(
    idleHints,
    animatePlaceholder && !query.trim(),
  )
  const showHint = animatePlaceholder && !query.trim()
  const HintIcon = typewriter.hint?.icon

  const resetIdleState = () => {
    setQuery('')
    setChipScope('all')
    setActiveIndex(0)
    setRecentIds(readRecentSearchIds())
  }

  const show = () => {
    openRef.current = true
    setOpen(true)
    setRecentIds(readRecentSearchIds())
    inputRef.current?.focus()
  }

  const hide = () => {
    const wasOpen = openRef.current
    openRef.current = false
    setOpen(false)
    resetIdleState()
    inputRef.current?.blur()
    if (wasOpen) onClose?.()
  }

  useImperativeHandle(ref, () => ({
    show,
    hide,
    isVisible: () => openRef.current,
  }))

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (wrapRef.current?.contains(event.target as Node)) return
      setOpen(false)
      resetIdleState()
      inputRef.current?.blur()
      onClose?.()
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [onClose, open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, chipScope])

  useEffect(() => {
    if (!open || activeIndex === 0) return
    itemRefs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex, open])

  const goToItem = (item: RankedSearchItem | SearchItem) => {
    rememberSearchVisit(item)
    setRecentIds(readRecentSearchIds())
    navigate(item.path)
    hide()
  }

  const cycleScope = (direction: 1 | -1) => {
    const index = SEARCH_SCOPES.findIndex((scope) => scope.id === chipScope)
    const next =
      SEARCH_SCOPES[(index + direction + SEARCH_SCOPES.length) % SEARCH_SCOPES.length]
    setChipScope(next.id)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      hide()
      return
    }

    if (event.key === 'Tab') {
      event.preventDefault()
      setOpen(true)
      cycleScope(event.shiftKey ? -1 : 1)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      if (results.length === 0) return
      setActiveIndex((index) => (index + 1) % results.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      if (results.length === 0) return
      setActiveIndex((index) => (index - 1 + results.length) % results.length)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      if (results.length === 0) return
      setActiveIndex(results.length - 1)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      setOpen(true)
      const item = results[activeIndex]
      if (item) goToItem(item)
    }
  }

  let walkingIndex = 0

  return (
    <div ref={wrapRef} className="pd-topbar__search-wrap">
      <label className="pd-topbar__search">
        <Search
          size={14}
          strokeWidth={2}
          className="pd-topbar__search-icon"
          aria-hidden
        />
        <span className="pd-topbar__search-field">
          <input
            ref={inputRef}
            type="search"
            className="pd-topbar__search-input"
            placeholder={showHint ? '' : SEARCH_PLACEHOLDER_FALLBACK}
            aria-label="Search OneTrack"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={
              open && results[activeIndex]
                ? `${listId}-option-${activeIndex}`
                : undefined
            }
            aria-autocomplete="list"
            aria-keyshortcuts="/"
            role="combobox"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              setOpen(true)
              setRecentIds(readRecentSearchIds())
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          {showHint ? (
            <span className="pd-topbar__search-hint" aria-hidden>
              {typewriter.hint?.avatarName ? (
                <Avatar
                  name={typewriter.hint.avatarName}
                  src={typewriter.hint.avatarUrl}
                  size="sm"
                  className="pd-topbar__search-hint-avatar"
                />
              ) : HintIcon ? (
                <span className="pd-topbar__search-hint-icon">
                  <HintIcon size={14} strokeWidth={1.85} />
                </span>
              ) : null}
              <span className="pd-topbar__search-hint-text">
                {typewriter.text ||
                  (typewriter.hint ? '\u00a0' : SEARCH_PLACEHOLDER_FALLBACK)}
              </span>
            </span>
          ) : null}
        </span>
        {query ? (
          <button
            type="button"
            className="pd-topbar__search-clear"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
          >
            <X size={12} strokeWidth={2.25} aria-hidden />
          </button>
        ) : (
          <SearchKbd>/</SearchKbd>
        )}
      </label>

      {open ? (
        <div
          className="pd-topbar__dropdown-panel pd-topbar__dropdown-panel--search pd-global-search pd-global-search--inline"
          role="presentation"
        >
          <nav className="pd-global-search__filters" aria-label="Filter results">
            {SEARCH_SCOPES.map((scope) => (
              <button
                key={scope.id}
                type="button"
                className={cx(
                  'pd-global-search__filter',
                  chipScope === scope.id && 'is-active',
                )}
                aria-pressed={chipScope === scope.id}
                tabIndex={-1}
                onClick={() => setChipScope(scope.id)}
              >
                {scope.label}
              </button>
            ))}
          </nav>

          <section
            className="pd-global-search__results"
            role="listbox"
            id={listId}
            aria-label="Search results"
          >
            {results.length === 0 ? (
              <p className="pd-global-search__empty">
                {query.trim()
                  ? `No results for “${query.trim()}”. Try @clients, s: files, or > actions.`
                  : 'Type to search, or filter with the chips above.'}
              </p>
            ) : (
              presented.groups.map((group) => (
                <section key={group.id} className="pd-global-search__group">
                  <h3 className="pd-global-search__group-label">{group.label}</h3>
                  <ul className="pd-global-search__list">
                    {group.items.map((item) => {
                      const index = walkingIndex
                      walkingIndex += 1
                      const Icon = item.icon
                      const isActive = index === activeIndex
                      return (
                        <li key={item.id}>
                          <Link
                            id={`${listId}-option-${index}`}
                            ref={(element) => {
                              itemRefs.current[index] = element
                            }}
                            to={item.path}
                            role="option"
                            aria-selected={isActive}
                            tabIndex={-1}
                            className={cx(
                              'pd-global-search__item',
                              isActive && 'is-active',
                            )}
                            onClick={() => {
                              rememberSearchVisit(item)
                              setRecentIds(readRecentSearchIds())
                              hide()
                            }}
                            onMouseEnter={() => setActiveIndex(index)}
                          >
                            {item.avatarName ? (
                              <Avatar
                                name={item.avatarName}
                                src={item.avatarUrl}
                                size="sm"
                                className="pd-global-search__avatar"
                              />
                            ) : (
                              <span
                                className="pd-global-search__item-icon"
                                aria-hidden
                              >
                                {Icon ? (
                                  <Icon size={15} strokeWidth={1.85} />
                                ) : null}
                              </span>
                            )}
                            <span className="pd-global-search__item-text">
                              <span className="pd-global-search__item-label">
                                <HighlightedText
                                  text={item.label}
                                  ranges={item.highlights}
                                />
                              </span>
                              {item.description ? (
                                <span className="pd-global-search__item-description">
                                  {item.description}
                                </span>
                              ) : null}
                            </span>
                            {item.status ? (
                              <span
                                className={cx(
                                  'pd-global-search__status',
                                  item.statusVariant &&
                                    `pd-global-search__status--${item.statusVariant}`,
                                )}
                              >
                                {item.status}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))
            )}
          </section>

          <footer className="pd-global-search__footer">
            <p className="pd-global-search__hints">
              <span>
                <SearchKbd>↑</SearchKbd>
                <SearchKbd>↓</SearchKbd>
                navigate
              </span>
              <span>
                <SearchKbd>↵</SearchKbd>
                open
              </span>
              <span>
                <SearchKbd>tab</SearchKbd>
                filter
              </span>
              <span>
                <SearchKbd>esc</SearchKbd>
                close
              </span>
            </p>
            <p className="pd-global-search__count">
              {results.length === 0
                ? 'No results'
                : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}
            </p>
          </footer>
        </div>
      ) : null}
    </div>
  )
})
