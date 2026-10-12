import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CasesList } from '@/components/cases/CasesList'
import { ServiceBoardView } from '@/components/cases/ServiceBoardView'
import { ServicesViewToggle } from '@/components/cases/ServicesViewToggle'
import { useCases } from '@/lib/casesStore'
import { useEnabledServiceOptions } from '@/lib/serviceCatalog'
import { parseServicesView, type ServicesView } from '@/lib/workPaths'

export default function CasesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = parseServicesView(searchParams.get('view'))
  const allRequests = useCases()
  const enabled = useEnabledServiceOptions()
  const enabledKeys = useMemo(
    () => new Set(enabled.map((option) => option.value)),
    [enabled],
  )
  const requests = allRequests.filter((item) => enabledKeys.has(item.service))

  const setView = (next: ServicesView) => {
    const params = new URLSearchParams(searchParams)
    if (next === 'board') params.set('view', 'board')
    else params.delete('view')
    if (next !== 'list') params.delete('new')
    setSearchParams(params, { replace: true })
  }

  const viewToggle = <ServicesViewToggle view={view} onChange={setView} />

  if (view === 'board') {
    return <ServiceBoardView viewToggle={viewToggle} />
  }

  return (
    <CasesList
      cases={requests}
      label="Services"
      showClientColumn
      showServiceColumn
      syncNewWithSearchParams
      viewToggle={viewToggle}
    />
  )
}
