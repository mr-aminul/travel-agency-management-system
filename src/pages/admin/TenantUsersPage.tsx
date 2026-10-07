import { useState, type FormEvent } from 'react'
import { Plus, Users } from 'lucide-react'
import { Navigate, useParams } from 'react-router-dom'
import {
  STAFF_MEMBER_ROLES,
  staffMemberCreateErrors,
} from '@/lib/agencyUserRules'
import { provisionAgencyUser } from '@/lib/authApi'
import {
  createTenantMember,
  useTenantMembersByTenantId,
} from '@/lib/tenantMembersStore'
import { useTenantById } from '@/lib/tenantsStore'
import { useTouchedFields } from '@/lib/useTouchedFields'
import type {
  TenantMemberRole,
  TenantMemberStatus,
} from '@/types/tenant'
import {
  Avatar,
  Badge,
  Button,
  CopyableText,
  EmptyState,
  Input,
  Modal,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type BadgeVariant,
} from '@/components/ui'

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

type CreateField = 'name' | 'email' | 'role' | 'password'

type CreatedCredentials = {
  name: string
  email: string
  password: string
}

export default function TenantUsersPage() {
  const { tenantId = '' } = useParams()
  const tenant = useTenantById(tenantId)
  const members = useTenantMembersByTenantId(tenantId)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TenantMemberRole>('staff')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdCredentials, setCreatedCredentials] =
    useState<CreatedCredentials | null>(null)
  const { markAllTouched, showError, blur, resetTouched } =
    useTouchedFields<CreateField>()

  if (!tenant) {
    return <Navigate to="/admin/tenants" replace />
  }

  const values = { tenantId: tenant.id, name, email, role, password }
  const errors = staffMemberCreateErrors(values)

  const closeCreate = () => {
    setCreateOpen(false)
    setName('')
    setEmail('')
    setRole('staff')
    setPassword('')
    setFormError(undefined)
    setIsSubmitting(false)
    resetTouched()
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    markAllTouched(['name', 'email', 'role', 'password'])
    setFormError(undefined)
    if (errors.name || errors.email || errors.role || errors.password) return

    setIsSubmitting(true)
    try {
      await provisionAgencyUser({
        tenantId: tenant.id,
        name,
        email,
        password,
      })
      createTenantMember({
        tenantId: tenant.id,
        name,
        email,
        role,
        password,
        status: 'active',
      })
      const shown: CreatedCredentials = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      }
      closeCreate()
      setCreatedCredentials(shown)
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not add this user.',
      )
      setIsSubmitting(false)
    }
  }

  const addButton = (
    <Button onClick={() => setCreateOpen(true)}>
      <Plus size={16} strokeWidth={2.25} aria-hidden />
      Add user
    </Button>
  )

  const createModal = (
    <Modal
      open={createOpen}
      onClose={closeCreate}
      title="Add user"
      description={`Create a login for ${tenant.name}. Set an initial password and share it with them.`}
      actions={
        <>
          <Button variant="secondary" onClick={closeCreate} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="pd-admin-create-user"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating…' : 'Add user'}
          </Button>
        </>
      }
    >
      <form id="pd-admin-create-user" onSubmit={handleCreate} noValidate>
        <Input
          label="Full name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={blur('name')}
          error={showError('name') ? errors.name : undefined}
        />
        <Input
          label="Email"
          required
          type="email"
          autoComplete="off"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={blur('email')}
          error={showError('email') ? errors.email : undefined}
        />
        <Select
          label="Role"
          required
          value={role}
          onChange={(event) => setRole(event.target.value as TenantMemberRole)}
          onBlur={blur('role')}
          options={STAFF_MEMBER_ROLES}
          error={showError('role') ? errors.role : undefined}
        />
        <Input
          label="Initial password"
          required
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onBlur={blur('password')}
          error={showError('password') ? errors.password : undefined}
          hint="They sign in with this password. Share it securely — it is only shown once."
        />
        {formError ? (
          <p className="pd-field__error" role="alert">
            {formError}
          </p>
        ) : null}
      </form>
    </Modal>
  )

  const credentialsModal = (
    <Modal
      open={createdCredentials != null}
      onClose={() => setCreatedCredentials(null)}
      title="Login created"
      description="Share these credentials now. The password will not be shown again."
      actions={
        <Button onClick={() => setCreatedCredentials(null)}>Done</Button>
      }
    >
      {createdCredentials ? (
        <>
          <p className="pd-admin__credential-name">{createdCredentials.name}</p>
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
  )

  if (members.length === 0) {
    return (
      <>
        <EmptyState
          icon={Users}
          title="No users yet"
          description={`Add the first login for ${tenant.name}.`}
          action={addButton}
        />
        {createModal}
        {credentialsModal}
      </>
    )
  }

  return (
    <>
      <div className="pd-admin__section-actions">{addButton}</div>
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
      {createModal}
      {credentialsModal}
    </>
  )
}
