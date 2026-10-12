import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { ADMIN_AGENCIES } from '@/lib/adminPaths'
import { formatDisplayDateTime } from '@/lib/formatDate'
import {
  listPlatformAudit,
  type PlatformAuditEntry,
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

export default function AdminActivityPage({
  lockedTenantId,
}: {
  lockedTenantId?: string
}) {
  const { user } = useAuth()
  const tenants = useTenants()
  const [tenantFilter, setTenantFilter] = useState(lockedTenantId ?? 'all')
  const [audit, setAudit] = useState<PlatformAuditEntry[]>([])
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
      const auditRows = await listPlatformAudit({ tenantId, limit: 100 })
      if (cancelled) return
      setAudit(auditRows)
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

  return (
    <div
      className={cx('pd-page pd-admin', lockedTenantId && 'pd-admin--embedded')}
      aria-label="Activity"
    >
      {lockedTenantId ? null : (
        <PageHeader
          title="Activity"
          description="Cross-tenant audit trail for support."
        />
      )}

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

      {loading ? (
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
                    : '-'}
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
