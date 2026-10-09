import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ScrollText, MessageSquare } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { ADMIN_AGENCIES } from '@/lib/adminPaths'
import { formatDisplayDateTime } from '@/lib/formatDate'
import {
  listPlatformAudit,
  listPlatformInboundSms,
  type PlatformAuditEntry,
  type PlatformInboundSms,
} from '@/lib/platformAdminApi'
import { useTenants } from '@/lib/tenantsStore'
import { cx } from '@/lib/cx'
import {
  EmptyState,
  PageHeader,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import '@/styles/layout-admin.css'

type TabId = 'audit' | 'sms'

export default function AdminActivityPage({
  lockedTenantId,
}: {
  lockedTenantId?: string
}) {
  const { user } = useAuth()
  const tenants = useTenants()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: TabId = tabParam === 'sms' ? 'sms' : 'audit'
  const [tenantFilter, setTenantFilter] = useState(lockedTenantId ?? 'all')
  const [audit, setAudit] = useState<PlatformAuditEntry[]>([])
  const [sms, setSms] = useState<PlatformInboundSms[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (lockedTenantId) setTenantFilter(lockedTenantId)
  }, [lockedTenantId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const tenantId =
      tenantFilter === 'all' ? undefined : tenantFilter || undefined
    void (async () => {
      const [auditRows, smsRows] = await Promise.all([
        listPlatformAudit({ tenantId, limit: 100 }),
        tenantId
          ? listPlatformInboundSms({ tenantId, limit: 100 })
          : Promise.resolve([] as PlatformInboundSms[]),
      ])
      if (cancelled) return
      setAudit(auditRows)
      setSms(smsRows)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [tenantFilter])

  const tenantOptions = useMemo(
    () => [
      { value: 'all', label: 'All agencies' },
      ...tenants.map((t) => ({ value: t.id, label: t.name })),
    ],
    [tenants],
  )

  const tenantName = (id: string) =>
    tenants.find((t) => t.id === id)?.name ?? id

  if (user?.role !== 'platform_admin') return null

  const setTab = (next: TabId) => {
    setSearchParams(next === 'audit' ? {} : { tab: next }, { replace: true })
  }

  return (
    <div
      className={cx('pd-page pd-admin', lockedTenantId && 'pd-admin--embedded')}
      aria-label="Activity"
    >
      {lockedTenantId ? null : (
        <PageHeader
          title="Activity"
          description="Cross-tenant audit trail and inbound SMS for support."
        />
      )}

      <div className="pd-admin__tabs" role="tablist" aria-label="Activity tabs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'audit'}
          className={cx('pd-admin__tab', tab === 'audit' && 'is-active')}
          onClick={() => setTab('audit')}
        >
          Audit
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'sms'}
          className={cx('pd-admin__tab', tab === 'sms' && 'is-active')}
          onClick={() => setTab('sms')}
        >
          SMS
        </button>
      </div>

      {lockedTenantId ? null : (
        <div className="pd-admin__toolbar-row">
          <Select
            label="Agency"
            value={tenantFilter}
            options={tenantOptions}
            onChange={(event) => setTenantFilter(event.target.value)}
          />
        </div>
      )}

      {tab === 'audit' ? (
        loading ? (
          <p className="pd-admin__quiet">Loading audit…</p>
        ) : audit.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No audit entries"
            description={
              tenantFilter === 'all'
                ? 'Entries appear when the API is connected and actions are logged.'
                : 'No entries for this agency yet.'
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                {lockedTenantId ? null : <TableHead>Agency</TableHead>}
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {row.createdAt
                      ? formatDisplayDateTime(row.createdAt)
                      : '—'}
                  </TableCell>
                  {lockedTenantId ? null : (
                    <TableCell>{tenantName(row.tenantId)}</TableCell>
                  )}
                  <TableCell>{row.actorEmail || row.actorUserId}</TableCell>
                  <TableCell className="pd-table__code">{row.action}</TableCell>
                  <TableCell>{row.summary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : loading ? (
        <p className="pd-admin__quiet">Loading SMS…</p>
      ) : tenantFilter === 'all' && !lockedTenantId ? (
        <EmptyState
          icon={MessageSquare}
          title="Pick an agency"
          description="Inbound SMS is listed per agency. Choose one above, or open Activity inside an agency."
        />
      ) : sms.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No inbound SMS"
          description="Messages appear when the SMS webhook is receiving traffic for this agency."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Body</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sms.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  {row.receivedAt || row.createdAt
                    ? formatDisplayDateTime(
                        row.receivedAt || row.createdAt || '',
                      )
                    : '—'}
                </TableCell>
                <TableCell>{row.from || '—'}</TableCell>
                <TableCell>{row.body || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {lockedTenantId ? null : (
        <p className="pd-admin__quiet">
          Tip: open an agency from{' '}
          <Link to={ADMIN_AGENCIES}>Agencies</Link> for tenant-scoped activity.
        </p>
      )}
    </div>
  )
}
