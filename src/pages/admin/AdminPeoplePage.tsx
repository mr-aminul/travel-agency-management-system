import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Handshake, Search, Trash2, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { deleteAgencyUser, setAgencyUserStatus } from '@/lib/authApi'
import { adminAgencyPath, setSupportReturnPath } from '@/lib/adminPaths'
import {
  removeSubAgentLogins,
  setSubAgentLoginStatus,
  useAllSubAgentLogins,
} from '@/lib/subAgentLoginsStore'
import {
  removeTenantMembers,
  updateTenantMember,
  useTenantMembers,
} from '@/lib/tenantMembersStore'
import { useTenants } from '@/lib/tenantsStore'
import { findSubAgentById } from '@/lib/subAgentsStore'
import { Select as FormSelect } from '@/components/clients/clientShadcnFields'
import { Avatar, AvatarFallback } from '@/components/shadcn/avatar'
import { Button } from '@/components/shadcn/button'
import { Checkbox } from '@/components/shadcn/checkbox'
import { ConfirmDialog } from '@/components/shadcn/confirm-dialog'
import { PageHeader } from '@/components/shadcn/page-header'
import { SegmentedNav } from '@/components/shadcn/segmented-nav'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/shadcn/empty'
import { Input as SearchInput } from '@/components/shadcn/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import type { TenantMember, TenantMemberStatus } from '@/types/tenant'
import type { SubAgentLoginLink } from '@/types/subAgentAccess'
import {
  adminBulkActionsClass,
  adminBulkBarClass,
  adminBulkCountClass,
  adminBusinessNameClass,
  adminClientsToolbarClass,
  adminQuietClass,
  adminRowActionsClass,
  adminSelectCellClass,
  adminSelectColClass,
  adminUserClass,
  adminUserNameClass,
  chromeHeadClass,
  elevatedPageClass,
  tableShellClass,
  whiteControlClass,
} from '@/components/admin/adminChrome'
import { cn } from '@/lib/utils'
import '@/styles/layout-admin.css'
import '@/styles/layout-clients.css'

type TabId = 'agency' | 'sub_agent'
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

function loginRowId(login: SubAgentLoginLink): string {
  return `${login.tenantId}:${login.subAgentId}`
}

