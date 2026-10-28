import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Handshake, Trash2, Users } from 'lucide-react'
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
import { cx } from '@/lib/cx'
import {
  Avatar,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  SearchField,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type SelectOption,
} from '@/components/ui'
import type { TenantMember, TenantMemberStatus } from '@/types/tenant'
import type { SubAgentLoginLink } from '@/types/subAgentAccess'
import '@/styles/layout-admin.css'
import '@/styles/layout-clients.css'

type TabId = 'agency' | 'sub_agent'
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
      <div className="pd-admin__bulk-bar" role="region" aria-label="Bulk actions">
        <span className="pd-admin__bulk-count">
          {selectedCount} selected
        </span>
        <div className="pd-admin__bulk-actions">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSelectedIds(new Set())}
            disabled={isDeleting}
          >
            Clear
          </Button>
          <Button
            size="sm"
            variant="danger"
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
    <div className="pd-page pd-admin pd-clients" aria-label="People">
      <PageHeader
        title="People"
        description="Every agency user and sub-agent login across the platform."
      />

      <div className="pd-admin__tabs" role="tablist" aria-label="People tabs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'agency'}
          className={cx('pd-admin__tab', tab === 'agency' && 'is-active')}
          onClick={() => setTab('agency')}
        >
          Agency users
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'sub_agent'}
          className={cx('pd-admin__tab', tab === 'sub_agent' && 'is-active')}
          onClick={() => setTab('sub_agent')}
        >
          Sub agents
        </button>
      </div>

      <div className="pd-clients__toolbar">
        <SearchField
          className="pd-clients__search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch('')}
          placeholder={
            tab === 'agency' ? 'Search users…' : 'Search sub-agent logins…'
          }
        />
        <Select
          label="Agency"
          value={tenantFilter}
          options={tenantOptions}
          onChange={(event) => setTenantFilter(event.target.value)}
        />
      </div>

      {bulkBar}

      {error ? (
        <p className="pd-field__error" role="alert">
          {error}
        </p>
      ) : null}

      {tab === 'agency' ? (
        filteredMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description="Try another search or clear the agency filter."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pd-admin__select-col">
                  <Checkbox
                    hideLabel
                    label="Select all visible users"
                    checked={allVisibleSelected}
                    aria-checked={
                      someVisibleSelected ? 'mixed' : allVisibleSelected
                    }
                    onChange={(event) =>
                      toggleAllVisible(event.target.checked)
                    }
                  />
                </TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Agency</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="pd-admin__select-cell">
                    <Checkbox
                      hideLabel
                      label={`Select ${member.name}`}
                      checked={selectedIds.has(member.id)}
                      onChange={(event) =>
                        toggleId(member.id, event.target.checked)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <span className="pd-admin__user">
                      <Avatar name={member.name} size="sm" />
                      <span>
                        <span className="pd-admin__user-name">
                          {member.name}
                        </span>
                        <br />
                        <span className="pd-admin__quiet">{member.email}</span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link
                      className="pd-admin__business-name"
                      to={adminAgencyPath(member.tenantId, 'people')}
                    >
                      {tenantName(member.tenantId)}
                    </Link>
                  </TableCell>
                  <TableCell className="pd-table__code">{member.role}</TableCell>
                  <TableCell>
                    <Select
                      size="sm"
                      aria-label={`Status for ${member.name}`}
                      className={statusToneClass(member.status)}
                      value={member.status}
                      options={statusOptions(member.status)}
                      disabled={busyId != null || isDeleting}
                      onChange={(event) =>
                        void handleMemberStatusChange(
                          member,
                          event.target.value,
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="pd-admin__row-actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={
                          member.status !== 'active' ||
                          busyId != null ||
                          isDeleting
                        }
                        onClick={() => void handleViewAsMember(member)}
                      >
                        {busyId === member.id ? 'Opening…' : 'View as'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : filteredLogins.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="No sub-agent logins"
          description="Sub-agent logins appear when agencies enable portal access."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pd-admin__select-col">
                <Checkbox
                  hideLabel
                  label="Select all visible sub-agent logins"
                  checked={allVisibleSelected}
                  aria-checked={
                    someVisibleSelected ? 'mixed' : allVisibleSelected
                  }
                  onChange={(event) => toggleAllVisible(event.target.checked)}
                />
              </TableHead>
              <TableHead>Sub agent</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Agency</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogins.map((login) => {
              const sub = findSubAgentById(login.subAgentId)
              const rowId = loginRowId(login)
              return (
                <TableRow key={rowId}>
                  <TableCell className="pd-admin__select-cell">
                    <Checkbox
                      hideLabel
                      label={`Select ${sub?.name ?? login.email}`}
                      checked={selectedIds.has(rowId)}
                      onChange={(event) =>
                        toggleId(rowId, event.target.checked)
                      }
                    />
                  </TableCell>
                  <TableCell>{sub?.name ?? login.subAgentId}</TableCell>
                  <TableCell>{login.email}</TableCell>
                  <TableCell>
                    <Link
                      className="pd-admin__business-name"
                      to={adminAgencyPath(login.tenantId, 'people')}
                    >
                      {tenantName(login.tenantId)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Select
                      size="sm"
                      aria-label={`Status for ${sub?.name ?? login.email}`}
                      className={statusToneClass(login.status)}
                      value={login.status}
                      options={statusOptions(login.status)}
                      disabled={busyId != null || isDeleting}
                      onChange={(event) =>
                        void handleLoginStatusChange(
                          login,
                          event.target.value,
                        )
                      }
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => (isDeleting ? undefined : setConfirmDelete(false))}
        onConfirm={() => void handleConfirmDelete()}
        title={
          tab === 'agency' ? 'Delete selected users?' : 'Delete selected logins?'
        }
        description={
          tab === 'agency'
            ? `Permanently remove ${selectedCount} agency user${selectedCount === 1 ? '' : 's'} and their logins. This cannot be undone.`
            : `Permanently remove ${selectedCount} sub-agent login${selectedCount === 1 ? '' : 's'}. This cannot be undone.`
        }
        confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
        confirmVariant="danger"
      />
    </div>
  )
}
