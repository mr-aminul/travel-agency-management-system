import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2,
  ChevronRight,
  PauseCircle,
  Plus,
  Search,
  Timer,
} from 'lucide-react'
import { CopyableText } from '@/components/CopyableText'
import { readAgencyProfile } from '@/lib/agencyProfile'
import { agencyWithOwnerCreateErrors } from '@/lib/agencyUserRules'
import { ADMIN_AGENCIES, adminAgencyPath } from '@/lib/adminPaths'
import { provisionAgencyUser } from '@/lib/authApi'
import { createTenantMember, useTenantMembers } from '@/lib/tenantMembersStore'
import { createTenant, setTenantStatus, useTenants } from '@/lib/tenantsStore'
import { useAuth } from '@/lib/auth'
import { useTouchedFields } from '@/lib/useTouchedFields'
import type { Tenant } from '@/types/tenant'
import { StatCards, type StatCardItem } from '@/components/StatCards'
import {
  adminBusinessNameClass,
  adminClientsToolbarClass,
  adminCredentialNameClass,
  adminCredentialRowClass,
  adminRowChevronClass,
  adminRowClass,
  adminUserClass,
  chromeHeadClass,
  elevatedPageClass,
  tableShellClass,
  whiteControlClass,
} from '@/components/admin/adminChrome'
import '@/styles/layout-admin.css'
import '@/styles/layout-clients.css'
import { floatingSheetClass } from '@/components/clients/shadcnChrome'
import { cn } from '@/lib/utils'
import { Input, Select as FormSelect } from '@/components/clients/clientShadcnFields'
import { Button } from '@/components/shadcn/button'
import { PageHeader } from '@/components/shadcn/page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/shadcn/empty'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { Input as SearchInput } from '@/components/shadcn/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'

const TENANT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'suspended', label: 'Suspended' },
]

const statusTriggerClass = 'h-8 w-[7.5rem] rounded-lg'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

type CreateField = 'name' | 'ownerName' | 'ownerEmail' | 'ownerPassword'

type CreatedCredentials = {
  agencyName: string
  ownerName: string
  email: string
  password: string
  tenantId: string
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'suspended', label: 'Suspended' },
]

