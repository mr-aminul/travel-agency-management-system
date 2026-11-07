import { useMemo, useState } from 'react'
import { CheckCircle2, ClipboardCheck, Clock3, Inbox } from 'lucide-react'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import { SegmentedNav } from '@/components/shadcn/segmented-nav'
import {
  elevatedPageClass,
  summaryStatClass,
  summaryStatGroupClass,
  summaryStatLabelClass,
  summaryStatPeekClass,
  summaryStatValueClass,
} from '@/components/clients/shadcnChrome'
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
import { cn } from '@/lib/utils'
import '@/styles/layout-clients.css'

function isPublicIntake(change: { submittedByUserId: string }) {
  return change.submittedByUserId.startsWith('public-intake:')
}

function statusBadgeVariant(
  status: string,
): 'secondary' | 'default' | 'outline' {
  if (status === 'pending') return 'secondary'
  if (status === 'approved') return 'default'
  return 'outline'
}

function statusLabel(change: {
  status: string
  submittedByUserId: string
}): string {
  if (change.status === 'pending' && isPublicIntake(change)) {
    return 'Partial Approval'
  }
  if (change.status === 'pending') return 'Pending'
  if (change.status === 'approved') return 'Approved'
  if (change.status === 'rejected') return 'Rejected'
  return change.status
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

  const scoped = useMemo(() => {
    let rows = changes
    if (user?.role === 'sub_agent' && user.subAgentId) {
      rows = rows.filter((row) => row.subAgentId === user.subAgentId)
    }
    return rows
  }, [changes, user])

  const pendingCount = useMemo(
    () => scoped.filter((row) => row.status === 'pending').length,
    [scoped],
  )

  const visible = useMemo(() => {
    let rows = scoped
    if (filter === 'pending') {
      rows = rows.filter((row) => row.status === 'pending')
    }
    return rows.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [scoped, filter])

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
    <div
      className={cn(elevatedPageClass, 'pd-page pd-page--elevated')}
      data-elevated-canvas
      aria-label="Approvals"
    >
      <div className={summaryStatGroupClass} role="group" aria-label="Approval stats">
        <Button
          type="button"
          variant="ghost"
          className={summaryStatClass}
          aria-pressed={filter === 'pending'}
          onClick={() => setFilter('pending')}
        >
          <Clock3 className={summaryStatPeekClass} size={76} strokeWidth={1.25} aria-hidden />
          <span className={summaryStatLabelClass}>
            <Clock3 size={14} strokeWidth={1.75} aria-hidden />
            Pending
          </span>
          <span className={summaryStatValueClass}>{pendingCount}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          className={summaryStatClass}
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          <Inbox className={summaryStatPeekClass} size={76} strokeWidth={1.25} aria-hidden />
          <span className={summaryStatLabelClass}>
            <Inbox size={14} strokeWidth={1.75} aria-hidden />
            All Submissions
          </span>
          <span className={summaryStatValueClass}>{scoped.length}</span>
        </Button>
      </div>

      <SegmentedNav
        aria-label="Filter"
        value={filter}
        onValueChange={(next) => setFilter(next as 'pending' | 'all')}
        items={[
          { id: 'pending', label: 'Pending' },
          { id: 'all', label: 'All' },
        ]}
      />

      {error ? (
        <p className="m-0 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <Empty className="min-h-[14rem] justify-center border border-border bg-card shadow-sm">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardCheck aria-hidden />
            </EmptyMedia>
            <EmptyTitle>
              {filter === 'pending' ? 'Nothing To Approve' : 'No Submissions Yet'}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {visible.map((change) => {
            const subAgent = findSubAgentById(change.subAgentId)
            const showActions =
              change.status === 'pending' && canApproveChange(change.subAgentId)
            return (
              <li key={change.id}>
                <Card size="sm" className="shadow-sm">
                  <CardHeader className="gap-2 border-b border-border">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold leading-snug">
                        {change.summary}
                      </CardTitle>
                      <Badge variant={statusBadgeVariant(change.status)}>
                        {statusLabel(change)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1 pt-3 text-sm text-muted-foreground">
                    <p className="m-0">
                      {subAgent?.name ?? change.subAgentId} ·{' '}
                      {change.submittedByName} · {change.action}{' '}
                      {change.entityType} · {formatDisplayDate(change.createdAt)}
                    </p>
                    {change.reviewedByName ? (
                      <p className="m-0">
                        Reviewed by {change.reviewedByName}
                        {change.reviewedAt
                          ? ` · ${formatDisplayDate(change.reviewedAt)}`
                          : ''}
                      </p>
                    ) : null}
                  </CardContent>
                  {showActions ? (
                    <CardFooter className="justify-end gap-2 border-t border-border">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-lg"
                        onClick={() => reject(change.id)}
                      >
                        Reject
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 rounded-lg"
                        onClick={() => approve(change.id)}
                      >
                        <CheckCircle2 size={14} strokeWidth={2.25} aria-hidden />
                        Approve
                      </Button>
                    </CardFooter>
                  ) : null}
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
