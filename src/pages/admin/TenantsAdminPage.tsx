import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Plus } from 'lucide-react'
import { agencyWithOwnerCreateErrors } from '@/lib/agencyUserRules'
import { provisionAgencyUser } from '@/lib/authApi'
import { createTenantMember, useTenantMembers } from '@/lib/tenantMembersStore'
import { createTenant, useTenants } from '@/lib/tenantsStore'
import { useAuth } from '@/lib/auth'
import { useTouchedFields } from '@/lib/useTouchedFields'
import type { TenantStatus } from '@/types/tenant'
import '@/styles/layout-admin.css'
import {
  Avatar,
  Badge,
  Button,
  CopyableText,
  Input,
  Modal,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type BadgeVariant,
} from '@/components/ui'

function statusBadgeVariant(status: TenantStatus): BadgeVariant {
  if (status === 'active') return 'completed'
  if (status === 'trial') return 'pending'
  return 'danger'
}

type CreateField =
  | 'name'
  | 'ownerName'
  | 'ownerEmail'
  | 'ownerPassword'

type CreatedCredentials = {
  agencyName: string
  ownerName: string
  email: string
  password: string
  tenantId: string
}

export default function TenantsAdminPage() {
  const { user } = useAuth()
  const tenants = useTenants()
  const members = useTenantMembers()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
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

  if (user?.role !== 'platform_admin') {
    return null
  }

  const values = { name, ownerName, ownerEmail, ownerPassword }
  const errors = agencyWithOwnerCreateErrors(values)

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

  return (
    <div className="pd-page pd-admin" aria-label="Businesses">
      <PageHeader
        title="Businesses"
        description="Agencies onboarded to OneTrack. Open a business to see its people."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            Add agency
          </Button>
        }
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Users</TableHead>
            <TableHead aria-label="Open" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => {
            const userCount = members.filter(
              (member) => member.tenantId === tenant.id,
            ).length
            return (
              <TableRow
                key={tenant.id}
                className="pd-admin__row"
                onClick={() => navigate(`/admin/tenants/${tenant.id}/users`)}
              >
                <TableCell>
                  <span className="pd-admin__user">
                    <Avatar name={tenant.name} size="sm" kind="business" />
                    <Link
                      className="pd-admin__business-name"
                      to={`/admin/tenants/${tenant.id}/users`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {tenant.name}
                    </Link>
                  </span>
                </TableCell>
                <TableCell className="pd-table__code">{tenant.slug}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(tenant.status)}>
                    {tenant.status}
                  </Badge>
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

      <Modal
        open={createOpen}
        onClose={closeCreate}
        title="Add agency"
        description="Create the agency and its first owner login. Service lines can be enabled later."
        actions={
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
        <form id="pd-admin-create-agency" onSubmit={handleCreate} noValidate>
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
      </Modal>

      <Modal
        open={createdCredentials != null}
        onClose={() => {
          const tenantId = createdCredentials?.tenantId
          setCreatedCredentials(null)
          if (tenantId) navigate(`/admin/tenants/${tenantId}/users`)
        }}
        title="Agency created"
        description="Share the owner login now. The password will not be shown again."
        actions={
          <Button
            onClick={() => {
              const tenantId = createdCredentials?.tenantId
              setCreatedCredentials(null)
              if (tenantId) navigate(`/admin/tenants/${tenantId}/users`)
            }}
          >
            Open users
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
