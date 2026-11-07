import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Eye, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminAgencyPath, setSupportReturnPath } from '@/lib/adminPaths'
import { useAuth } from '@/lib/useAuth'
import {
  STAFF_MEMBER_ROLES,
  staffMemberCreateErrors,
} from '@/lib/agencyUserRules'
import {
  createUserInvite,
  deleteAgencyUser,
  provisionAgencyUser,
  setAgencyUserPassword,
  setAgencyUserStatus,
  syncAgencyMembers,
  updateAgencyUserProfile,
} from '@/lib/authApi'
import {
  validateRequiredEmail,
  validateRequiredName,
} from '@/lib/fieldValidation'
import { absolutePublicUrl } from '@/lib/publicUrl'
import {
  createTenantMember,
  removeTenantMembers,
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
import { CopyableText } from '@/components/CopyableText'
import { Input, Select as FormSelect } from '@/components/clients/clientShadcnFields'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/shadcn/avatar'
import { Button } from '@/components/shadcn/button'
import { Checkbox } from '@/components/shadcn/checkbox'
import { ConfirmDialog } from '@/components/shadcn/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/shadcn/empty'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import {
  adminBulkActionsClass,
  adminBulkBarClass,
  adminBulkCountClass,
  adminCredentialNameClass,
  adminCredentialRowClass,
  adminRowActionsClass,
  adminSelectCellClass,
  adminSelectColClass,
  adminUserClass,
  adminUserNameClass,
  chromeHeadClass,
  tableShellClass,
} from '@/components/admin/adminChrome'
import { floatingSheetClass } from '@/components/clients/shadcnChrome'

type EditableStatus = 'active' | 'disabled'

const STATUS_OPTIONS_BASE: Array<{ value: string; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
]

const statusTriggerClass = 'h-8 w-[7.5rem] rounded-lg'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}


