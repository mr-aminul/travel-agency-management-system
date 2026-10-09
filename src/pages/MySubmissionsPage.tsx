import { useMemo } from 'react'
import { Badge, EmptyState, PageHeader } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { getActiveTenantId } from '@/lib/authApi'
import { usePendingChanges } from '@/lib/subAgentPendingChanges'
import { formatDisplayDate } from '@/lib/formatDate'
import '@/styles/layout-ops.css'

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
      <PageHeader
        title="My submissions"
        description="Changes you sent for agency approval. Pending items go live after an approver accepts them."
      />

      {mine.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="When the agency requires approval, your client and service edits appear here."
        />
      ) : (
        <ul className="pd-approval-list">
          {mine.map((change) => (
            <li key={change.id} className="pd-approval-card">
              <div className="pd-approval-card__main">
                <div className="pd-approval-card__title-row">
                  <strong>{change.summary}</strong>
                  <Badge
                    variant={
                      change.status === 'pending'
                        ? 'pending'
                        : change.status === 'approved'
                          ? 'completed'
                          : 'neutral'
                    }
                  >
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
