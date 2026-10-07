import { useState, type FormEvent } from 'react'
import {
  Ban,
  CheckCircle2,
  CircleOff,
  Eye,
  Pencil,
  Plus,
  Users,
} from 'lucide-react'
import { SettingsInfo } from '@/components/settings/SettingsInfo'
import { layoutConfig } from '@/config/layout'
import { buildAccessPageColumns } from '@/lib/accessPages'
import {
  STAFF_MEMBER_ROLES,
  staffMemberCreateErrors,
} from '@/lib/agencyUserRules'
import { getActiveTenantId, provisionAgencyUser } from '@/lib/authApi'
import { canManageAgencyUsers } from '@/lib/pageAccess'
import {
  createTenantMember,
  findTenantMemberForUser,
  useTenantMembersByTenantId,
} from '@/lib/tenantMembersStore'
import { useAuth } from '@/lib/useAuth'
import { useTouchedFields } from '@/lib/useTouchedFields'
import {
  Avatar,
  Badge,
  Button,
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
import {
  getPageAccessLevel,
  setPageAccessLevel,
  useUserPageAccess,
} from '@/lib/userAccessStore'
import type { TenantMemberRole, TenantMemberStatus } from '@/types/tenant'
import type { PageAccessLevel } from '@/types/userAccess'

const ACCESS_OPTIONS: SelectOption[] = [
  { value: 'none', label: 'None', icon: Ban },
  { value: 'view', label: 'View', icon: Eye },
  { value: 'edit', label: 'Edit', icon: Pencil },
]

const PAGE_COLUMNS = buildAccessPageColumns(layoutConfig.navItems)

function isPageAccessLevel(value: string): value is PageAccessLevel {
  return value === 'none' || value === 'view' || value === 'edit'
}

function roleLabel(role: TenantMemberRole): string {
  if (role === 'owner') return 'Owner'
  if (role === 'manager') return 'Manager'
  return 'Staff'
}

function statusBadge(status: TenantMemberStatus): {
  variant: 'completed' | 'pending' | 'on-hold'
  icon: typeof CheckCircle2
  label: string
} {
  if (status === 'active') {
    return { variant: 'completed', icon: CheckCircle2, label: 'Active' }
  }
  if (status === 'invited') {
    return { variant: 'pending', icon: CircleOff, label: 'Invited' }
  }
  return { variant: 'on-hold', icon: CircleOff, label: 'Disabled' }
}

type CreateField = 'name' | 'email' | 'role' | 'password'

export function UserAccessSection({
  title,
  info,
}: {
  title: string
  info: string
}) {
  const { user } = useAuth()
  const tenantId = getActiveTenantId()
  const members = useTenantMembersByTenantId(tenantId)
  const accessEntries = useUserPageAccess()
  const self = user
    ? findTenantMemberForUser(tenantId, user.id, user.email)
    : undefined
  const canManage = canManageAgencyUsers(user?.role ?? 'agency_user', self?.role)

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TenantMemberRole>('staff')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { markAllTouched, showError, blur, resetTouched } =
    useTouchedFields<CreateField>()

  const values = { tenantId, name, email, role, password }
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
    if (!canManage) return
    markAllTouched(['name', 'email', 'role', 'password'])
    setFormError(undefined)
    if (errors.name || errors.email || errors.role || errors.password) return
    setIsSubmitting(true)
    try {
      const login = await provisionAgencyUser({
        tenantId,
        name,
        email,
        password,
      })
      createTenantMember({
        id: login.id,
        tenantId,
        name,
        email,
        role,
        password,
        status: 'active',
      })
      closeCreate()
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not add this user.',
      )
      setIsSubmitting(false)
    }
  }

  const header = (
    <header className="pd-settings-panel__header pd-settings-panel__header--flush">
      <h2 id="settings-panel-title" className="pd-settings-panel__title">
        {title}
      </h2>
      <SettingsInfo title={title} body={info} />
      {canManage ? (
        <div className="pd-settings-panel__actions">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            Add user
          </Button>
        </div>
      ) : null}
    </header>
  )

  const createModal = (
    <Modal
      open={createOpen}
      onClose={closeCreate}
      title="Add user"
      description="Create a login for your agency. Share the password securely."
      actions={
        <>
          <Button variant="secondary" onClick={closeCreate} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="pd-settings-create-user" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Add user'}
          </Button>
        </>
      }
    >
      <form id="pd-settings-create-user" onSubmit={handleCreate} noValidate>
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
          options={STAFF_MEMBER_ROLES.filter((option) => option.value !== 'owner')}
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
        />
        {formError ? (
          <p className="pd-field__error" role="alert">
            {formError}
          </p>
        ) : null}
      </form>
    </Modal>
  )

  if (members.length === 0) {
    return (
      <div className="pd-settings-section">
        {header}
        <EmptyState
          icon={Users}
          title="No users yet"
          description={
            canManage
              ? 'Add your first staff login to manage page access.'
              : 'Ask an owner or manager to add users for this agency.'
          }
          action={
            canManage ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus size={16} strokeWidth={2.25} aria-hidden />
                Add user
              </Button>
            ) : undefined
          }
        />
        {createModal}
      </div>
    )
  }

  return (
    <div className="pd-settings-section">
      {header}
      <div className="pd-user-access">
        <Table aria-label={title}>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              {PAGE_COLUMNS.map((page) => (
                <TableHead key={page.id} title={page.path}>
                  {page.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const status = statusBadge(member.status)
              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <span className="pd-user-access__person">
                      <Avatar name={member.name} size="sm" />
                      <span className="pd-user-access__person-meta">
                        <span className="pd-user-access__name">
                          {member.name}
                        </span>
                        <span className="pd-user-access__role">
                          {roleLabel(member.role)}
                          {member.email ? ` · ${member.email}` : ''}
                        </span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant} icon={status.icon}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  {PAGE_COLUMNS.map((page) => {
                    const level = getPageAccessLevel(
                      member.id,
                      page.path,
                      accessEntries,
                    )
                    return (
                      <TableCell key={page.id} className="pd-user-access__cell">
                        <Select
                          size="sm"
                          aria-label={`${page.label} access for ${member.name}`}
                          className={`pd-user-access__select is-${level}`}
                          value={level}
                          options={ACCESS_OPTIONS}
                          disabled={!canManage || member.role === 'owner'}
                          onChange={(event) => {
                            if (!canManage) return
                            const next = event.target.value
                            if (!isPageAccessLevel(next)) return
                            setPageAccessLevel(member.id, page.path, next)
                          }}
                        />
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {createModal}
    </div>
  )
}
