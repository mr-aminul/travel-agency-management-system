import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { isTypingTarget, type SearchItem } from '@/lib/search'
import { useSearchCatalog } from '@/lib/search/useSearchCatalog'
import type { GlobalSearchHandle } from './GlobalSearchPalette'

type GlobalSearchContextValue = {
  openSearch: () => void
  closeSearch: () => void
  items: SearchItem[]
  searchRef: RefObject<GlobalSearchHandle | null>
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null)

export function useGlobalSearch(): GlobalSearchContextValue {
  const context = useContext(GlobalSearchContext)
  if (!context) {
    throw new Error('useGlobalSearch must be used within GlobalSearchProvider')
  }
  return context
}

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const searchRef = useRef<GlobalSearchHandle>(null)
  const items = useSearchCatalog()

  const openSearch = useCallback(() => {
    searchRef.current?.show()
  }, [])

  const closeSearch = useCallback(() => {
    searchRef.current?.hide()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return

      const isCommandK =
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === 'k'

      if (isCommandK) {
        event.preventDefault()
        if (searchRef.current?.isVisible()) {
          searchRef.current.hide()
          return
        }
        searchRef.current?.show()
        return
      }

      if (event.key !== '/') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (searchRef.current?.isVisible()) return
      if (isTypingTarget(event.target)) return
      event.preventDefault()
      searchRef.current?.show()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const value = useMemo(
    () => ({ openSearch, closeSearch, items, searchRef }),
    [closeSearch, items, openSearch],
  )

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
    </GlobalSearchContext.Provider>
  )
}
