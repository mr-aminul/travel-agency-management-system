import { useEffect, useMemo, useState } from 'react'
import { ScrollText } from 'lucide-react'
import { Select } from '@/components/clients/clientShadcnFields'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/shadcn/empty'
import { PageHeader } from '@/components/shadcn/page-header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import { useAuth } from '@/lib/auth'
import { formatDisplayDateTime } from '@/lib/formatDate'
import {
  listPlatformAudit,
  type PlatformAuditEntry,
} from '@/lib/platformAdminApi'
import { useTenants } from '@/lib/tenantsStore'
import { cn } from '@/lib/utils'
import {
  adminQuietClass,
  adminToolbarRowClass,
  chromeHeadClass,
  elevatedPageClass,
  tableShellClass,
} from '@/components/admin/adminChrome'
import '@/styles/layout-admin.css'
import '@/styles/layout-clients.css'

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
      { value: 'all', label: 'All Agencies' },
      ...tenants.map((t) => ({ value: t.id, label: t.name })),
    ],
    [tenants],
  )

  const tenantName = (id: string) =>
    tenants.find((t) => t.id === id)?.name ?? id

  if (user?.role !== 'platform_admin') return null

  return (
    <div
      className={cn(
        elevatedPageClass,
        'pd-page pd-page--elevated pd-admin',
        lockedTenantId && 'pd-admin--embedded',
      )}
      data-elevated-canvas
      aria-label="Activity"
    >
      {lockedTenantId ? null : (
        <PageHeader title="Activity" />
      )}

      {lockedTenantId ? null : (
        <div className={adminToolbarRowClass}>
          <Select
            label="Agency"
            value={tenantFilter}
            options={tenantOptions}
            onChange={(event) => setTenantFilter(event.target.value)}
          />
        </div>
      )}

      {loading ? (
        <p className={adminQuietClass}>Loading audit…</p>
      ) : audit.length === 0 ? (
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <ScrollText size={20} aria-hidden />
            <EmptyTitle>
              {tenantFilter === 'all'
                ? 'No Audit Entries'
                : 'No Entries For This Agency'}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className={tableShellClass}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className={chromeHeadClass}>When</TableHead>
                {lockedTenantId ? null : (
                  <TableHead className={chromeHeadClass}>Agency</TableHead>
                )}
                <TableHead className={chromeHeadClass}>Actor</TableHead>
                <TableHead className={chromeHeadClass}>Action</TableHead>
                <TableHead className={chromeHeadClass}>Summary</TableHead>
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
                  <TableCell className="font-mono text-xs">{row.action}</TableCell>
                  <TableCell>{row.summary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
