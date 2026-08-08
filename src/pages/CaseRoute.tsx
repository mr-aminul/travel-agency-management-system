import { Navigate, useParams } from 'react-router-dom'
import CaseDetailPage from '@/pages/CaseDetailPage'
import CasesPage from '@/pages/CasesPage'
import { CASE_VERTICAL_SLUGS, isCaseVerticalSlug } from '@/types/case'

/**
 * `/cases/:id` serves both vertical lists (`manpower`, …) and case detail ids.
 */
export default function CaseRoute() {
  const { id = '' } = useParams()

  if (isCaseVerticalSlug(id)) {
    return <CasesPage vertical={CASE_VERTICAL_SLUGS[id]} />
  }

  if (!id) {
    return <Navigate to="/cases" replace />
  }

  return <CaseDetailPage />
}
