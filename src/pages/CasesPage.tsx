import { CasesList } from '@/components/cases/CasesList'
import { useCases } from '@/lib/casesStore'
import type { CaseVertical } from '@/types/case'

type CasesPageProps = {
  /** When set, list is scoped to that vertical. Omit for All cases. */
  vertical?: CaseVertical
}

export default function CasesPage({ vertical }: CasesPageProps) {
  const allCases = useCases()
  const cases = vertical
    ? allCases.filter((item) => item.vertical === vertical)
    : allCases
  const isAllCases = !vertical

  return (
    <CasesList
      cases={cases}
      label={isAllCases ? 'All cases' : `${vertical} cases`}
      showClientColumn
      showVerticalColumn={isAllCases}
      defaultVertical={vertical}
      lockVertical={!isAllCases}
      syncNewWithSearchParams
    />
  )
}
