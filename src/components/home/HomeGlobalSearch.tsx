import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Handshake, UserRound } from 'lucide-react'
import { SearchField } from '@/components/ui'
import { useClients } from '@/lib/clientsStore'
import { searchWorkspace, type GlobalSearchHit } from '@/lib/globalSearch'
import { isPathAllowed } from '@/lib/modules'
import { usePartners } from '@/lib/partnersStore'
import { useActiveTenant } from '@/lib/useActiveTenant'
import { useAuth } from '@/lib/useAuth'

export function HomeGlobalSearch() {
  const navigate = useNavigate()
  const clients = useClients()
  const partners = usePartners()
  const tenant = useActiveTenant()
  const { user } = useAuth()
  const listId = useId()
  const rootRef = useRef<HTMLFormElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const canOpenPartners = isPathAllowed(
    '/partners',
    tenant.enabledModules,
    user?.role ?? 'agency_user',
  )

  const hits = useMemo(
    () =>
      searchWorkspace(query, {
        clients,
        partners: canOpenPartners ? partners : [],
      }),
    [query, clients, partners, canOpenPartners],
  )

  const showPanel = open && query.trim().length >= 2

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  function goTo(hit: GlobalSearchHit) {
    setOpen(false)
    navigate(hit.href)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const hit = hits[activeIndex] ?? hits[0]
    if (hit) goTo(hit)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!showPanel || hits.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % hits.length)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + hits.length) % hits.length)
    }
  }

  return (
    <form
      ref={rootRef}
      className="pd-home-search"
      role="search"
      onSubmit={handleSubmit}
    >
      <SearchField
        className="pd-home-search__field"
        label="Global search"
        placeholder="Search client ID, passport, NID, mobile or sub agent ID"
        value={query}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showPanel && hits.length > 0 && hits[activeIndex]
            ? `${listId}-opt-${activeIndex}`
            : undefined
        }
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        onClear={() => {
          setQuery('')
          setOpen(false)
        }}
      />

      {showPanel ? (
        <ul id={listId} className="pd-home-search__results" role="listbox">
          {hits.length === 0 ? (
            <li className="pd-home-search__empty" role="presentation">
              No match for “{query.trim()}”.
            </li>
          ) : (
            hits.map((hit, index) => {
              const Icon = hit.kind === 'partner' ? Handshake : UserRound
              const isActive = index === activeIndex
              return (
                <li key={hit.key} role="presentation">
                  <button
                    id={`${listId}-opt-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={
                      isActive
                        ? 'pd-home-search__hit is-active'
                        : 'pd-home-search__hit'
                    }
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => goTo(hit)}
                  >
                    <span className="pd-home-search__hit-icon" aria-hidden>
                      <Icon size={16} strokeWidth={1.8} />
                    </span>
                    <span className="pd-home-search__hit-copy">
                      <span className="pd-home-search__hit-title">
                        {hit.title}
                      </span>
                      <span className="pd-home-search__hit-meta">
                        {hit.subtitle}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </form>
  )
}
