import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Handshake, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { setAgencyUserStatus } from '@/lib/authApi'
import { adminAgencyPath, setSupportReturnPath } from '@/lib/adminPaths'
import {
  setSubAgentLoginStatus,
  useAllSubAgentLogins,
} from '@/lib/subAgentLoginsStore'
import {
  updateTenantMember,
  useTenantMembers,
} from '@/lib/tenantMembersStore'
import { useTenants } from '@/lib/tenantsStore'
import { findSubAgentById } from '@/lib/subAgentsStore'
import { cx } from '@/lib/cx'
import {
  Avatar,
  Button,
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

  if (user?.role !== 'platform_admin') return null

  const setTab = (next: TabId) => {
    setSearchParams(next === 'agency' ? {} : { tab: next }, { replace: true })
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
    const rowId = `${login.tenantId}:${login.subAgentId}`
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
                      disabled={busyId != null}
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
                          member.status !== 'active' || busyId != null
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
              <TableHead>Sub agent</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Agency</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogins.map((login) => {
              const sub = findSubAgentById(login.subAgentId)
              return (
                <TableRow key={`${login.tenantId}:${login.subAgentId}`}>
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
                      disabled={busyId != null}
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
    </div>
  )
}
