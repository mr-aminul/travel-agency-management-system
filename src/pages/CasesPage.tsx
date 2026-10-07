import { useMemo } from 'react'
import { CasesList } from '@/components/cases/CasesList'
import { useCases } from '@/lib/casesStore'
import { useEnabledServiceOptions } from '@/lib/serviceCatalog'

export default function CasesPage() {
  const allRequests = useCases()
  const enabled = useEnabledServiceOptions()
  const enabledKeys = useMemo(
    () => new Set(enabled.map((option) => option.value)),
    [enabled],
  )
  const requests = allRequests.filter((item) => enabledKeys.has(item.service))

  return (
    <CasesList
      cases={requests}
      label="Services"
      showClientColumn
      showServiceColumn
      syncNewWithSearchParams
    />
  )
}
