import { useSearchParams } from 'react-router-dom'
import { CasesList } from '@/components/cases/CasesList'
import { useCases } from '@/lib/casesStore'
import { resolveServiceFromSlug } from '@/lib/serviceCatalog'
import type { ServiceType } from '@/types/case'

export default function CasesPage({ service: serviceProp }: { service?: ServiceType } = {}) {
  const [searchParams] = useSearchParams()
  const slug = searchParams.get('service') ?? ''
  const fromQuery = resolveServiceFromSlug(slug)
  const service = serviceProp ?? fromQuery
  const allRequests = useCases()
  const requests = service
    ? allRequests.filter((item) => item.service === service)
    : allRequests
  const isAllServices = !service

  return (
    <CasesList
      cases={requests}
      label={isAllServices ? 'Services' : service}
      showClientColumn
      showServiceColumn={isAllServices}
      defaultService={service}
      lockService={!isAllServices}
      syncNewWithSearchParams
    />
  )
}
