import { useState, type FormEvent } from 'react'
import { Eye, Plus, Users } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ADMIN_AGENCIES, adminAgencyPath, setSupportReturnPath } from '@/lib/adminPaths'
import { useAuth } from '@/lib/useAuth'
import {
  STAFF_MEMBER_ROLES,
  staffMemberCreateErrors,
} from '@/lib/agencyUserRules'
import {
  createUserInvite,
  provisionAgencyUser,
  setAgencyUserPassword,
  setAgencyUserStatus,
} from '@/lib/authApi'
import { absolutePublicUrl } from '@/lib/publicUrl'
import {
  createTenantMember,
  updateTenantMember,
  useTenantMembersByTenantId,
} from '@/lib/tenantMembersStore'
import { useTenantById } from '@/lib/tenantsStore'
import { useTouchedFields } from '@/lib/useTouchedFields'
import type {
  TenantMember,
  TenantMemberRole,
  TenantMemberStatus,
} from '@/types/tenant'
import {
  Avatar,
  avatarKindForMemberRole,
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
  type SelectOption,
} from '@/components/ui'

type EditableStatus = 'active' | 'disabled'

const STATUS_OPTIONS_BASE: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
]

function statusToneClass(status: string): string {
  if (status === 'active') return 'pd-select--tone-completed'
  if (status === 'invited') return 'pd-select--tone-pending'
  return 'pd-select--tone-on-hold'
}

function statusOptions(current: string): SelectOption[] {
  if (current === 'invited') {
    return [{ value: 'invited', label: 'Invited' }, ...STATUS_OPTIONS_BASE]
  }
  return STATUS_OPTIONS_BASE
}

function asEditableStatus(value: string): EditableStatus | undefined {
  if (value === 'active' || value === 'disabled') return value
  return undefined
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
  password?: string
  inviteLink?: string
}

