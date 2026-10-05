import { useGlobalSearch } from './GlobalSearchProvider'
import { GlobalSearchPalette } from './GlobalSearchPalette'

export function TopBarSearch() {
  const { searchRef, items } = useGlobalSearch()

  return <GlobalSearchPalette ref={searchRef} items={items} />
}