export default function TenantsAdminPage() {
  const { user } = useAuth()
  const tenants = useTenants()
  const members = useTenantMembers()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('new') !== '1') return
    setCreateOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('new')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])
  const [name, setName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [formError, setFormError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdCredentials, setCreatedCredentials] =
    useState<CreatedCredentials | null>(null)
  const { markAllTouched, showError, blur, resetTouched } =
    useTouchedFields<CreateField>()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tenants.filter((tenant) => {
      if (statusFilter !== 'all' && tenant.status !== statusFilter) return false
      if (!q) return true
      return (
        tenant.name.toLowerCase().includes(q) ||
        tenant.slug.toLowerCase().includes(q)
      )
    })
  }, [tenants, search, statusFilter])

  if (user?.role !== 'platform_admin') {
    return null
  }

  const values = { name, ownerName, ownerEmail, ownerPassword }
  const errors = agencyWithOwnerCreateErrors(values)

  const cards: StatCardItem[] = [
    {
      id: 'total',
      label: 'Agencies',
      value: String(tenants.length),
      icon: Building2,
      tone: 'brand',
    },
    {
      id: 'trial',
      label: 'Trial',
      value: String(tenants.filter((t) => t.status === 'trial').length),
      icon: Timer,
      tone: 'warning',
    },
    {
      id: 'suspended',
      label: 'Suspended',
      value: String(tenants.filter((t) => t.status === 'suspended').length),
      icon: PauseCircle,
      tone: 'muted',
    },
  ]

  const closeCreate = () => {
    setCreateOpen(false)
    setName('')
    setOwnerName('')
    setOwnerEmail('')
    setOwnerPassword('')
    setFormError(undefined)
    setIsSubmitting(false)
    resetTouched()
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    markAllTouched(['name', 'ownerName', 'ownerEmail', 'ownerPassword'])
    setFormError(undefined)
    if (
      errors.name ||
      errors.ownerName ||
      errors.ownerEmail ||
      errors.ownerPassword
    ) {
      return
    }

    setIsSubmitting(true)
    try {
      const created = createTenant({ name })
      const login = await provisionAgencyUser({
        tenantId: created.id,
        name: ownerName,
        email: ownerEmail,
        password: ownerPassword,
      })
      createTenantMember({
        id: login.id,
        tenantId: created.id,
        name: ownerName,
        email: ownerEmail,
        password: ownerPassword,
        role: 'owner',
        status: 'active',
      })
      const shown: CreatedCredentials = {
        agencyName: created.name,
        ownerName: ownerName.trim(),
        email: ownerEmail.trim().toLowerCase(),
        password: ownerPassword,
        tenantId: created.id,
      }
      closeCreate()
      setCreatedCredentials(shown)
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not add this agency.',
      )
      setIsSubmitting(false)
    }
  }

  const hasFilters = search.trim() !== '' || statusFilter !== 'all'

  const handleStatusChange = (tenant: Tenant, nextRaw: string) => {
    if (
      nextRaw !== 'active' &&
      nextRaw !== 'trial' &&
      nextRaw !== 'suspended'
    ) {
      return
    }
    if (nextRaw === tenant.status) return
    setTenantStatus(tenant.id, nextRaw)
  }

  return (
    <div
      className={cn(
        elevatedPageClass,
        'pd-page pd-page--elevated pd-admin pd-clients',
      )}
      data-elevated-canvas
      aria-label="Agencies"
    >
      <PageHeader
        title="Agencies"
        actions={
          <Button className="h-9 rounded-lg" onClick={() => setCreateOpen(true)}>
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            Add Agency
          </Button>
        }
      />

      <StatCards label="Agency counts" cards={cards} />

      <div className={adminClientsToolbarClass}>
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <SearchInput
            className={cn('pl-8', whiteControlClass)}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Agencies…"
            aria-label="Search Agencies"
          />
        </div>
        <FormSelect
          label="Status"
          value={statusFilter}
          options={STATUS_FILTERS}
          onChange={(event) => setStatusFilter(event.target.value)}
        />
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-lg"
            onClick={() => {
              setSearch('')
              setStatusFilter('all')
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {tenants.length === 0 ? (
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <Building2 size={20} aria-hidden />
            <EmptyTitle>No Agencies Yet</EmptyTitle>
          </EmptyHeader>
          <Button className="h-9 rounded-lg" onClick={() => setCreateOpen(true)}>
            <Plus size={16} aria-hidden />
            Add Agency
          </Button>
        </Empty>
      ) : filtered.length === 0 ? (
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <Building2 size={20} aria-hidden />
            <EmptyTitle>No Matching Agencies</EmptyTitle>
          </EmptyHeader>
          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => {
              setSearch('')
              setStatusFilter('all')
            }}
          >
            Clear Filters
          </Button>
        </Empty>
      ) : (
        <div className={tableShellClass}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className={chromeHeadClass}>Agency</TableHead>
                <TableHead className={chromeHeadClass}>Slug</TableHead>
                <TableHead className={chromeHeadClass}>Status</TableHead>
                <TableHead className={chromeHeadClass}>Users</TableHead>
                <TableHead className={chromeHeadClass} aria-label="Open" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tenant) => {
                const userCount = members.filter(
                  (member) => member.tenantId === tenant.id,
                ).length
                const href = adminAgencyPath(tenant.id)
                return (
                  <TableRow
                    key={tenant.id}
                    className={adminRowClass}
                    onClick={() => navigate(href)}
                  >
                    <TableCell>
                      <span className={adminUserClass}>
                        <Avatar size="sm">
                          <AvatarImage
                            src={readAgencyProfile(tenant.id).profilePicture ?? undefined}
                            alt=""
                          />
                          <AvatarFallback>{initials(tenant.name)}</AvatarFallback>
                        </Avatar>
                        <Link
                          className={adminBusinessNameClass}
                          to={href}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {tenant.name}
                        </Link>
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{tenant.slug}</TableCell>
                    <TableCell
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <Select
                        value={tenant.status}
                        onValueChange={(next) => handleStatusChange(tenant, next)}
                      >
                        <SelectTrigger
                          aria-label={`Status for ${tenant.name}`}
                          className={statusTriggerClass}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TENANT_STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{userCount}</TableCell>
                    <TableCell>
                      <ChevronRight
                        size={16}
                        strokeWidth={2}
                        aria-hidden
                        className={adminRowChevronClass}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet
        open={createOpen}
        onOpenChange={(next) => {
          if (!next) closeCreate()
        }}
      >
        <SheetContent className={floatingSheetClass}>
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">Add Agency</SheetTitle>
          </SheetHeader>
          <form
            id="pd-admin-create-agency"
            className="flex flex-col gap-4 p-5"
            onSubmit={handleCreate}
            noValidate
          >
            <Input
              label="Agency Name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={blur('name')}
              error={showError('name') ? errors.name : undefined}
              placeholder="e.g. ABC Travel Agency"
            />
            <Input
              label="Owner Name"
              required
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              onBlur={blur('ownerName')}
              error={showError('ownerName') ? errors.ownerName : undefined}
            />
            <Input
              label="Owner Email"
              required
              type="email"
              autoComplete="off"
              value={ownerEmail}
              onChange={(event) => setOwnerEmail(event.target.value)}
              onBlur={blur('ownerEmail')}
              error={showError('ownerEmail') ? errors.ownerEmail : undefined}
            />
            <Input
              label="Initial Password"
              required
              type="password"
              autoComplete="new-password"
              value={ownerPassword}
              onChange={(event) => setOwnerPassword(event.target.value)}
              onBlur={blur('ownerPassword')}
              error={
                showError('ownerPassword') ? errors.ownerPassword : undefined
              }
            />
            {formError ? (
              <p className="m-0 text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </form>
          <SheetFooter className="border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-9 rounded-lg"
              onClick={closeCreate}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="pd-admin-create-agency"
              className="h-9 rounded-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating…' : 'Add Agency'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog
        open={createdCredentials != null}
        onOpenChange={(next) => {
          if (!next) {
            const tenantId = createdCredentials?.tenantId
            setCreatedCredentials(null)
            if (tenantId) navigate(adminAgencyPath(tenantId, 'product'))
          }
        }}
      >
        <DialogContent className="border border-border bg-card shadow-[var(--shadow-deep)] ring-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Copy The Owner Password. It Will Not Be Shown Again.
            </DialogTitle>
          </DialogHeader>
          {createdCredentials ? (
            <>
              <p className={adminCredentialNameClass}>
                {createdCredentials.agencyName} · {createdCredentials.ownerName}
              </p>
              <p className={adminCredentialRowClass}>
                Email:{' '}
                <CopyableText value={createdCredentials.email} label="email" />
              </p>
              <p className={adminCredentialRowClass}>
                Password:{' '}
                <CopyableText
                  value={createdCredentials.password}
                  label="password"
                />
              </p>
            </>
          ) : null}
          <DialogFooter className="border-0 bg-transparent">
            <Button
              className="h-9 rounded-lg"
              onClick={() => {
                const tenantId = createdCredentials?.tenantId
                setCreatedCredentials(null)
                if (tenantId) navigate(adminAgencyPath(tenantId, 'product'))
                else navigate(ADMIN_AGENCIES)
              }}
            >
              Turn On Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
