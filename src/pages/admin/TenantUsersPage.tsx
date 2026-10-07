import { Users } from 'lucide-react'
import { Navigate, useParams } from 'react-router-dom'
import { useTenantMembersByTenantId } from '@/lib/tenantMembersStore'
import { useTenantById } from '@/lib/tenantsStore'
import type { TenantMemberRole, TenantMemberStatus } from '@/types/tenant'
import { Avatar, Badge, CopyableText, EmptyState, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, type BadgeVariant } from '@/components/ui'

function statusBadgeVariant(status: TenantMemberStatus): BadgeVariant {
  if (status === 'active') return 'completed'
  if (status === 'invited') return 'pending'
  return 'on-hold'
}

function roleLabel(role: TenantMemberRole): string {
  if (role === 'owner') return 'Owner'
  if (role === 'manager') return 'Manager'
  return 'Staff'
}

export default function TenantUsersPage() {
  const { tenantId = '' } = useParams()
  const tenant = useTenantById(tenantId)
  const members = useTenantMembersByTenantId(tenantId)

  if (!tenant) {
    return <Navigate to="/admin/tenants" replace />
  }

  if (members.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No users yet"
        description={`Nobody has been invited to ${tenant.name}.`}
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <span className="pd-admin__user">
                <Avatar name={member.name} size="sm" />
                <span className="pd-admin__user-name">{member.name}</span>
              </span>
            </TableCell>
            <TableCell>
              <CopyableText value={member.email} />
            </TableCell>
            <TableCell>{roleLabel(member.role)}</TableCell>
            <TableCell>
              <Badge variant={statusBadgeVariant(member.status)}>
                {member.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
