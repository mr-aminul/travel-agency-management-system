import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Building2, ChevronRight, PauseCircle, Plus, Timer } from 'lucide-react'
import { agencyWithOwnerCreateErrors } from '@/lib/agencyUserRules'
import { ADMIN_AGENCIES, adminAgencyPath } from '@/lib/adminPaths'
import { provisionAgencyUser } from '@/lib/authApi'
import { createTenantMember, useTenantMembers } from '@/lib/tenantMembersStore'
import { createTenant, setTenantStatus, useTenants } from '@/lib/tenantsStore'
import { useAuth } from '@/lib/auth'
import { useTouchedFields } from '@/lib/useTouchedFields'
import type { Tenant, TenantStatus } from '@/types/tenant'
import { StatCards, type StatCardItem } from '@/components/StatCards'
import '@/styles/layout-admin.css'
import '@/styles/layout-clients.css'
import {
  Avatar,
  Button,
  CopyableText,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  SearchField,
  Select,
  SideDrawer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type SelectOption,
} from '@/components/ui'

const TENANT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'suspended', label: 'Suspended' },
]

function tenantStatusToneClass(status: TenantStatus): string {
  if (status === 'active') return 'pd-select--tone-completed'
  if (status === 'trial') return 'pd-select--tone-pending'
  return 'pd-select--tone-danger'
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
    <div className="pd-page pd-admin pd-clients" aria-label="Agencies">
      <PageHeader
        title="Agencies"
        description="Customer businesses on OneTrack. Open one to manage people, product, or enter Support Mode."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            Add agency
          </Button>
        }
      />

      <StatCards label="Agency counts" cards={cards} />

      <div className="pd-clients__toolbar">
        <SearchField
          className="pd-clients__search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch('')}
          placeholder="Search agencies…"
        />
        <Select
          label="Status"
          value={statusFilter}
          options={STATUS_FILTERS}
          onChange={(event) => setStatusFilter(event.target.value)}
        />
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
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
        <EmptyState
          icon={Building2}
          title="No agencies yet"
          description="Add the first agency and its owner login to get started."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} aria-hidden />
              Add agency
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No matching agencies"
          description="Try a different search or clear filters."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agency</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Users</TableHead>
              <TableHead aria-label="Open" />
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
                  className="pd-admin__row"
                  onClick={() => navigate(href)}
                >
                  <TableCell>
                    <span className="pd-admin__user">
                      <Avatar name={tenant.name} size="sm" kind="business" />
                      <Link
                        className="pd-admin__business-name"
                        to={href}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {tenant.name}
                      </Link>
                    </span>
                  </TableCell>
                  <TableCell className="pd-table__code">{tenant.slug}</TableCell>
                  <TableCell
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <Select
                      size="sm"
                      aria-label={`Status for ${tenant.name}`}
                      className={tenantStatusToneClass(tenant.status)}
                      value={tenant.status}
                      options={TENANT_STATUS_OPTIONS}
                      onChange={(event) =>
                        handleStatusChange(tenant, event.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>{userCount}</TableCell>
                  <TableCell>
                    <ChevronRight
                      size={16}
                      strokeWidth={2}
                      aria-hidden
                      className="pd-admin__row-chevron"
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <SideDrawer
        open={createOpen}
        onClose={closeCreate}
        title="Add agency"
        description="Create the agency and its first owner login. Product starts fully off — you turn on what they need next."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeCreate}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="pd-admin-create-agency"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating…' : 'Add agency'}
            </Button>
          </>
        }
      >
        <form
          id="pd-admin-create-agency"
          className="pd-admin__form-stack"
          onSubmit={handleCreate}
          noValidate
        >
          <Input
            label="Agency name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={blur('name')}
            error={showError('name') ? errors.name : undefined}
            placeholder="e.g. Coastal Leisure"
          />
          <Input
            label="Owner name"
            required
            value={ownerName}
            onChange={(event) => setOwnerName(event.target.value)}
            onBlur={blur('ownerName')}
            error={showError('ownerName') ? errors.ownerName : undefined}
          />
          <Input
            label="Owner email"
            required
            type="email"
            autoComplete="off"
            value={ownerEmail}
            onChange={(event) => setOwnerEmail(event.target.value)}
            onBlur={blur('ownerEmail')}
            error={showError('ownerEmail') ? errors.ownerEmail : undefined}
          />
          <Input
            label="Initial password"
            required
            type="password"
            autoComplete="new-password"
            value={ownerPassword}
            onChange={(event) => setOwnerPassword(event.target.value)}
            onBlur={blur('ownerPassword')}
            error={
              showError('ownerPassword') ? errors.ownerPassword : undefined
            }
            hint="Owner signs in with this password. Share it securely — it is only shown once."
          />
          {formError ? (
            <p className="pd-field__error" role="alert">
              {formError}
            </p>
          ) : null}
        </form>
      </SideDrawer>

      <Modal
        open={createdCredentials != null}
        onClose={() => {
          const tenantId = createdCredentials?.tenantId
          setCreatedCredentials(null)
          if (tenantId) navigate(adminAgencyPath(tenantId, 'product'))
        }}
        title="Agency created"
        description="Share the owner login now. The password will not be shown again."
        actions={
          <Button
            onClick={() => {
              const tenantId = createdCredentials?.tenantId
              setCreatedCredentials(null)
              if (tenantId) navigate(adminAgencyPath(tenantId, 'product'))
              else navigate(ADMIN_AGENCIES)
            }}
          >
            Turn on product
          </Button>
        }
      >
        {createdCredentials ? (
          <>
            <p className="pd-admin__credential-name">
              {createdCredentials.agencyName} · {createdCredentials.ownerName}
            </p>
            <p className="pd-admin__credential-row">
              Email:{' '}
              <CopyableText value={createdCredentials.email} label="email" />
            </p>
            <p className="pd-admin__credential-row">
              Password:{' '}
              <CopyableText
                value={createdCredentials.password}
                label="password"
              />
            </p>
          </>
        ) : null}
      </Modal>
    </div>
  )
}
