import { useEffect, useMemo, useState } from 'react'
import { Activity, Search } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import { Input as SearchInput } from '@/components/shadcn/input'
import { PlatformAuditFeed } from '@/components/admin/PlatformAuditFeed'
import { useAuth } from '@/lib/auth'
import {
  listPlatformAudit,
  type PlatformAuditEntry,
} from '@/lib/platformAdminApi'
import { useTenants } from '@/lib/tenantsStore'
import { cn } from '@/lib/utils'
import {
  adminClientsToolbarClass,
  adminQuietClass,
  elevatedPageClass,
} from '@/components/admin/adminChrome'
import { pureWhiteFieldClass } from '@/components/clients/shadcnChrome'
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
  const [search, setSearch] = useState('')
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return audit
    return audit.filter((row) => {
      const agency = tenants.find((t) => t.id === row.tenantId)?.name ?? row.tenantId
      const haystack = [
        row.summary,
        row.action,
        row.actorEmail,
        row.actorUserId,
        row.entityType,
        row.entityId,
        agency,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [audit, search, tenants])

  if (user?.role !== 'platform_admin') return null

  // When embedded in TenantAdminLayout, do not nest another `.pd-page` /
  // `data-elevated-canvas` — that fights the shell flex scroll pane.
  return (
    <div
      className={cn(
        lockedTenantId
          ? 'flex flex-col gap-4'
          : cn(elevatedPageClass, 'pd-page pd-page--elevated pd-admin pd-clients'),
      )}
      data-elevated-canvas={lockedTenantId ? undefined : true}
      aria-label="Activity"
    >
      {lockedTenantId ? null : (
        <div className={adminClientsToolbarClass}>
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <SearchInput
              className={cn('pl-8', pureWhiteFieldClass)}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Activity…"
              aria-label="Search Activity"
            />
          </div>
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger
              aria-label="Agency"
              className={cn(pureWhiteFieldClass, 'w-[14rem]')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tenantOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <section
        className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        aria-label="Recent activity"
      >
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
          <span
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
            aria-hidden
          >
            <Activity size={15} strokeWidth={2.25} />
          </span>
          <h2 className="m-0 text-sm font-semibold">Recent Activity</h2>
        </div>

        {loading ? (
          <p className={cn(adminQuietClass, 'px-3.5 py-6')}>Loading audit…</p>
        ) : (
          <PlatformAuditFeed
            rows={filtered}
            agencyNameFor={
              lockedTenantId ? undefined : (id) => tenantName(id)
            }
            emptyLabel={
              tenantFilter === 'all'
                ? 'No Recent Activity'
                : 'No Entries For This Agency'
            }
            maxHeightClass="max-h-[min(40rem,calc(100vh-14rem))]"
          />
        )}
      </section>
    </div>
  )
}
