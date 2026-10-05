import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Handshake, Plus, UserMinus, Users, UserCheck } from 'lucide-react'
import { NewPartnerForm } from '@/components/partners/NewPartnerForm'
import { StatCards } from '@/components/StatCards'
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  SearchField,
  SideDrawer,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type BadgeVariant,
} from '@/components/ui'
import { createPartner, usePartners } from '@/lib/partnersStore'
import { normalizePhone } from '@/lib/clientsStore'
import { useClients } from '@/lib/clientsStore'
import { useCases } from '@/lib/casesStore'
import { derivePartnerActivityStatus } from '@/lib/clientServiceStatus'
import type { Partner, PartnerDraft, PartnerStatus } from '@/types/partner'
import type { Case } from '@/types/case'
import '@/styles/layout-clients.css'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
]

function statusBadgeVariant(status: PartnerStatus): BadgeVariant {
  return status === 'Active' ? 'completed' : 'on-hold'
}

type PartnerStatId = 'all' | 'Active' | 'referred' | 'idle'

function matchesFilters(
  partner: Partner,
  search: string,
  branchFilters: string[],
  statusFilters: string[],
  activityStatus: PartnerStatus,
): boolean {
  const q = search.trim().toLowerCase()
  const phoneDigits = normalizePhone(partner.phone)
  const queryDigits = normalizePhone(q)
  const matchSearch =
    !q ||
    partner.name.toLowerCase().includes(q) ||
    partner.phone.toLowerCase().includes(q) ||
    partner.email?.toLowerCase().includes(q) ||
    partner.licenseNumber?.toLowerCase().includes(q) ||
    partner.branch?.toLowerCase().includes(q) ||
    partner.id.toLowerCase().includes(q) ||
    (queryDigits.length > 0 && phoneDigits.includes(queryDigits))
  const matchBranch =
    branchFilters.length === 0 ||
    (partner.branch ? branchFilters.includes(partner.branch) : false)
  const matchStatus =
    statusFilters.length === 0 || statusFilters.includes(activityStatus)
  return matchSearch && matchBranch && matchStatus
}