export default function TenantUsersPage() {
  const { tenantId = '' } = useParams()
  const navigate = useNavigate()
  const { startViewAs } = useAuth()
  const tenant = useTenantById(tenantId)
  const members = useTenantMembersByTenantId(tenantId)
  const [createOpen, setCreateOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TenantMemberRole>('staff')
  const [password, setPassword] = useState('')
  const [inviteOnly, setInviteOnly] = useState(true)
  const [formError, setFormError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdCredentials, setCreatedCredentials] =
    useState<CreatedCredentials | null>(null)
  const [resetMember, setResetMember] = useState<TenantMember | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [actionError, setActionError] = useState<string | undefined>()
  const { markAllTouched, showError, blur, resetTouched } =
    useTouchedFields<CreateField>()

  if (!tenant) {
    return <Navigate to={ADMIN_AGENCIES} replace />
  }

  const values = {
    tenantId: tenant.id,
    name,
    email,
    role,
    password: inviteOnly ? 'invite-placeholder-8' : password,
  }
  const errors = staffMemberCreateErrors(values)
  if (inviteOnly) {
    delete errors.password
  }

  const closeCreate = () => {
    setCreateOpen(false)
    setName('')
    setEmail('')
    setRole('staff')
    setPassword('')
    setInviteOnly(true)
    setFormError(undefined)
    setIsSubmitting(false)
    resetTouched()
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    markAllTouched(
      inviteOnly ? ['name', 'email', 'role'] : ['name', 'email', 'role', 'password'],
    )
    setFormError(undefined)
    if (errors.name || errors.email || errors.role || errors.password) return

    setIsSubmitting(true)
    try {
      if (inviteOnly) {
        const invite = await createUserInvite({
          tenantId: tenant.id,
          name,
          email,
          memberRole: role,
        })
        createTenantMember({
          tenantId: tenant.id,
          name,
          email,
          role,
          password: crypto.randomUUID().slice(0, 12),
          status: 'invited',
        })
        closeCreate()
        setCreatedCredentials({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          inviteLink: absolutePublicUrl(`invite/${invite.token}`),
        })
        return
      }

      const login = await provisionAgencyUser({
        tenantId: tenant.id,
        name,
        email,
        password,
        memberRole: role,
      })
      createTenantMember({
        id: login.id,
        tenantId: tenant.id,
        name,
        email,
        role,
        password,
        status: 'active',
      })
      closeCreate()
      setCreatedCredentials({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      })
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not add this user.',
      )
      setIsSubmitting(false)
    }
  }

  const handleViewAs = async (member: TenantMember) => {
    if (member.status !== 'active') return
    setActionError(undefined)
    setBusyId(member.id)
    try {
      setSupportReturnPath(adminAgencyPath(tenant.id, 'people'))
      await startViewAs({
        userId: member.id,
        email: member.email,
        name: member.name,
        role: 'agency_user',
        tenantId: tenant.id,
      })
      navigate('/', { replace: true })
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not start View as user.',
      )
    } finally {
      setBusyId(null)
    }
  }

  const handleMemberStatusChange = async (
    member: TenantMember,
    nextRaw: string,
  ) => {
    const nextStatus = asEditableStatus(nextRaw)
    if (!nextStatus || nextStatus === member.status) return
    setActionError(undefined)
    setBusyId(member.id)
    try {
      await setAgencyUserStatus({
        userId: member.id,
        email: member.email,
        status: nextStatus,
      })
      updateTenantMember(member.id, {
        status: nextStatus as TenantMemberStatus,
      })
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not update status.',
      )
    } finally {
      setBusyId(null)
    }
  }

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault()
    if (!resetMember) return
    if (!resetPassword || resetPassword.length < 4) {
      setActionError('Password must be at least 8 characters.')
      return
    }
    setActionError(undefined)
    try {
      await setAgencyUserPassword({
        userId: resetMember.id,
        email: resetMember.email,
        name: resetMember.name,
        tenantId: tenant.id,
        password: resetPassword,
      })
      setCreatedCredentials({
        name: resetMember.name,
        email: resetMember.email,
        password: resetPassword,
      })
      setResetMember(null)
      setResetPassword('')
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not reset password.',
      )
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
      description={
        inviteOnly
          ? `Invite someone to ${tenant.name}. They set their own password via the link.`
          : `Create a login for ${tenant.name}. Set an initial password and share it with them.`
      }
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
            {isSubmitting
              ? inviteOnly
                ? 'Sending…'
                : 'Creating…'
              : inviteOnly
                ? 'Create invite'
                : 'Add user'}
          </Button>
        </>
      }
    >
      <form id="pd-admin-create-user" onSubmit={handleCreate} noValidate>
        <Select
          label="How to add"
          value={inviteOnly ? 'invite' : 'password'}
          onChange={(event) => setInviteOnly(event.target.value === 'invite')}
          options={[
            { value: 'invite', label: 'Invite link (recommended)' },
            { value: 'password', label: 'Set password now' },
          ]}
        />
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
        {inviteOnly ? null : (
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
        )}
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
      title={createdCredentials?.inviteLink ? 'Invite ready' : 'Login ready'}
      description={
        createdCredentials?.inviteLink
          ? 'Copy the invite link and send it to them. It expires in 7 days.'
          : 'Share these credentials now. The password will not be shown again.'
      }
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
          {createdCredentials.inviteLink ? (
            <p className="pd-admin__credential-row">
              Invite link:{' '}
              <CopyableText
                value={createdCredentials.inviteLink}
                label="invite link"
              />
            </p>
          ) : createdCredentials.password ? (
            <p className="pd-admin__credential-row">
              Password:{' '}
              <CopyableText
                value={createdCredentials.password}
                label="password"
              />
            </p>
          ) : null}
        </>
      ) : null}
    </Modal>
  )

  const resetModal = (
    <Modal
      open={resetMember != null}
      onClose={() => {
        setResetMember(null)
        setResetPassword('')
        setActionError(undefined)
      }}
      title="Reset password"
      description={
        resetMember
          ? `Set a new password for ${resetMember.name}.`
          : undefined
      }
      actions={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              setResetMember(null)
              setResetPassword('')
            }}
          >
            Cancel
          </Button>
          <Button type="submit" form="pd-admin-reset-password">
            Save password
          </Button>
        </>
      }
    >
      <form id="pd-admin-reset-password" onSubmit={handleResetPassword} noValidate>
        <Input
          label="New password"
          required
          type="password"
          autoComplete="new-password"
          value={resetPassword}
          onChange={(event) => setResetPassword(event.target.value)}
        />
        {actionError ? (
          <p className="pd-field__error" role="alert">
            {actionError}
          </p>
        ) : null}
      </form>
    </Modal>
  )

  const sectionHead = (
    <div className="pd-client-detail__section-head">
      <h2 className="pd-client-detail__section-title">
        <span className="pd-client-detail__section-icon" aria-hidden>
          <Users size={15} strokeWidth={2.25} />
        </span>
        People
      </h2>
      {addButton}
    </div>
  )

  if (members.length === 0) {
    return (
      <div className="pd-client-detail__overview" aria-label="People">
        <section className="pd-client-detail__section pd-client-detail__section--compact">
          {sectionHead}
          <EmptyState
            icon={Users}
            title="No users yet"
            description={`Add the first login for ${tenant.name}.`}
            action={addButton}
          />
        </section>
        {createModal}
        {credentialsModal}
        {resetModal}
      </div>
    )
  }

  return (
    <div className="pd-client-detail__overview" aria-label="People">
      <section className="pd-client-detail__section pd-client-detail__section--compact">
      {sectionHead}
      {actionError && !resetMember ? (
        <p className="pd-field__error" role="alert">
          {actionError}
        </p>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead aria-label="Actions" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <span className="pd-admin__user">
                  <Avatar
                    name={member.name}
                    size="sm"
                    kind={avatarKindForMemberRole(member.role)}
                  />
                  <span className="pd-admin__user-name">{member.name}</span>
                </span>
              </TableCell>
              <TableCell>
                <CopyableText value={member.email} />
              </TableCell>
              <TableCell>{roleLabel(member.role)}</TableCell>
              <TableCell>
                <Select
                  size="sm"
                  aria-label={`Status for ${member.name}`}
                  className={statusToneClass(member.status)}
                  value={member.status}
                  options={statusOptions(member.status)}
                  disabled={busyId != null}
                  onChange={(event) =>
                    void handleMemberStatusChange(member, event.target.value)
                  }
                />
              </TableCell>
              <TableCell>
                <span className="pd-admin__row-actions">
                  {member.status === 'active' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busyId != null}
                      onClick={() => void handleViewAs(member)}
                    >
                      <Eye size={14} strokeWidth={2.25} aria-hidden />
                      {busyId === member.id ? 'Opening…' : 'View as'}
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busyId != null}
                    onClick={() => {
                      setResetMember(member)
                      setResetPassword('')
                      setActionError(undefined)
                    }}
                  >
                    Reset password
                  </Button>
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </section>
      {createModal}
      {credentialsModal}
      {resetModal}
    </div>
  )
}