export default function AdminPeoplePage() {
  const { user, startViewAs } = useAuth()
  const tenants = useTenants()
  const members = useTenantMembers()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: TabId =
    searchParams.get('tab') === 'sub_agent' ? 'sub_agent' : 'agency'
  const [search, setSearch] = useState('')
  const [tenantFilter, setTenantFilter] = useState('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | undefined>()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const logins = useAllSubAgentLogins()

  const tenantOptions = useMemo(
    () => [
      { value: 'all', label: 'All agencies' },
      ...tenants.map((t) => ({ value: t.id, label: t.name })),
    ],
    [tenants],
  )

  const tenantName = (id: string) =>
    tenants.find((t) => t.id === id)?.name ?? id

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return members.filter((member) => {
      if (tenantFilter !== 'all' && member.tenantId !== tenantFilter) {
        return false
      }
      if (!q) return true
      return (
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q)
      )
    })
  }, [members, search, tenantFilter])

  const filteredLogins = useMemo(() => {
    const q = search.trim().toLowerCase()
    return logins.filter((login) => {
      if (tenantFilter !== 'all' && login.tenantId !== tenantFilter) {
        return false
      }
      if (!q) return true
      const sub = findSubAgentById(login.subAgentId)
      return (
        login.email.toLowerCase().includes(q) ||
        (sub?.name ?? '').toLowerCase().includes(q)
      )
    })
  }, [logins, search, tenantFilter])

  const visibleIds = useMemo(
    () =>
      tab === 'agency'
        ? filteredMembers.map((member) => member.id)
        : filteredLogins.map(loginRowId),
    [tab, filteredMembers, filteredLogins],
  )

  useEffect(() => {
    setSelectedIds(new Set())
    setConfirmDelete(false)
  }, [tab, search, tenantFilter])

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.includes(id)))
      return next.size === prev.size ? prev : next
    })
  }, [visibleIds])

  if (user?.role !== 'platform_admin') return null

  const selectedCount = selectedIds.size
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const someVisibleSelected =
    visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected

  const setTab = (next: TabId) => {
    setSearchParams(next === 'agency' ? {} : { tab: next }, { replace: true })
  }

  const toggleId = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of visibleIds) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const handleViewAsMember = async (member: TenantMember) => {
    if (member.status !== 'active') return
    setError(undefined)
    setBusyId(member.id)
    try {
      setSupportReturnPath('/admin/people')
      await startViewAs({
        userId: member.id,
        email: member.email,
        name: member.name,
        role: 'agency_user',
        tenantId: member.tenantId,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not start View as user.',
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
    setError(undefined)
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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not update user status.',
      )
    } finally {
      setBusyId(null)
    }
  }

  const handleLoginStatusChange = async (
    login: SubAgentLoginLink,
    nextRaw: string,
  ) => {
    const nextStatus = asEditableStatus(nextRaw)
    if (!nextStatus || nextStatus === login.status) return
    const rowId = loginRowId(login)
    setError(undefined)
    setBusyId(rowId)
    try {
      await setAgencyUserStatus({
        userId: login.userId,
        email: login.email,
        status: nextStatus,
      })
      setSubAgentLoginStatus(login.subAgentId, nextStatus, login.tenantId)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not update sub-agent status.',
      )
    } finally {
      setBusyId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (selectedCount === 0) return
    setError(undefined)
    setIsDeleting(true)
    try {
      if (tab === 'agency') {
        const targets = filteredMembers.filter((member) =>
          selectedIds.has(member.id),
        )
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
      } else {
        const targets = filteredLogins.filter((login) =>
          selectedIds.has(loginRowId(login)),
        )
        const results = await Promise.allSettled(
          targets.map((login) =>
            deleteAgencyUser({ userId: login.userId, email: login.email }),
          ),
        )
        const failed = results.find((result) => result.status === 'rejected')
        if (failed && failed.status === 'rejected') {
          throw failed.reason instanceof Error
            ? failed.reason
            : new Error('Could not delete one or more logins.')
        }
        removeSubAgentLogins(
          targets.map((login) => ({
            subAgentId: login.subAgentId,
            tenantId: login.tenantId,
          })),
        )
      }
      setSelectedIds(new Set())
      setConfirmDelete(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not delete selected people.',
      )
      setConfirmDelete(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const bulkBar =
    selectedCount > 0 ? (
      <div className={adminBulkBarClass} role="region" aria-label="Bulk actions">
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
    ) : null

  return (
    <div
      className={cn(
        elevatedPageClass,
        'pd-page pd-page--elevated pd-admin pd-clients',
      )}
      data-elevated-canvas
      aria-label="Users"
    >
      <PageHeader title="Users" />

      <SegmentedNav
        aria-label="User tabs"
        value={tab}
        onValueChange={(next) => setTab(next as 'agency' | 'sub_agent')}
        items={[
          { id: 'agency', label: 'Agency Users' },
          { id: 'sub_agent', label: 'Sub Agents' },
        ]}
      />

      <div className={adminClientsToolbarClass}>
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <SearchInput
            className={cn('pl-8', whiteControlClass)}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              tab === 'agency' ? 'Search Users…' : 'Search Sub-Agent Logins…'
            }
            aria-label={tab === 'agency' ? 'Search Users' : 'Search Sub-Agent Logins'}
          />
        </div>
        <FormSelect
          label="Agency"
          value={tenantFilter}
          options={tenantOptions}
          onChange={(event) => setTenantFilter(event.target.value)}
        />
      </div>

      {bulkBar}

      {error ? (
        <p className="m-0 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {tab === 'agency' ? (
        filteredMembers.length === 0 ? (
          <Empty className="bg-card shadow-sm">
            <EmptyHeader>
              <Users size={20} aria-hidden />
              <EmptyTitle>No Users Found</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className={tableShellClass}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-0">
                  <TableHead className={cn(chromeHeadClass, adminSelectColClass)}>
                    <Checkbox
                      aria-label="Select all visible users"
                      checked={allVisibleSelected}
                      aria-checked={
                        someVisibleSelected ? 'mixed' : allVisibleSelected
                      }
                      onCheckedChange={(checked) =>
                        toggleAllVisible(checked === true)
                      }
                    />
                  </TableHead>
                  <TableHead className={chromeHeadClass}>Person</TableHead>
                  <TableHead className={chromeHeadClass}>Agency</TableHead>
                  <TableHead className={chromeHeadClass}>Role</TableHead>
                  <TableHead className={chromeHeadClass}>Status</TableHead>
                  <TableHead className={chromeHeadClass} aria-label="Actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
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
                        <span>
                          <span className={adminUserNameClass}>
                            {member.name}
                          </span>
                          <br />
                          <span className={adminQuietClass}>{member.email}</span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link
                        className={adminBusinessNameClass}
                        to={adminAgencyPath(member.tenantId, 'people')}
                      >
                        {tenantName(member.tenantId)}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{member.role}</TableCell>
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
                      <div className={adminRowActionsClass}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-lg"
                          disabled={
                            member.status !== 'active' ||
                            busyId != null ||
                            isDeleting
                          }
                          onClick={() => void handleViewAsMember(member)}
                        >
                          {busyId === member.id ? 'Opening…' : 'View As'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : filteredLogins.length === 0 ? (
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <Handshake size={20} aria-hidden />
            <EmptyTitle>No Sub-Agent Logins</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className={tableShellClass}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className={cn(chromeHeadClass, adminSelectColClass)}>
                  <Checkbox
                    aria-label="Select all visible sub-agent logins"
                    checked={allVisibleSelected}
                    aria-checked={
                      someVisibleSelected ? 'mixed' : allVisibleSelected
                    }
                    onCheckedChange={(checked) =>
                      toggleAllVisible(checked === true)
                    }
                  />
                </TableHead>
                <TableHead className={chromeHeadClass}>Sub Agent</TableHead>
                <TableHead className={chromeHeadClass}>Email</TableHead>
                <TableHead className={chromeHeadClass}>Agency</TableHead>
                <TableHead className={chromeHeadClass}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogins.map((login) => {
                const sub = findSubAgentById(login.subAgentId)
                const rowId = loginRowId(login)
                return (
                  <TableRow key={rowId}>
                    <TableCell className={adminSelectCellClass}>
                      <Checkbox
                        aria-label={`Select ${sub?.name ?? login.email}`}
                        checked={selectedIds.has(rowId)}
                        onCheckedChange={(checked) =>
                          toggleId(rowId, checked === true)
                        }
                      />
                    </TableCell>
                    <TableCell>{sub?.name ?? login.subAgentId}</TableCell>
                    <TableCell>{login.email}</TableCell>
                    <TableCell>
                      <Link
                        className={adminBusinessNameClass}
                        to={adminAgencyPath(login.tenantId, 'people')}
                      >
                        {tenantName(login.tenantId)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={login.status}
                        disabled={busyId != null || isDeleting}
                        onValueChange={(next) =>
                          void handleLoginStatusChange(login, next)
                        }
                      >
                        <SelectTrigger
                          aria-label={`Status for ${sub?.name ?? login.email}`}
                          className={statusTriggerClass}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions(login.status).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => (isDeleting ? undefined : setConfirmDelete(false))}
        onConfirm={() => void handleConfirmDelete()}
        title={
          tab === 'agency'
            ? `Permanently delete ${selectedCount} user${selectedCount === 1 ? '' : 's'}? This cannot be undone.`
            : `Permanently delete ${selectedCount} sub-agent login${selectedCount === 1 ? '' : 's'}? This cannot be undone.`
        }
        confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
        confirmVariant="danger"
      />
    </div>
  )
}