export default function PartnersPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const partners = usePartners()
  const clients = useClients()
  const cases = useCases()
  const [search, setSearch] = useState('')
  const [branchFilters, setBranchFilters] = useState<string[]>([])
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [newPartnerOpen, setNewPartnerOpen] = useState(false)
  const [clientFilter, setClientFilter] = useState<'all' | 'referred' | 'idle'>(
    'all',
  )

  useEffect(() => {
    setNewPartnerOpen(searchParams.get('new') === '1')
  }, [searchParams])

  const branchOptions = useMemo(() => {
    const branches = [
      ...new Set(partners.map((partner) => partner.branch).filter(Boolean)),
    ] as string[]
    return branches.sort().map((branch) => ({ value: branch, label: branch }))
  }, [partners])

  const customerCountByPartner = useMemo(() => {
    const counts = new Map<string, number>()
    for (const client of clients) {
      if (!client.partnerId) continue
      counts.set(client.partnerId, (counts.get(client.partnerId) ?? 0) + 1)
    }
    return counts
  }, [clients])

  const casesByPartnerId = useMemo(() => {
    const clientPartnerId = new Map(
      clients
        .filter((client) => client.partnerId)
        .map((client) => [client.id, client.partnerId as string]),
    )
    const map = new Map<string, Case[]>()
    for (const item of cases) {
      const partnerId = clientPartnerId.get(item.clientId)
      if (!partnerId) continue
      const list = map.get(partnerId)
      if (list) list.push(item)
      else map.set(partnerId, [item])
    }
    return map
  }, [cases, clients])

  const activityStatusByPartner = useMemo(() => {
    const map = new Map<string, PartnerStatus>()
    for (const partner of partners) {
      map.set(
        partner.id,
        derivePartnerActivityStatus(casesByPartnerId.get(partner.id) ?? []),
      )
    }
    return map
  }, [partners, casesByPartnerId])

  const stats = useMemo(() => {
    let active = 0
    let referredClients = 0
    let idle = 0
    for (const partner of partners) {
      if (activityStatusByPartner.get(partner.id) === 'Active') active += 1
      const referred = customerCountByPartner.get(partner.id) ?? 0
      referredClients += referred
      if (referred === 0) idle += 1
    }
    return {
      total: partners.length,
      active,
      referredClients,
      idle,
    }
  }, [partners, customerCountByPartner, activityStatusByPartner])

  const filtered = partners.filter((partner) => {
    const referred = customerCountByPartner.get(partner.id) ?? 0
    if (clientFilter === 'referred' && referred === 0) return false
    if (clientFilter === 'idle' && referred > 0) return false
    return matchesFilters(
      partner,
      search,
      branchFilters,
      statusFilters,
      activityStatusByPartner.get(partner.id) ?? 'Inactive',
    )
  })
  const hasActiveFilters =
    branchFilters.length > 0 ||
    statusFilters.length > 0 ||
    clientFilter !== 'all'

  const selectedStat: PartnerStatId | undefined =
    clientFilter !== 'all'
      ? clientFilter
      : statusFilters.length === 1 && statusFilters[0] === 'Active'
        ? 'Active'
        : statusFilters.length === 0
          ? 'all'
          : undefined

  const selectStat = (id: string) => {
    const next = id as PartnerStatId
    if (next === selectedStat || next === 'all') {
      setStatusFilters([])
      setClientFilter('all')
      return
    }
    if (next === 'referred' || next === 'idle') {
      setStatusFilters([])
      setClientFilter(next)
      return
    }
    setClientFilter('all')
    setStatusFilters(['Active'])
  }

  const openNewPartnerModal = () => {
    setNewPartnerOpen(true)
    if (searchParams.get('new') !== '1') {
      setSearchParams({ new: '1' }, { replace: true })
    }
  }

  const closeNewPartnerModal = () => {
    setNewPartnerOpen(false)
    if (searchParams.get('new')) {
      setSearchParams({}, { replace: true })
    }
  }

  const handleCreatePartner = (draft: PartnerDraft) => {
    const created = createPartner(draft)
    closeNewPartnerModal()
    navigate(`/partners/${created.id}`)
  }

  return (
    <div className="pd-page pd-clients" aria-label="Sub Agents">
      <StatCards
        label="Sub agent stats"
        selectedId={selectedStat}
        onSelect={selectStat}
        cards={[
          {
            id: 'all',
            label: 'Total sub agents',
            value: String(stats.total),
            icon: Handshake,
            tone: 'brand',
          },
          {
            id: 'Active',
            label: 'Active',
            value: String(stats.active),
            icon: UserCheck,
            tone: 'success',
          },
          {
            id: 'referred',
            label: 'Referred clients',
            value: String(stats.referredClients),
            icon: Users,
            tone: 'info',
          },
          {
            id: 'idle',
            label: 'No clients yet',
            value: String(stats.idle),
            icon: UserMinus,
            tone: 'muted',
          },
        ]}
      />
      <div className="pd-clients__toolbar">
        <SearchField
          className="pd-clients__search"
          placeholder="Search sub agents…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch('')}
        />

        <div className="pd-clients__toolbar-end">
          <div className="pd-clients__filters">
            <Select
              className="pd-clients__filter"
              label="Branch"
              multiple
              searchable
              placeholder="All branches"
              searchPlaceholder="Search branches…"
              value={branchFilters}
              onChange={(event) => setBranchFilters(event.target.value)}
              options={branchOptions}
            />
            <Select
              className="pd-clients__filter"
              label="Status"
              multiple
              searchable
              placeholder="All statuses"
              searchPlaceholder="Search statuses…"
              value={statusFilters}
              onChange={(event) => setStatusFilters(event.target.value)}
              options={STATUS_FILTERS}
            />
            {hasActiveFilters ? (
              <button
                type="button"
                className="pd-clients__clear"
                onClick={() => {
                  setBranchFilters([])
                  setStatusFilters([])
                  setClientFilter('all')
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
          <Button onClick={openNewPartnerModal}>
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            New sub agent
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="No sub agents match"
          description="Try a different name, phone number, or clear filters."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('')
                setBranchFilters([])
                setStatusFilters([])
                setClientFilter('all')
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>License</TableHead>
              <TableHead>Customers</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((partner) => {
              const activityStatus =
                activityStatusByPartner.get(partner.id) ?? 'Inactive'
              return (
                <TableRow
                  key={partner.id}
                  className="pd-clients__row"
                  onClick={() => navigate(`/partners/${partner.id}`)}
                >
                  <TableCell>
                    <div className="pd-clients__identity">
                      <Avatar
                        name={partner.name}
                        src={partner.photoUrl}
                        size="sm"
                      />
                      <p className="pd-clients__name">{partner.name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="pd-table__code">{partner.id}</TableCell>
                  <TableCell>
                    {normalizePhone(partner.phone) || partner.phone}
                  </TableCell>
                  <TableCell>{partner.branch || '—'}</TableCell>
                  <TableCell>{partner.licenseNumber || '—'}</TableCell>
                  <TableCell>
                    {customerCountByPartner.get(partner.id) ?? 0}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(activityStatus)}>
                      {activityStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <SideDrawer
        open={newPartnerOpen}
        onClose={closeNewPartnerModal}
        title="New sub agent"
        description="Register the sub agent once — then attach the clients they send."
        className="pd-clients-drawer"
      >
        <NewPartnerForm
          onSubmit={handleCreatePartner}
          onCancel={closeNewPartnerModal}
        />
      </SideDrawer>
    </div>
  )
}
