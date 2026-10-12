import { Navigate } from 'react-router-dom'
import { workBoardPath } from '@/lib/workPaths'

/** Legacy URL — board lives on Services as `?view=board`. */
export default function ServiceBoardPage() {
  return <Navigate to={workBoardPath()} replace />
}
