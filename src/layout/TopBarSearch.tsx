import { useMemo, useRef, useEffect, useState, useId } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { layoutConfig } from '@/config/layout'
import { filterNavItems, flattenNavItems } from '@/lib/modules'
import { useActiveTenant } from '@/lib/useActiveTenant'
import { useAuth } from '@/lib/useAuth'
import type { NavItem } from '@/layout/types'

function filterPages(pages: NavItem[], query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return pages
  return pages.filter(
    (page) =>
      page.label.toLowerCase().includes(normalized) ||
      page.path.toLowerCase().includes(normalized),
  )
}

export function TopBarSearch() {
  const { user } = useAuth()
  const tenant = useActiveTenant()
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const pages = useMemo(() => {
    const nav = filterNavItems(
      layoutConfig.navItems,
      tenant.enabledModules,
      user?.role ?? 'agency_user',
    )
    return flattenNavItems(nav)
  }, [tenant.enabledModules, user?.role])
  const results = filterPages(pages, query)

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) return

    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (user?.role === 'platform_admin') return null

  const closeSearch = () => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  const goToPage = (path: string) => {
    navigate(path)
    closeSearch()
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: {
    key: string
    preventDefault: () => void
  }) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeSearch()
      inputRef.current?.blur()
      return
    }

    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }

    if (!results.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index + 1) % results.length)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index - 1 + results.length) % results.length)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const page = results[activeIndex]
      if (page) goToPage(page.path)
    }
  }

  return (
    <div ref={containerRef} className="pd-topbar__search-wrap">
      <label className="pd-topbar__search">
        <Search
          size={14}
          strokeWidth={2}
          className="pd-topbar__search-icon"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          className="pd-topbar__search-input"
          placeholder="Search pages"
          aria-label="Search pages"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          role="combobox"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </label>
      {open && (
        <div
          className="pd-topbar__dropdown-panel pd-topbar__dropdown-panel--search"
          role="listbox"
          id={listId}
          aria-label="Pages"
        >
          <div className="pd-topbar__search-section-label">Pages</div>
          {results.length === 0 ? (
            <div className="pd-topbar__search-empty">No pages found</div>
          ) : (
            <ul className="pd-topbar__search-list">
              {results.map((page, index) => {
                const Icon = page.icon
                const isActive = index === activeIndex
                return (
                  <li key={page.path} role="option" aria-selected={isActive}>
                    <Link
                      to={page.path}
                      className={
                        isActive
                          ? 'pd-topbar__search-result pd-topbar__search-result--active'
                          : 'pd-topbar__search-result'
                      }
                      onClick={closeSearch}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span className="pd-topbar__search-result-icon" aria-hidden>
                        {Icon ? <Icon size={14} strokeWidth={2} /> : null}
                      </span>
                      <span className="pd-topbar__search-result-text">
                        <span className="pd-topbar__search-result-label">
                          {page.label}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
