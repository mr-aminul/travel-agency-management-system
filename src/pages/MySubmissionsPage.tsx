import { useMemo } from 'react'
import { Inbox } from 'lucide-react'
import { Badge } from '@/components/shadcn/badge'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import { useAuth } from '@/lib/auth'
import { getActiveTenantId } from '@/lib/authApi'
import { usePendingChanges } from '@/lib/subAgentPendingChanges'
import { formatDisplayDate } from '@/lib/formatDate'
import '@/styles/layout-ops.css'

function statusBadgeVariant(
  status: string,
): 'secondary' | 'default' | 'outline' {
  if (status === 'pending') return 'secondary'
  if (status === 'approved') return 'default'
  return 'outline'
}

export default function MySubmissionsPage() {
  const { user } = useAuth()
  const tenantId = getActiveTenantId()
  const changes = usePendingChanges(tenantId)
  const mine = useMemo(
    () =>
      changes
        .filter((row) => row.submittedByUserId === user?.id)
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [changes, user?.id],
  )

  return (
    <div className="pd-page">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-xl font-semibold tracking-tight">
          My Submissions
        </h1>
      </header>

      {mine.length === 0 ? (
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No Submissions Yet</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="pd-approval-list">
          {mine.map((change) => (
            <li key={change.id} className="pd-approval-card">
              <div className="pd-approval-card__main">
                <div className="pd-approval-card__title-row">
                  <strong>{change.summary}</strong>
                  <Badge variant={statusBadgeVariant(change.status)}>
                    {change.status}
                  </Badge>
                </div>
                <p>
                  {change.action} {change.entityType} ·{' '}
                  {formatDisplayDate(change.createdAt)}
                </p>
                {change.status === 'rejected' && change.rejectReason ? (
                  <p>Reason: {change.rejectReason}</p>
                ) : null}
                {change.status === 'approved' && change.reviewedByName ? (
                  <p>Approved by {change.reviewedByName}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
