import { Navigate, useParams } from 'react-router-dom'
import CaseDetailPage from '@/pages/CaseDetailPage'
import CasesPage from '@/pages/CasesPage'
import { activeTenantAllowsService } from '@/lib/activeTenant'
import { CASE_SERVICE_SLUGS, isCaseServiceSlug } from '@/types/case'

/**
 * `/cases/:id` serves both service lists (`manpower`, …) and case detail ids.
 */
export default function CaseRoute() {
  const { id = '' } = useParams()

  if (isCaseServiceSlug(id)) {
    const service = CASE_SERVICE_SLUGS[id]
    if (!activeTenantAllowsService(service)) {
      return <Navigate to="/cases" replace />
    }
    return <CasesPage service={service} />
  }

  if (!id) {
    return <Navigate to="/cases" replace />
  }

  return <CaseDetailPage />
}
