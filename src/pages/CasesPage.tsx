import { CasesList } from '@/components/cases/CasesList'
import { useCases } from '@/lib/casesStore'
import type { ServiceType } from '@/types/case'

type CasesPageProps = {
  /** When set, list is scoped to that service. Omit for All cases. */
  service?: ServiceType
}

export default function CasesPage({ service }: CasesPageProps) {
  const allCases = useCases()
  const cases = service
    ? allCases.filter((item) => item.service === service)
    : allCases
  const isAllCases = !service

  return (
    <CasesList
      cases={cases}
      label={isAllCases ? 'All cases' : `${service} cases`}
      showClientColumn
      showServiceColumn={isAllCases}
      defaultService={service}
      lockService={!isAllCases}
      syncNewWithSearchParams
    />
  )
}
