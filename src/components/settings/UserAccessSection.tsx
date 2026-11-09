import { useEffect, useState, type FormEvent } from 'react'
import {
  Ban,
  CheckCircle2,
  CircleOff,
  Eye,
  Pencil,
  Plus,
  Users,
} from 'lucide-react'
import {
  chromeHeadClass,
  floatingSheetClass,
  tableShellClass,
} from '@/components/clients/shadcnChrome'
import { Input, Select } from '@/components/clients/clientShadcnFields'
import { SettingsInfo } from '@/components/settings/SettingsInfo'
import { SubAgentAccessSection } from '@/components/settings/SubAgentAccessSection'
import { Avatar, AvatarFallback } from '@/components/shadcn/avatar'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/shadcn/empty'
import {
  Select as AccessSelect,
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
import { layoutConfig } from '@/config/layout'
import { buildAccessPageColumns } from '@/lib/accessPages'
import {
  STAFF_MEMBER_ROLES,
  staffMemberCreateErrors,
} from '@/lib/agencyUserRules'
import {
  getActiveTenantId,
  provisionAgencyUser,
  syncAgencyMembers,
} from '@/lib/authApi'
import {
  canManageAgencyUsers,
  resolveSettingsAccessManagementLevel,
} from '@/lib/pageAccess'
import {
  createTenantMember,
  findTenantMemberForUser,
  updateTenantMember,
  useTenantMembersByTenantId,
} from '@/lib/tenantMembersStore'
import { useAuth } from '@/lib/useAuth'
import { useTouchedFields } from '@/lib/useTouchedFields'
import {
  getPageAccessLevel,
  setPageAccessLevel,
  useUserPageAccess,
} from '@/lib/userAccessStore'
import type { TenantMemberRole, TenantMemberStatus } from '@/types/tenant'
import type { PageAccessLevel } from '@/types/userAccess'

const ACCESS_OPTIONS: {
  value: PageAccessLevel
  label: string
  icon: typeof Ban
}[] = [
  { value: 'none', label: 'None', icon: Ban },
  { value: 'view', label: 'View', icon: Eye },
  { value: 'edit', label: 'Edit', icon: Pencil },
]

const PAGE_COLUMNS = buildAccessPageColumns(layoutConfig.navItems)

function isPageAccessLevel(value: string): value is PageAccessLevel {
  return value === 'none' || value === 'view' || value === 'edit'
}

function isTenantMemberRole(value: string): value is TenantMemberRole {
  return value === 'owner' || value === 'manager' || value === 'staff'
}

const NON_OWNER_ROLE_OPTIONS = STAFF_MEMBER_ROLES.filter(
  (option) => option.value !== 'owner',
)

function statusMeta(status: TenantMemberStatus): {
  variant: 'default' | 'secondary' | 'outline'
  icon: typeof CheckCircle2
  label: string
} {
  if (status === 'active') {
    return { variant: 'default', icon: CheckCircle2, label: 'Active' }
  }
  if (status === 'invited') {
    return { variant: 'secondary', icon: CircleOff, label: 'Invited' }
  }
  return { variant: 'outline', icon: CircleOff, label: 'Disabled' }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
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
  const canManageRole = canManageAgencyUsers(
    user?.role ?? 'agency_user',
    self?.role,
  )
  const accessMgmtLevel = user
    ? resolveSettingsAccessManagementLevel({
        role: user.role,
        userId: user.id,
        email: user.email,
        tenantId,
      })
    : 'none'
  const canManage = canManageRole && accessMgmtLevel === 'edit'
  const isActingOwner =
    self?.role === 'owner' || user?.role === 'platform_admin'
  const activeOwnerCount = members.filter(
    (member) => member.role === 'owner' && member.status !== 'disabled',
  ).length

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TenantMemberRole>('staff')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { markAllTouched, showError, blur, resetTouched } =
    useTouchedFields<CreateField>()

  useEffect(() => {
    if (!tenantId || !canManage) return
    let cancelled = false
    void syncAgencyMembers(tenantId).catch((error) => {
      if (cancelled) return
      console.warn('[user-access] sync failed', error)
    })
    return () => {
      cancelled = true
    }
  }, [tenantId, canManage])

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
          <Button className="h-9 rounded-lg" onClick={() => setCreateOpen(true)}>
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            Add User
          </Button>
        </div>
      ) : null}
    </header>
  )

  const createSheet = (
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
          id="pd-settings-create-user"
          className="flex flex-col gap-4 p-5"
          onSubmit={(event) => void handleCreate(event)}
          noValidate
        >
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
          <Select
            label="Role"
            required
            value={role}
            onChange={(event) => setRole(event.target.value as TenantMemberRole)}
            options={NON_OWNER_ROLE_OPTIONS}
            error={showError('role') ? errors.role : undefined}
          />
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
            form="pd-settings-create-user"
            className="h-9 rounded-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating…' : 'Add User'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )

  if (members.length === 0) {
    return (
      <div className="pd-settings-section">
        {header}
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <Users size={20} aria-hidden />
            <EmptyTitle>No Users Yet</EmptyTitle>
          </EmptyHeader>
          {canManage ? (
            <Button className="h-9 rounded-lg" onClick={() => setCreateOpen(true)}>
              <Plus size={16} strokeWidth={2.25} aria-hidden />
              Add User
            </Button>
          ) : null}
        </Empty>
        <SubAgentAccessSection />
        {createSheet}
      </div>
    )
  }

  return (
    <div className="pd-settings-section">
      {header}
      <div className="pd-user-access">
        <div className={tableShellClass}>
        <Table aria-label={title}>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-0">
              <TableHead className={chromeHeadClass}>User</TableHead>
              <TableHead className={chromeHeadClass}>Status</TableHead>
              <TableHead className={chromeHeadClass}>Role</TableHead>
              {PAGE_COLUMNS.map((page) => (
                <TableHead
                  key={page.id}
                  title={page.path}
                  className={chromeHeadClass}
                >
                  {page.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const status = statusMeta(member.status)
              const StatusIcon = status.icon
              const isOwnerMember = member.role === 'owner'
              const canEditOwnerRow = isActingOwner
              const canEditRole =
                canManage && (!isOwnerMember || canEditOwnerRow)
              const canEditAccess =
                canManage && (!isOwnerMember || canEditOwnerRow)
              const roleOptions = canEditOwnerRow
                ? STAFF_MEMBER_ROLES
                : NON_OWNER_ROLE_OPTIONS
              const isLastActiveOwner =
                isOwnerMember && activeOwnerCount <= 1
              return (
                <TableRow key={member.id}>
                  <TableCell data-label="User">
                    <span className="pd-user-access__person">
                      <Avatar size="sm">
                        <AvatarFallback>{initials(member.name)}</AvatarFallback>
                      </Avatar>
                      <span className="pd-user-access__person-meta">
                        <span className="pd-user-access__name">
                          {member.name}
                        </span>
                        {member.email ? (
                          <span className="pd-user-access__role">
                            {member.email}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell data-label="Status">
                    <Badge variant={status.variant}>
                      <StatusIcon data-icon="inline-start" aria-hidden />
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="pd-user-access__cell"
                    data-label="Role"
                  >
                    <AccessSelect
                      value={member.role}
                      disabled={!canEditRole || isLastActiveOwner}
                      onValueChange={(next) => {
                        if (!canEditRole || isLastActiveOwner) return
                        if (!isTenantMemberRole(next)) return
                        if (!canEditOwnerRow && next === 'owner') return
                        if (next === member.role) return
                        updateTenantMember(member.id, { role: next })
                      }}
                    >
                      <SelectTrigger
                        aria-label={`Role for ${member.name}`}
                        className="pd-user-access__select h-8 w-[6.5rem] rounded-lg"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            disabled={
                              isLastActiveOwner && option.value !== 'owner'
                            }
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </AccessSelect>
                  </TableCell>
                  {PAGE_COLUMNS.map((page) => {
                    const level = getPageAccessLevel(
                      member.id,
                      page.path,
                      accessEntries,
                    )
                    const LevelIcon =
                      ACCESS_OPTIONS.find((option) => option.value === level)
                        ?.icon ?? Ban
                    return (
                      <TableCell
                        key={page.id}
                        className="pd-user-access__cell"
                        data-label={page.label}
                      >
                        <AccessSelect
                          value={level}
                          disabled={!canEditAccess || isOwnerMember}
                          onValueChange={(next) => {
                            if (!canEditAccess || isOwnerMember) return
                            if (!isPageAccessLevel(next)) return
                            setPageAccessLevel(member.id, page.path, next)
                          }}
                        >
                          <SelectTrigger
                            aria-label={`${page.label} access for ${member.name}`}
                            className={`pd-user-access__select is-${level} h-8 w-[6.5rem] rounded-lg`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACCESS_OPTIONS.map((option) => {
                              const Icon = option.icon
                              return (
                                <SelectItem key={option.value} value={option.value}>
                                  <span className="inline-flex items-center gap-1.5">
                                    <Icon size={14} aria-hidden />
                                    {option.label}
                                  </span>
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </AccessSelect>
                        <span className="sr-only">
                          <LevelIcon aria-hidden />
                        </span>
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>
      </div>
      <SubAgentAccessSection />
      {createSheet}
    </div>
  )
}
