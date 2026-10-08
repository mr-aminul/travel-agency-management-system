import { GlobalSearchPalette } from '@/layout/GlobalSearchPalette'
import { useGlobalSearch } from '@/layout/GlobalSearchProvider'

export function HomeGlobalSearch() {
  const { searchRef, items } = useGlobalSearch()

  return (
    <div className="pd-home-search" data-tour="home-search">
      <GlobalSearchPalette ref={searchRef} items={items} />
    </div>
  )
}