function statusOptions(current: string): Array<{ value: string; label: string }> {
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
  const [editMember, setEditMember] = useState<TenantMember | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editError, setEditError] = useState<string | undefined>()
  const [isEditing, setIsEditing] = useState(false)
  const [actionError, setActionError] = useState<string | undefined>()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { markAllTouched, showError, blur, resetTouched } =
    useTouchedFields<CreateField>()

  const memberIds = useMemo(() => members.map((member) => member.id), [members])

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => memberIds.includes(id)))
      return next.size === prev.size ? prev : next
    })
  }, [memberIds])

  useEffect(() => {
    if (!tenantId) return
    let cancelled = false
    void syncAgencyMembers(tenantId).catch((error) => {
      if (cancelled) return
      console.warn('[tenant-users] sync failed', error)
    })
    return () => {
      cancelled = true
    }
  }, [tenantId])

  // Layout owns the missing-agency redirect so roster sync cannot bounce us.
  if (!tenant) return null

  const selectedCount = selectedIds.size
  const allSelected =
    memberIds.length > 0 && memberIds.every((id) => selectedIds.has(id))
  const someSelected =
    memberIds.some((id) => selectedIds.has(id)) && !allSelected

  const toggleId = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(memberIds) : new Set())
  }

  const handleConfirmDelete = async () => {
    if (selectedCount === 0) return
    setActionError(undefined)
    setIsDeleting(true)
    try {
      const targets = members.filter((member) => selectedIds.has(member.id))
      const results = await Promise.allSettled(
        targets.map((member) =>
          deleteAgencyUser({ userId: member.id, email: member.email }),
        ),
      )
      const failed = results.find((result) => result.status === 'rejected')
      if (failed && failed.status === 'rejected') {
        throw failed.reason instanceof Error
          ? failed.reason
          : new Error('Could not delete one or more users.')
      }
      removeTenantMembers(targets.map((member) => member.id))
      setSelectedIds(new Set())
      setConfirmDelete(false)
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Could not delete selected users.',
      )
      setConfirmDelete(false)
    } finally {
      setIsDeleting(false)
    }
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

  const openEdit = (member: TenantMember) => {
    setEditMember(member)
    setEditName(member.name)
    setEditEmail(member.email)
    setEditError(undefined)
  }

  const closeEdit = () => {
    if (isEditing) return
    setEditMember(null)
    setEditName('')
    setEditEmail('')
    setEditError(undefined)
  }

  const handleEditProfile = async (event: FormEvent) => {
    event.preventDefault()
    if (!editMember) return
    const nameError = validateRequiredName(editName, 'Full name')
    const emailError = validateRequiredEmail(editEmail)
    if (nameError || emailError) {
      setEditError(nameError ?? emailError)
      return
    }
    const nextName = editName.trim()
    const nextEmail = editEmail.trim().toLowerCase()
    const nameChanged = nextName !== editMember.name
    const emailChanged = nextEmail !== editMember.email.toLowerCase()
    if (!nameChanged && !emailChanged) {
      closeEdit()
      return
    }
    setEditError(undefined)
    setIsEditing(true)
    try {
      await updateAgencyUserProfile({
        userId: editMember.id,
        email: editMember.email,
        ...(nameChanged ? { name: nextName } : {}),
        ...(emailChanged ? { nextEmail } : {}),
      })
      updateTenantMember(editMember.id, {
        ...(nameChanged ? { name: nextName } : {}),
        ...(emailChanged ? { email: nextEmail } : {}),
      })
      setEditMember(null)
      setEditName('')
      setEditEmail('')
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : 'Could not update user.',
      )
    } finally {
      setIsEditing(false)
    }
  }

  const addButton = (
    <Button className="h-9 rounded-lg" onClick={() => setCreateOpen(true)}>
      <Plus size={16} strokeWidth={2.25} aria-hidden />
      Add User
    </Button>
  )

  const createModal = (
    <Sheet
      open={createOpen}
      onOpenChange={(next) => {
        if (!next) closeCreate()
      }}
    >
      <SheetContent className={floatingSheetClass}>
        <SheetHeader className="border-b border-border px-5 py-4 pr-12">
          <SheetTitle className="text-base font-semibold">Add User</SheetTitle>
        </SheetHeader>
        <form
          id="pd-admin-create-user"
          className="flex flex-col gap-4 p-5"
          onSubmit={(event) => void handleCreate(event)}
          noValidate
        >
          <FormSelect
            label="How To Add"
            value={inviteOnly ? 'invite' : 'password'}
            onChange={(event) => setInviteOnly(event.target.value === 'invite')}
            options={[
              { value: 'invite', label: 'Invite Link (Recommended)' },
              { value: 'password', label: 'Set Password Now' },
            ]}
          />
          <Input
            label="Full Name"
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
          <FormSelect
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
              label="Initial Password"
              required
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={blur('password')}
              error={showError('password') ? errors.password : undefined}
            />
          )}
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
            form="pd-admin-create-user"
            className="h-9 rounded-lg"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? inviteOnly
                ? 'Sending…'
                : 'Creating…'
              : inviteOnly
                ? 'Create Invite'
                : 'Add User'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )

  const credentialsModal = (
    <Dialog
      open={createdCredentials != null}
      onOpenChange={(next) => {
        if (!next) setCreatedCredentials(null)
      }}
    >
      <DialogContent className="border border-border bg-card shadow-[var(--shadow-deep)] ring-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {createdCredentials?.inviteLink
              ? 'Copy The Invite Link. It Expires In 7 Days.'
              : 'Copy This Password. It Will Not Be Shown Again.'}
          </DialogTitle>
        </DialogHeader>
        {createdCredentials ? (
          <>
            <p className={adminCredentialNameClass}>{createdCredentials.name}</p>
            <p className={adminCredentialRowClass}>
              Email:{' '}
              <CopyableText value={createdCredentials.email} label="email" />
            </p>
            {createdCredentials.inviteLink ? (
              <p className={adminCredentialRowClass}>
                Invite Link:{' '}
                <CopyableText
                  value={createdCredentials.inviteLink}
                  label="invite link"
                />
              </p>
            ) : createdCredentials.password ? (
              <p className={adminCredentialRowClass}>
                Password:{' '}
                <CopyableText
                  value={createdCredentials.password}
                  label="password"
                />
              </p>
            ) : null}
          </>
        ) : null}
        <DialogFooter className="border-0 bg-transparent">
          <Button
            className="h-9 rounded-lg"
            onClick={() => setCreatedCredentials(null)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const resetModal = (
    <Sheet
      open={resetMember != null}
      onOpenChange={(next) => {
        if (!next) {
          setResetMember(null)
          setResetPassword('')
          setActionError(undefined)
        }
      }}
    >
      <SheetContent className={floatingSheetClass}>
        <SheetHeader className="border-b border-border px-5 py-4 pr-12">
          <SheetTitle className="text-base font-semibold">
            {resetMember ? `New Password For ${resetMember.name}` : 'Reset Password'}
          </SheetTitle>
        </SheetHeader>
        <form
          id="pd-admin-reset-password"
          className="flex flex-col gap-4 p-5"
          onSubmit={(event) => void handleResetPassword(event)}
          noValidate
        >
          <Input
            label="New Password"
            required
            type="password"
            autoComplete="new-password"
            value={resetPassword}
            onChange={(event) => setResetPassword(event.target.value)}
          />
          {actionError ? (
            <p className="m-0 text-sm text-destructive" role="alert">
              {actionError}
            </p>
          ) : null}
        </form>
        <SheetFooter className="border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => {
              setResetMember(null)
              setResetPassword('')
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="pd-admin-reset-password"
            className="h-9 rounded-lg"
          >
            Save Password
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )

  const editModal = (
    <Sheet
      open={editMember != null}
      onOpenChange={(next) => {
        if (!next) closeEdit()
      }}
    >
      <SheetContent className={floatingSheetClass}>
        <SheetHeader className="border-b border-border px-5 py-4 pr-12">
          <SheetTitle className="text-base font-semibold">
            {editMember ? editMember.name : 'Edit User'}
          </SheetTitle>
        </SheetHeader>
        <form
          id="pd-admin-edit-user"
          className="flex flex-col gap-4 p-5"
          onSubmit={(event) => void handleEditProfile(event)}
          noValidate
        >
          <Input
            label="Full Name"
            required
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
          />
          <Input
            label="Email"
            required
            type="email"
            autoComplete="off"
            value={editEmail}
            onChange={(event) => setEditEmail(event.target.value)}
          />
          {editError ? (
            <p className="m-0 text-sm text-destructive" role="alert">
              {editError}
            </p>
          ) : null}
        </form>
        <SheetFooter className="border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={closeEdit}
            disabled={isEditing}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="pd-admin-edit-user"
            className="h-9 rounded-lg"
            disabled={isEditing}
          >
            {isEditing ? 'Saving…' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
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
          <Empty className="bg-card shadow-sm">
            <EmptyHeader>
              <Users size={20} aria-hidden />
              <EmptyTitle>No Users Yet</EmptyTitle>
            </EmptyHeader>
            {addButton}
          </Empty>
        </section>
        {createModal}
        {credentialsModal}
        {resetModal}
        {editModal}
      </div>
    )
  }

  return (
    <div className="pd-client-detail__overview" aria-label="People">
      <section className="pd-client-detail__section pd-client-detail__section--compact">
      {sectionHead}
      {selectedCount > 0 ? (
        <div
          className={adminBulkBarClass}
          role="region"
          aria-label="Bulk actions"
        >
          <span className={adminBulkCountClass}>
            {selectedCount} selected
          </span>
          <div className={adminBulkActionsClass}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedIds(new Set())}
              disabled={isDeleting}
            >
              Clear
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isDeleting || busyId != null}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} strokeWidth={2.25} aria-hidden />
              Delete
            </Button>
          </div>
        </div>
      ) : null}
      {actionError && !resetMember ? (
        <p className="m-0 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}
      <div className={tableShellClass}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-0">
              <TableHead className={cn(chromeHeadClass, adminSelectColClass)}>
                <Checkbox
                  aria-label="Select all users"
                  checked={allSelected}
                  aria-checked={someSelected ? 'mixed' : allSelected}
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                />
              </TableHead>
              <TableHead className={chromeHeadClass}>Name</TableHead>
              <TableHead className={chromeHeadClass}>Email</TableHead>
              <TableHead className={chromeHeadClass}>Role</TableHead>
              <TableHead className={chromeHeadClass}>Status</TableHead>
              <TableHead className={chromeHeadClass} aria-label="Actions" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className={adminSelectCellClass}>
                  <Checkbox
                    aria-label={`Select ${member.name}`}
                    checked={selectedIds.has(member.id)}
                    onCheckedChange={(checked) =>
                      toggleId(member.id, checked === true)
                    }
                  />
                </TableCell>
                <TableCell>
                  <span className={adminUserClass}>
                    <Avatar size="sm">
                      <AvatarFallback>{initials(member.name)}</AvatarFallback>
                    </Avatar>
                    <span className={adminUserNameClass}>{member.name}</span>
                  </span>
                </TableCell>
                <TableCell>
                  <CopyableText value={member.email} />
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {roleLabel(member.role)}
                </TableCell>
                <TableCell>
                  <Select
                    value={member.status}
                    disabled={busyId != null || isDeleting}
                    onValueChange={(next) =>
                      void handleMemberStatusChange(member, next)
                    }
                  >
                    <SelectTrigger
                      aria-label={`Status for ${member.name}`}
                      className={statusTriggerClass}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions(member.status).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <span className={adminRowActionsClass}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-lg"
                      disabled={busyId != null || isDeleting || isEditing}
                      onClick={() => openEdit(member)}
                    >
                      <Pencil size={14} strokeWidth={2.25} aria-hidden />
                      Edit
                    </Button>
                    {member.status === 'active' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-lg"
                        disabled={busyId != null || isDeleting}
                        onClick={() => void handleViewAs(member)}
                      >
                        <Eye size={14} strokeWidth={2.25} aria-hidden />
                        {busyId === member.id ? 'Opening…' : 'View As'}
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-lg"
                      disabled={busyId != null || isDeleting}
                      onClick={() => {
                        setResetMember(member)
                        setResetPassword('')
                        setActionError(undefined)
                      }}
                    >
                      Reset Password
                    </Button>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      </section>
      {createModal}
      {credentialsModal}
      {resetModal}
      {editModal}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => (isDeleting ? undefined : setConfirmDelete(false))}
        onConfirm={() => void handleConfirmDelete()}
        title={`Permanently delete ${selectedCount} user${selectedCount === 1 ? '' : 's'} from ${tenant.name}?`}
        confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
        confirmVariant="danger"
      />
    </div>
  )
}
