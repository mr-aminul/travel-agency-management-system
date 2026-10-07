import { Navigate, useLocation, useParams } from 'react-router-dom'
import { getCaseById, useCases } from '@/lib/casesStore'
import { resolveServiceFromSlug } from '@/lib/serviceCatalog'
import { workDetailPath, workInvoicePath, workListPath } from '@/lib/workPaths'

/** Old Cases / Work / Services-detail URLs → the client who owns the file. */
export default function LegacyCasesRedirect() {
  useCases()
  const { id = '' } = useParams()
  const { search, pathname } = useLocation()
  const isInvoice = pathname.endsWith('/invoice')
  const queueService = resolveServiceFromSlug(id)

  if (queueService) {
    return <Navigate to={workListPath(queueService)} replace />
  }

  if (!id) {
    return <Navigate to={workListPath()} replace />
  }

  const item = getCaseById(id)
  if (!item) {
    return <Navigate to={workListPath()} replace />
  }

  const target = isInvoice
    ? workInvoicePath(item)
    : workDetailPath(item)

  return <Navigate to={`${target}${search}`} replace />
}
