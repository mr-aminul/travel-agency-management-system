import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Plus } from 'lucide-react'
import { useTenantMembers } from '@/lib/tenantMembersStore'
import { createTenant, useTenants } from '@/lib/tenantsStore'
import { useAuth } from '@/lib/auth'
import { agencyCreateErrors } from '@/lib/agencyUserRules'
import { useTouchedFields } from '@/lib/useTouchedFields'
import type { TenantStatus } from '@/types/tenant'
import '@/styles/layout-admin.css'
import {
  Avatar,
  Badge,
  Button,
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

export default function TenantsAdminPage() {
  const { user } = useAuth()
  const tenants = useTenants()
  const members = useTenantMembers()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const { markAllTouched, showError, blur, resetTouched } =
    useTouchedFields<'name'>()

  if (user?.role !== 'platform_admin') {
    return null
  }

  const errors = agencyCreateErrors({ name })

  const closeCreate = () => {
    setCreateOpen(false)
    setName('')
    resetTouched()
  }

  const handleCreate = (event: FormEvent) => {
    event.preventDefault()
    markAllTouched(['name'])
    if (errors.name) return
    const created = createTenant({ name })
    closeCreate()
    navigate(`/admin/tenants/${created.id}/users`)
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
                    <Avatar name={tenant.name} size="sm" />
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
        description="Only the agency name is required. Service lines can be enabled later."
        actions={
          <>
            <Button variant="secondary" onClick={closeCreate}>
              Cancel
            </Button>
            <Button type="submit" form="pd-admin-create-agency">
              Add agency
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
        </form>
      </Modal>
    </div>
  )
}
