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

function isPublicIntake(change: { submittedByUserId: string }) {
  return change.submittedByUserId.startsWith('public-intake:')
}

export default function ApprovalsPage() {
  const { user } = useAuth()
  const tenantId = getActiveTenantId()
  const changes = usePendingChanges(tenantId)
  const settings = useSubAgentAccessSettings(tenantId)
  const member = user
    ? findTenantMemberForUser(tenantId, user.id, user.email)
    : undefined

  const agencyCanApprove = (() => {
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
    let rows = changes
    // Sub-agents only see submissions for their own referrals.
    if (user?.role === 'sub_agent' && user.subAgentId) {
      rows = rows.filter((row) => row.subAgentId === user.subAgentId)
    }
    if (filter === 'pending') {
      rows = rows.filter((row) => row.status === 'pending')
    }
    return rows.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [changes, filter, user])

  const canApproveChange = (subAgentId: string) => {
    if (agencyCanApprove) return true
    if (user?.role === 'sub_agent' && user.subAgentId === subAgentId) {
      return true
    }
    return false
  }

  const approve = (id: string) => {
    setError(null)
    const change = changes.find((row) => row.id === id)
    if (!change || !user || !canApproveChange(change.subAgentId)) return
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
    if (!change || !user || !canApproveChange(change.subAgentId)) return
    try {
      rejectPendingChange(change, { userId: user.id, name: user.name })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reject.')
    }
  }

  return (
    <div className="pd-page">
      <PageHeader title="Approvals" />

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
        />
      ) : (
        <ul className="pd-approval-list">
          {visible.map((change) => {
            const subAgent = findSubAgentById(change.subAgentId)
            const showActions =
              change.status === 'pending' && canApproveChange(change.subAgentId)
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
                      {change.status === 'pending' && isPublicIntake(change)
                        ? 'Partial approval'
                        : change.status}
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
                {showActions ? (
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
