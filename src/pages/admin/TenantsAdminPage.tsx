import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useTenantMembers } from '@/lib/tenantMembersStore'
import { useTenants } from '@/lib/tenantsStore'
import { useAuth } from '@/lib/auth'
import type { TenantStatus } from '@/types/tenant'
import '@/styles/layout-admin.css'
import { Avatar, Badge, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, type BadgeVariant } from '@/components/ui'

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

  if (user?.role !== 'platform_admin') {
    return null
  }

  return (
    <div className="pd-page pd-admin" aria-label="Businesses">
      <PageHeader
        title="Businesses"
        description="Agencies onboarded to OneTrack. Open a business to see its people."
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
    </div>
  )
}
