import { useMemo, useState } from 'react'
import { Badge, Button, EmptyState, PageHeader } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import {
  applyApprovedPendingChange,
  rejectPendingChange,
} from '@/lib/applyPendingChange'
import { getActiveTenantId } from '@/lib/authApi'
import { useSubAgentAccessSettings } from '@/lib/subAgentAccessSettings'
import { usePendingChanges } from '@/lib/subAgentPendingChanges'
import { findTenantMemberForUser } from '@/lib/tenantMembersStore'
import { findSubAgentById } from '@/lib/subAgentsStore'
import { formatDisplayDate } from '@/lib/formatDate'
import '@/styles/layout-ops.css'

export default function ApprovalsPage() {
  const { user } = useAuth()
  const tenantId = getActiveTenantId()
  const changes = usePendingChanges(tenantId)
  const settings = useSubAgentAccessSettings(tenantId)
  const member = user
    ? findTenantMemberForUser(tenantId, user.id, user.email)
    : undefined
  const canApprove = (() => {
    if (user?.role !== 'agency_user' || !member || member.status !== 'active') {
      return false
    }
    if (settings.approverMemberIds.length > 0) {
      return settings.approverMemberIds.includes(member.id)
    }
    return member.role === 'owner' || member.role === 'manager'
  })()

  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [error, setError] = useState<string | null>(null)

  const visible = useMemo(() => {
    const rows =
      filter === 'pending'
        ? changes.filter((row) => row.status === 'pending')
        : changes
    return rows.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [changes, filter])

  const approve = (id: string) => {
    setError(null)
    const change = changes.find((row) => row.id === id)
    if (!change || !user) return
    try {
      applyApprovedPendingChange(change, {
        userId: user.id,
        name: user.name,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve.')
    }
  }

  const reject = (id: string) => {
    setError(null)
    const change = changes.find((row) => row.id === id)
    if (!change || !user) return
    try {
      rejectPendingChange(change, { userId: user.id, name: user.name })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reject.')
    }
  }

  return (
    <div className="pd-page">
      <PageHeader
        title="Approvals"
        description="Review changes submitted by logged-in sub-agents before they go live."
      />

      <div className="pd-toolbar" role="group" aria-label="Filter">
        <Button
          type="button"
          variant={filter === 'pending' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('pending')}
        >
          Pending
        </Button>
        <Button
          type="button"
          variant={filter === 'all' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
      </div>

      {error ? <p role="alert">{error}</p> : null}

      {visible.length === 0 ? (
        <EmptyState
          title={filter === 'pending' ? 'Nothing to approve' : 'No submissions yet'}
          description="When sub agents add or edit clients and services, those changes appear here if approval is required."
        />
      ) : (
        <ul className="pd-approval-list">
          {visible.map((change) => {
            const subAgent = findSubAgentById(change.subAgentId)
            return (
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
                    {subAgent?.name ?? change.subAgentId} ·{' '}
                    {change.submittedByName} · {change.action} {change.entityType}{' '}
                    · {formatDisplayDate(change.createdAt)}
                  </p>
                  {change.reviewedByName ? (
                    <p>
                      Reviewed by {change.reviewedByName}
                      {change.reviewedAt
                        ? ` · ${formatDisplayDate(change.reviewedAt)}`
                        : ''}
                    </p>
                  ) : null}
                </div>
                {change.status === 'pending' && canApprove ? (
                  <div className="pd-form-actions">
                    <Button type="button" size="sm" onClick={() => approve(change.id)}>
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => reject(change.id)}
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
