import { Navigate, useLocation, useParams } from 'react-router-dom'
import { getCaseById, useCases } from '@/lib/casesStore'
import { workDetailPath, workInvoicePath, workListPath } from '@/lib/workPaths'
import { isCaseServiceSlug } from '@/types/case'

/** Old Cases / Work / Services-detail URLs → the client who owns the file. */
export default function LegacyCasesRedirect() {
  useCases()
  const { id = '' } = useParams()
  const { search, pathname } = useLocation()
  const isInvoice = pathname.endsWith('/invoice')

  if (isCaseServiceSlug(id)) {
    return <Navigate to={`${workListPath()}?service=${id}`} replace />
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
