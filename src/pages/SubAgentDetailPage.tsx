import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/shadcn/accordion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card'
import { Checkbox } from '@/components/shadcn/checkbox'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shadcn/popover'
import {
  Sheet,
  SheetContent,
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
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shadcn/tooltip'
import { Input } from '@/components/clients/clientShadcnFields'
import { Input as SearchInput } from '@/components/shadcn/input'
import {
  chromeHeadClass,
  elevatedPageClass,
  floatingSheetClass,
  floatingSheetWideClass,
  whiteControlClass,
} from '@/components/clients/shadcnChrome'
import { cn } from '@/lib/utils'
import {
  Calendar,
  Check,
  CircleDot,
  Contact,
  Copy,
  FileText,
  IdCard,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  ListFilter,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Table2,
  Users,
  Wallet,
} from 'lucide-react'
import { SubAgentClientReportPanel } from '@/components/subAgents/SubAgentClientReportPanel'
import { SubAgentLoginSection } from '@/components/subAgents/SubAgentLoginSection'
import { notifyIfPendingApproval } from '@/lib/notifyPendingApproval'
import type { LucideIcon } from 'lucide-react'
import { ProfilePhotoField } from '@/components/ProfilePhotoField'
import { AddClientSplitButton } from '@/components/clients/AddClientSplitButton'
import { NewClientForm } from '@/components/clients/NewClientForm'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { updateSubAgent, useSubAgents } from '@/lib/subAgentsStore'
import {
  validateOptionalEmail,
  validateOptionalText,
  validateRequiredName,
  validateRequiredPhone,
} from '@/lib/fieldValidation'
import { formatDisplayDate } from '@/lib/formatDate'
import { useTouchedFields } from '@/lib/useTouchedFields'
import { useCases } from '@/lib/casesStore'
import { deriveClientBalance } from '@/lib/clientDerived'
import {
  clientMatchesServiceStatusFilters,
  deriveClientServiceStatus,
  deriveSubAgentActivityStatus,
  groupCasesByClientId,
} from '@/lib/clientServiceStatus'
import {
  createClient,
  formatBalance,
  getEnabledServiceTypeOptions,
  normalizePhone,
  useClients,
} from '@/lib/clientsStore'
import {
  settleEntries,
  useCommissionSettlements,
  usePendingCommissions,
} from '@/lib/commissionsStore'
import { formatPaymentAmount, usePayments } from '@/lib/paymentsStore'
import type { Case, CaseStatus } from '@/types/case'
import type { SubAgent, SubAgentStatus } from '@/types/subAgent'
import type { Client, CreateClientInput } from '@/types/client'

const SUB_AGENT_TABS = ['overview', 'profile', 'clients', 'report', 'login'] as const

const CLIENT_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'In-Progress', label: 'In Progress' },
  { value: 'On-Hold', label: 'On Hold' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
]

type SubAgentClientsListView = 'table' | 'grid'

const SUB_AGENT_CLIENTS_LIST_VIEW_KEY = 'subAgent-clients-list-view'

type ProfileDraft = {
  name: string
  phone: string
  email: string
  address: string
  licenseNumber: string
  photoUrl: string | undefined
}

function tabFromSearch(searchParams: URLSearchParams): string {
  const tab = searchParams.get('tab')
  return tab && SUB_AGENT_TABS.includes(tab as (typeof SUB_AGENT_TABS)[number])
    ? tab
    : 'overview'
}

function readSubAgentClientsListView(): SubAgentClientsListView {
  try {
    return localStorage.getItem(SUB_AGENT_CLIENTS_LIST_VIEW_KEY) === 'grid'
      ? 'grid'
      : 'table'
  } catch {
    return 'table'
  }
}

function persistSubAgentClientsListView(view: SubAgentClientsListView) {
  try {
    localStorage.setItem(SUB_AGENT_CLIENTS_LIST_VIEW_KEY, view)
  } catch {
    /* ignore quota / private mode */
  }
}

function formatMobile(phone: string): string {
  return phone.replace(/\D/g, '')
}

function whatsappHref(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return '#'
  const withCountry =
    digits.startsWith('880') || digits.length > 11
      ? digits
      : digits.startsWith('0')
        ? `88${digits}`
        : digits
  return `https://wa.me/${withCountry}`
}

function matchesSubAgentClientFilters(
  client: Client,
  search: string,
  serviceFilters: string[],
  statusFilters: string[],
  clientCases: Case[],
): boolean {
  const q = search.trim().toLowerCase()
  const phoneDigits = formatMobile(client.phone)
  const queryDigits = formatMobile(q)
  const matchSearch =
    !q ||
    client.name.toLowerCase().includes(q) ||
    client.phone.toLowerCase().includes(q) ||
    client.passport?.toLowerCase().includes(q) ||
    client.nid?.toLowerCase().includes(q) ||
    (queryDigits.length > 0 && phoneDigits.includes(queryDigits))
  const matchService =
    serviceFilters.length === 0 ||
    serviceFilters.some((service) =>
      clientCases.some((item) => item.service === service),
    )
  const matchStatus = clientMatchesServiceStatusFilters(
    clientCases,
    statusFilters,
  )
  return matchSearch && matchService && matchStatus
}

function statusBadgeVariant(status: SubAgentStatus) {
  return status === 'Active' ? ('default' as const) : ('secondary' as const)
}

function caseStatusShadcnVariant(
  status: CaseStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'Completed') return 'default'
  if (status === 'Cancelled') return 'destructive'
  if (status === 'On-Hold') return 'outline'
  return 'secondary'
}

function formatDate(value: string): string {
  return formatDisplayDate(value)
}

function toProfileDraft(subAgent: SubAgent): ProfileDraft {
  return {
    name: subAgent.name,
    phone: subAgent.phone,
    email: subAgent.email ?? '',
    address: subAgent.address ?? '',
    licenseNumber: subAgent.licenseNumber ?? '',
    photoUrl: subAgent.photoUrl,
  }
}

function StatusChip({ status }: { status: SubAgentStatus }) {
  return <Badge variant={statusBadgeVariant(status)}>{status}</Badge>
}

function profileDraftsEqual(a: ProfileDraft, b: ProfileDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <dt className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-medium tracking-wide text-muted-foreground">
      <span
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-[0.35rem] bg-muted text-muted-foreground"
        aria-hidden
      >
        <Icon size={13} strokeWidth={2.25} />
      </span>
      {children}
    </dt>
  )
}

function TabLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <>
      <Icon size={15} strokeWidth={2.25} aria-hidden />
      {children}
    </>
  )
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
        aria-hidden
      >
        <Icon size={15} strokeWidth={2.25} />
      </span>
      {children}
    </span>
  )
}

function ContactChip({
  href,
  to,
  value,
  label,
  variant = 'identity',
}: {
  href?: string
  to?: string
  value: string
  label: string
  variant?: 'identity' | 'cardField'
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const valueClass = cn(
    'break-words',
    variant === 'cardField' && 'block min-w-0 max-w-full pe-5',
    (to || href) && 'text-primary underline-offset-2 hover:underline',
  )

  const valueNode = to ? (
    <Link to={to} className={valueClass}>
      {value}
    </Link>
  ) : href ? (
    <a href={href} className={valueClass}>
      {value}
    </a>
  ) : (
    <span className={valueClass}>{value}</span>
  )

  return (
    <span
      className={cn(
        'group relative overflow-visible',
        variant === 'cardField'
          ? 'flex w-full min-w-0 items-start'
          : 'inline-flex max-w-full items-center justify-center',
      )}
    >
      {valueNode}
      <button
        type="button"
        className={cn(
          'absolute size-5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
          variant === 'cardField'
            ? 'end-0 top-0'
            : 'start-full top-1/2 -translate-y-1/2',
        )}
        onClick={handleCopy}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        title={copied ? 'Copied' : `Copy ${label}`}
      >
        {copied ? (
          <Check size={13} strokeWidth={2.25} aria-hidden />
        ) : (
          <Copy size={13} strokeWidth={2.25} aria-hidden />
        )}
      </button>
    </span>
  )
}

function DetailTabs({
  value,
  onValueChange,
  items,
}: {
  value: string
  onValueChange: (value: string) => void
  items: { id: string; label: ReactNode; content: ReactNode }[]
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  const updateIndicator = useCallback(() => {
    const button = buttonRefs.current.get(value)
    if (!button) return
    setIndicator({ left: button.offsetLeft, width: button.offsetWidth })
  }, [value])

  useLayoutEffect(() => {
    updateIndicator()
  }, [updateIndicator, items.length])

  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => updateIndicator())
    observer.observe(root)
    window.addEventListener('resize', updateIndicator)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateIndicator)
    }
  }, [updateIndicator])

  const active = items.find((item) => item.id === value) ?? items[0]

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={rootRef}
        role="tablist"
        aria-label="Sub agent sections"
        className="relative inline-flex h-9 max-w-full items-stretch self-start overflow-x-auto rounded-lg border border-input bg-card p-0.5"
      >
        {indicator ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-0.5 bottom-0.5 z-0 rounded-md bg-primary transition-[left,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ left: indicator.left, width: indicator.width } as CSSProperties}
          />
        ) : null}
        {items.map((item) => {
          const isActive = item.id === value
          return (
            <Button
              key={item.id}
              ref={(node) => {
                if (node) buttonRefs.current.set(item.id, node)
                else buttonRefs.current.delete(item.id)
              }}
              type="button"
              variant="ghost"
              role="tab"
              aria-selected={isActive}
              className={cn(
                'relative z-[1] h-full min-h-0 shrink-0 rounded-md px-3 text-sm font-medium shadow-none',
                isActive
                  ? 'text-primary-foreground hover:!bg-transparent hover:text-primary-foreground'
                  : 'text-muted-foreground hover:!bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)] hover:text-foreground',
              )}
              onClick={() => onValueChange(item.id)}
            >
              {item.label}
            </Button>
          )
        })}
      </div>
      <div role="tabpanel">{active?.content}</div>
    </div>
  )
}

function FilterChoices({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const allSelected =
    options.length > 0 && options.every((option) => selected.includes(option.value))

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    )
  }

  return (
    <>
      <div className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
        Filter {label}
      </div>
      <div className="h-px bg-border" />
      <div
        role="button"
        tabIndex={0}
        className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted"
        onClick={() =>
          onChange(allSelected ? [] : options.map((option) => option.value))
        }
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          onChange(allSelected ? [] : options.map((option) => option.value))
        }}
      >
        <Checkbox checked={allSelected} tabIndex={-1} aria-hidden className="pointer-events-none" />
        <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
      </div>
      <div className="h-px bg-border" />
      <div className="max-h-56 overflow-y-auto py-1" role="listbox" aria-label={`${label} values`} aria-multiselectable>
        {options.map((option) => {
          const isSelected = selected.includes(option.value)
          return (
            <div
              key={option.value}
              role="option"
              tabIndex={0}
              aria-selected={isSelected}
              className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => toggle(option.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                toggle(option.value)
              }}
            >
              <Checkbox
                checked={isSelected}
                tabIndex={-1}
                aria-hidden
                className="pointer-events-none"
              />
              <span className="min-w-0 truncate">{option.label}</span>
            </div>
          )
        })}
      </div>
    </>
  )
}

function MultiFilterButton({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const active = selected.length > 0
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(whiteControlClass, active && 'border-primary')}
        >
          <ListFilter size={14} strokeWidth={2} data-icon="inline-start" />
          {label}
          {active ? ` (${selected.length})` : ''}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 !gap-0 !p-0">
        <FilterChoices
          label={label}
          options={options}
          selected={selected}
          onChange={onChange}
        />
      </PopoverContent>
    </Popover>
  )
}

export default function SubAgentDetailPage() {
  const { id = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const subAgents = useSubAgents()
  const subAgent = subAgents.find((item) => item.id === id)
  const allClients = useClients()
  const allCases = useCases()
  const clients = useMemo(() => {
    if (!subAgent) return []
    return allClients.filter(
      (client) =>
        client.subAgentId === subAgent.id &&
        client.tenantId === subAgent.tenantId,
    )
  }, [allClients, subAgent])
  const casesByClientId = useMemo(
    () => groupCasesByClientId(allCases),
    [allCases],
  )
  const subAgentCases = useMemo(() => {
    const clientIds = new Set(clients.map((client) => client.id))
    return allCases.filter((item) => clientIds.has(item.clientId))
  }, [allCases, clients])
  const activityStatus = deriveSubAgentActivityStatus(subAgentCases)
  const payments = usePayments()
  const pendingCommissions = usePendingCommissions(id)
  const commissionSettlements = useCommissionSettlements(id)
  const activeTab = tabFromSearch(searchParams)
  const [customerOpen, setCustomerOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [clientServiceFilters, setClientServiceFilters] = useState<string[]>([])
  const [clientStatusFilters, setClientStatusFilters] = useState<string[]>([])
  const [clientsListView, setClientsListView] = useState<SubAgentClientsListView>(
    readSubAgentClientsListView,
  )
  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const { markAllTouched, showError, blur } = useTouchedFields<
    'name' | 'phone' | 'email' | 'address' | 'licenseNumber'
  >()

  useEffect(() => {
    if (!subAgent) return
    setDraft(toProfileDraft(subAgent))
  }, [subAgent?.id])

  useEffect(() => {
    if (!subAgent) return
    if (subAgent.status === activityStatus) return
    updateSubAgent(subAgent.id, { status: activityStatus })
  }, [subAgent, activityStatus])

  const savedDraft = useMemo(
    () => (subAgent ? toProfileDraft(subAgent) : null),
    [subAgent],
  )

  if (!subAgent || !savedDraft) {
    return <Navigate to="/sub-agents" replace />
  }

  const profileDraft = draft ?? savedDraft
  const isDirty = !profileDraftsEqual(profileDraft, savedDraft)
  const subAgentErrors = {
    name: validateRequiredName(profileDraft.name, 'Sub Agent Name'),
    phone: validateRequiredPhone(profileDraft.phone),
    email: validateOptionalEmail(profileDraft.email),
    address: validateOptionalText(profileDraft.address, 'Address'),
    licenseNumber: validateOptionalText(
      profileDraft.licenseNumber,
      'License',
      40,
    ),
  }

  const collected = payments
    .filter((item) => clients.some((client) => client.id === item.clientId))
    .reduce((sum, item) => sum + item.amount, 0)
  const outstanding = clients.reduce(
    (sum, client) =>
      sum + deriveClientBalance(casesByClientId.get(client.id) ?? []),
    0,
  )
  const filteredClients = clients.filter((client) =>
    matchesSubAgentClientFilters(
      client,
      clientSearch,
      clientServiceFilters,
      clientStatusFilters,
      casesByClientId.get(client.id) ?? [],
    ),
  )
  const hasClientFilters =
    clientServiceFilters.length > 0 || clientStatusFilters.length > 0

  const selectTab = (tab: string) => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'overview') next.delete('tab')
    else next.set('tab', tab)
    setSearchParams(next, { replace: true })
  }

  const selectClientsListView = (view: SubAgentClientsListView) => {
    setClientsListView(view)
    persistSubAgentClientsListView(view)
  }

  const resetClientFilters = () => {
    setClientSearch('')
    setClientServiceFilters([])
    setClientStatusFilters([])
  }

  const discardChanges = () => {
    setDraft(savedDraft)
  }

  const saveProfile = () => {
    markAllTouched([
      'name',
      'phone',
      'email',
      'address',
      'licenseNumber',
    ])
    if (Object.values(subAgentErrors).some(Boolean)) return
    const updated = updateSubAgent(subAgent.id, {
      name: profileDraft.name.trim(),
      phone: profileDraft.phone.trim(),
      email: profileDraft.email.trim() || undefined,
      address: profileDraft.address.trim() || undefined,
      licenseNumber: profileDraft.licenseNumber.trim() || undefined,
      photoUrl: profileDraft.photoUrl,
      status: activityStatus,
    })
    if (updated) setDraft(toProfileDraft(updated))
  }

  const handleCreateClient = (input: CreateClientInput) => {
    try {
      const created = createClient({ ...input, subAgentId: subAgent.id })
      setCustomerOpen(false)
      navigate(`/clients/${created.id}?newCase=1`)
    } catch (error) {
      if (notifyIfPendingApproval(error)) {
        setCustomerOpen(false)
        return
      }
      throw error
    }
  }

  const displayName = profileDraft.name || subAgent.name
  const displayPhone = profileDraft.phone
  const displayEmail = profileDraft.email
  const displayAddress = profileDraft.address
  const displayLicense = profileDraft.licenseNumber
  const statusForClient = (clientId: string) =>
    deriveClientServiceStatus(casesByClientId.get(clientId) ?? [])

  const fieldClass = (isDirtyField: boolean) =>
    cn('rounded-lg transition-[box-shadow]', isDirtyField && 'ring-1 ring-primary/40')

  return (
    <TooltipProvider>
      <div
        className={cn(elevatedPageClass, 'gap-5')}
        data-elevated-canvas
        aria-label={subAgent.name}
      >
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
          <aside
            className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-0 lg:z-[1] lg:max-h-[calc(100dvh-8.5rem)] lg:overflow-y-auto"
            aria-label="Sub agent profile"
          >
            <div className="flex shrink-0 flex-col items-center gap-2 text-center">
              <Avatar className="size-20">
                {(profileDraft.photoUrl ?? subAgent.photoUrl) ? (
                  <AvatarImage
                    src={profileDraft.photoUrl ?? subAgent.photoUrl}
                    alt=""
                  />
                ) : null}
                <AvatarFallback>{initials(displayName)}</AvatarFallback>
              </Avatar>
              <h1 className="m-0 text-[1.0625rem] font-semibold leading-tight tracking-tight">
                <ContactChip value={displayName} label="Sub Agent Name" />
              </h1>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-1.5">
              <Button className="h-9 w-full rounded-lg" onClick={() => setCustomerOpen(true)}>
                <Users size={14} strokeWidth={2.25} data-icon="inline-start" />
                Add Client
              </Button>
              <div className="grid grid-cols-3 gap-1.5">
                <a
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)]"
                  href={`tel:${displayPhone}`}
                  aria-label={`Call ${displayName}`}
                  title="Call"
                >
                  <Phone size={14} strokeWidth={2.25} aria-hidden />
                </a>
                <a
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)]"
                  href={whatsappHref(displayPhone)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`WhatsApp ${displayName}`}
                  title="WhatsApp"
                >
                  <WhatsAppIcon size={14} />
                </a>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => selectTab('profile')}
                  aria-label="Edit profile"
                  title="Edit Profile"
                >
                  <Pencil size={14} strokeWidth={2.25} aria-hidden />
                </Button>
              </div>
            </div>

            <dl className="m-0 flex shrink-0 flex-col overflow-hidden rounded-[0.625rem] border border-border bg-background">
              {(
                [
                  ['Status', <StatusChip status={activityStatus} />],
                  [
                    'Phone',
                    <ContactChip
                      variant="cardField"
                      value={displayPhone}
                      label="Phone Number"
                    />,
                  ],
                  [
                    'Email',
                    displayEmail ? (
                      <ContactChip
                        variant="cardField"
                        value={displayEmail}
                        label="Email Address"
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    ),
                  ],
                  [
                    'License',
                    displayLicense ? (
                      <ContactChip
                        variant="cardField"
                        value={displayLicense}
                        label="License Number"
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    ),
                  ],
                  [
                    'Address',
                    displayAddress ? (
                      <ContactChip
                        variant="cardField"
                        value={displayAddress}
                        label="Address"
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    ),
                  ],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-2 border-b border-border px-2.5 py-1.5 last:border-b-0"
                >
                  <dt className="m-0 pt-0.5 text-[0.625rem] font-medium tracking-wide text-muted-foreground leading-snug">
                    {label}
                  </dt>
                  <dd className="m-0 flex min-w-0 flex-col gap-0.5 text-[0.8125rem] font-normal leading-snug text-foreground break-words">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="grid grid-cols-2 gap-2" aria-label="Snapshot">
              <button
                type="button"
                className="flex flex-col gap-0.5 rounded-lg border border-border bg-background px-2.5 py-2 text-left transition-colors hover:bg-muted/50"
                onClick={() => selectTab('clients')}
              >
                <span className="text-[0.625rem] font-medium tracking-wide text-muted-foreground">
                  Clients
                </span>
                <span className="text-base font-semibold">{clients.length}</span>
              </button>
              <button
                type="button"
                className="flex flex-col gap-0.5 rounded-lg border border-border bg-background px-2.5 py-2 text-left transition-colors hover:bg-muted/50"
                onClick={() => selectTab('clients')}
              >
                <span className="text-[0.625rem] font-medium tracking-wide text-muted-foreground">
                  Outstanding
                </span>
                <span
                  className={cn(
                    'text-base font-semibold',
                    outstanding > 0 && 'text-destructive',
                  )}
                >
                  {formatBalance(outstanding)}
                </span>
              </button>
            </div>

            <p className="m-0 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar size={12} strokeWidth={2.25} aria-hidden />
              Member Since {formatDate(subAgent.createdAt)}
            </p>
          </aside>

          <div className="min-w-0">
            <DetailTabs
              value={activeTab}
              onValueChange={selectTab}
              items={[
                {
                  id: 'overview',
                  label: <TabLabel icon={LayoutDashboard}>Overview</TabLabel>,
                  content: (
                    <div className="flex flex-col gap-4">
                      <Card size="sm" className="shadow-sm">
                        <CardHeader>
                          <CardTitle>
                            <SectionTitle icon={Contact}>Profile Information</SectionTitle>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <dl className="m-0 grid gap-4 sm:grid-cols-2">
                            <div>
                              <FieldLabel icon={Phone}>Phone</FieldLabel>
                              <dd className="m-0 text-sm">{displayPhone}</dd>
                            </div>
                            <div>
                              <FieldLabel icon={Mail}>Email</FieldLabel>
                              <dd className="m-0 text-sm">
                                {displayEmail ? (
                                  <ContactChip value={displayEmail} label="Email Address" />
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </dd>
                            </div>
                            <div>
                              <FieldLabel icon={MapPin}>Address</FieldLabel>
                              <dd className="m-0 text-sm">
                                {displayAddress || (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </dd>
                            </div>
                            <div>
                              <FieldLabel icon={IdCard}>License</FieldLabel>
                              <dd className="m-0 text-sm">
                                {displayLicense || (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </dd>
                            </div>
                            <div>
                              <FieldLabel icon={CircleDot}>Status</FieldLabel>
                              <dd className="m-0 text-sm">
                                <StatusChip status={activityStatus} />
                              </dd>
                            </div>
                            <div>
                              <FieldLabel icon={Wallet}>Collected</FieldLabel>
                              <dd className="m-0 text-sm">{formatBalance(collected)}</dd>
                            </div>
                            <div>
                              <FieldLabel icon={Calendar}>Member Since</FieldLabel>
                              <dd className="m-0 text-sm">{formatDate(subAgent.createdAt)}</dd>
                            </div>
                          </dl>
                        </CardContent>
                      </Card>

                      <Accordion
                        type="multiple"
                        defaultValue={['settlements', 'clients']}
                        className="flex flex-col gap-3"
                      >
                        <AccordionItem value="settlements" className="rounded-xl border bg-card px-4 shadow-sm">
                          <AccordionTrigger className="hover:no-underline">
                            <span className="inline-flex items-center gap-2">
                              <SectionTitle icon={Wallet}>Settlements</SectionTitle>
                              {pendingCommissions.length > 0 ? (
                                <Badge variant="secondary">{pendingCommissions.length}</Badge>
                              ) : null}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            {pendingCommissions.length === 0 &&
                            commissionSettlements.length === 0 ? (
                              <Empty className="border-0 p-4 shadow-none">
                                <EmptyHeader>
                                  <EmptyMedia variant="icon">
                                    <Wallet />
                                  </EmptyMedia>
                                  <EmptyTitle>No Commissions Yet</EmptyTitle>
                                </EmptyHeader>
                                <EmptyContent />
                              </Empty>
                            ) : (
                              <div className="flex flex-col gap-4">
                                {pendingCommissions.length > 0 ? (
                                  <>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="m-0 text-sm text-muted-foreground">
                                        Pending ·{' '}
                                        {formatPaymentAmount(
                                          pendingCommissions.reduce(
                                            (sum, item) => sum + item.amount,
                                            0,
                                          ),
                                        )}
                                      </p>
                                      <Button
                                        size="sm"
                                        className="h-8 rounded-lg"
                                        onClick={() =>
                                          settleEntries(
                                            subAgent.id,
                                            pendingCommissions.map((item) => item.id),
                                          )
                                        }
                                      >
                                        Settle All
                                      </Button>
                                    </div>
                                    <div className="overflow-auto rounded-xl border">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="hover:bg-transparent">
                                            <TableHead className={chromeHeadClass}>Date</TableHead>
                                            <TableHead className={chromeHeadClass}>Amount</TableHead>
                                            <TableHead className={chromeHeadClass}>Status</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {pendingCommissions.map((entry) => (
                                            <TableRow key={entry.id}>
                                              <TableCell>
                                                {formatDisplayDate(entry.createdAt)}
                                              </TableCell>
                                              <TableCell>
                                                {formatPaymentAmount(entry.amount)}
                                              </TableCell>
                                              <TableCell>Pending</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </>
                                ) : null}
                                {commissionSettlements.length > 0 ? (
                                  <>
                                    <h3 className="m-0 text-sm font-semibold">Past Settlements</h3>
                                    <div className="overflow-auto rounded-xl border">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="hover:bg-transparent">
                                            <TableHead className={chromeHeadClass}>Date</TableHead>
                                            <TableHead className={chromeHeadClass}>Entries</TableHead>
                                            <TableHead className={chromeHeadClass}>Total</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {commissionSettlements.map((item) => (
                                            <TableRow key={item.id}>
                                              <TableCell>
                                                {formatDisplayDate(item.settledAt)}
                                              </TableCell>
                                              <TableCell>{item.entryIds.length}</TableCell>
                                              <TableCell>
                                                {formatPaymentAmount(item.total)}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="clients" className="rounded-xl border bg-card px-4 shadow-sm">
                          <AccordionTrigger className="hover:no-underline">
                            <span className="inline-flex items-center gap-2">
                              <SectionTitle icon={Users}>Clients</SectionTitle>
                              {clients.length > 0 ? (
                                <Badge variant="secondary">{clients.length}</Badge>
                              ) : null}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            {clients.length === 0 ? (
                              <Empty className="border-0 p-4 shadow-none">
                                <EmptyHeader>
                                  <EmptyMedia variant="icon">
                                    <Users />
                                  </EmptyMedia>
                                  <EmptyTitle>No Clients Yet</EmptyTitle>
                                </EmptyHeader>
                                <EmptyContent>
                                  <AddClientSplitButton
                                    size="md"
                                    subAgentId={subAgent.id}
                                    onAddClient={() => setCustomerOpen(true)}
                                  />
                                </EmptyContent>
                              </Empty>
                            ) : (
                              <div className="overflow-auto rounded-xl border">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead className={chromeHeadClass}>Name</TableHead>
                                      <TableHead className={chromeHeadClass}>Mobile</TableHead>
                                      <TableHead className={chromeHeadClass}>Balance Due</TableHead>
                                      <TableHead className={chromeHeadClass}>Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {clients.map((client) => {
                                      const serviceStatus = statusForClient(client.id)
                                      return (
                                        <TableRow
                                          key={client.id}
                                          className="cursor-pointer"
                                          onClick={() => navigate(`/clients/${client.id}`)}
                                        >
                                          <TableCell>
                                            <div className="flex min-w-0 items-center gap-2.5">
                                              <Avatar className="size-8">
                                                {client.avatarUrl ? (
                                                  <AvatarImage src={client.avatarUrl} alt="" />
                                                ) : null}
                                                <AvatarFallback>
                                                  {initials(client.name)}
                                                </AvatarFallback>
                                              </Avatar>
                                              <span className="truncate font-medium">
                                                {client.name}
                                              </span>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            {normalizePhone(client.phone) || client.phone}
                                          </TableCell>
                                          <TableCell>
                                            {formatBalance(
                                              deriveClientBalance(
                                                casesByClientId.get(client.id) ?? [],
                                              ),
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {serviceStatus ? (
                                              <Badge
                                                variant={caseStatusShadcnVariant(serviceStatus)}
                                              >
                                                {serviceStatus}
                                              </Badge>
                                            ) : (
                                              '-'
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      )
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  ),
                },
                {
                  id: 'profile',
                  label: <TabLabel icon={Contact}>Profile</TabLabel>,
                  content: (
                    <div className="flex flex-col gap-4">
                      <Card size="sm" className="shadow-sm">
                        <CardHeader>
                          <CardTitle>
                            <SectionTitle icon={IdCard}>Identity</SectionTitle>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div
                              className={cn(
                                'sm:col-span-2',
                                fieldClass(profileDraft.photoUrl !== savedDraft.photoUrl),
                              )}
                            >
                              <ProfilePhotoField
                                name={profileDraft.name}
                                fallbackName="Sub Agent"
                                kind="subAgent"
                                value={profileDraft.photoUrl}
                                onChange={(photoUrl) =>
                                  setDraft((current) => ({
                                    ...(current ?? savedDraft),
                                    photoUrl,
                                  }))
                                }
                              >
                                <Input
                                  label="Sub Agent Name"
                                  required
                                  value={profileDraft.name}
                                  onChange={(event) =>
                                    setDraft((current) => ({
                                      ...(current ?? savedDraft),
                                      name: event.target.value,
                                    }))
                                  }
                                  onBlur={blur('name')}
                                  error={
                                    showError('name') ? subAgentErrors.name : undefined
                                  }
                                />
                              </ProfilePhotoField>
                            </div>
                            <div className={fieldClass(profileDraft.phone !== savedDraft.phone)}>
                              <Input
                                label="Phone"
                                required
                                type="tel"
                                value={profileDraft.phone}
                                onChange={(event) =>
                                  setDraft((current) => ({
                                    ...(current ?? savedDraft),
                                    phone: event.target.value,
                                  }))
                                }
                                onBlur={blur('phone')}
                                error={
                                  showError('phone') ? subAgentErrors.phone : undefined
                                }
                              />
                            </div>
                            <div className={fieldClass(profileDraft.email !== savedDraft.email)}>
                              <Input
                                label="Email"
                                type="email"
                                value={profileDraft.email}
                                onChange={(event) =>
                                  setDraft((current) => ({
                                    ...(current ?? savedDraft),
                                    email: event.target.value,
                                  }))
                                }
                                onBlur={blur('email')}
                                error={
                                  showError('email') ? subAgentErrors.email : undefined
                                }
                              />
                            </div>
                            <div
                              className={fieldClass(
                                profileDraft.address !== savedDraft.address,
                              )}
                            >
                              <Input
                                label="Address"
                                value={profileDraft.address}
                                onChange={(event) =>
                                  setDraft((current) => ({
                                    ...(current ?? savedDraft),
                                    address: event.target.value,
                                  }))
                                }
                                onBlur={blur('address')}
                                error={
                                  showError('address')
                                    ? subAgentErrors.address
                                    : undefined
                                }
                              />
                            </div>
                            <div
                              className={fieldClass(
                                profileDraft.licenseNumber !== savedDraft.licenseNumber,
                              )}
                            >
                              <Input
                                label="License"
                                value={profileDraft.licenseNumber}
                                onChange={(event) =>
                                  setDraft((current) => ({
                                    ...(current ?? savedDraft),
                                    licenseNumber: event.target.value,
                                  }))
                                }
                                onBlur={blur('licenseNumber')}
                                error={
                                  showError('licenseNumber')
                                    ? subAgentErrors.licenseNumber
                                    : undefined
                                }
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      {isDirty ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            className="h-9 rounded-lg"
                            onClick={discardChanges}
                          >
                            Discard Changes
                          </Button>
                          <Button className="h-9 rounded-lg" onClick={saveProfile}>
                            <Check size={16} strokeWidth={2.25} data-icon="inline-start" />
                            Save
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ),
                },
                {
                  id: 'clients',
                  label: <TabLabel icon={Users}>Clients</TabLabel>,
                  content: (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <SearchInput
                          className={cn(whiteControlClass, 'max-w-sm')}
                          placeholder="Search clients…"
                          value={clientSearch}
                          onChange={(event) => setClientSearch(event.target.value)}
                          aria-label="Search clients"
                        />
                        <MultiFilterButton
                          label="Service"
                          options={getEnabledServiceTypeOptions()}
                          selected={clientServiceFilters}
                          onChange={setClientServiceFilters}
                        />
                        <MultiFilterButton
                          label="Status"
                          options={CLIENT_STATUS_FILTERS}
                          selected={clientStatusFilters}
                          onChange={setClientStatusFilters}
                        />
                        {hasClientFilters ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-9"
                            onClick={() => {
                              setClientServiceFilters([])
                              setClientStatusFilters([])
                            }}
                          >
                            Clear
                          </Button>
                        ) : null}
                        <ToggleGroup
                          type="single"
                          value={clientsListView}
                          onValueChange={(value) => {
                            if (value === 'table' || value === 'grid') {
                              selectClientsListView(value)
                            }
                          }}
                          className="ml-auto"
                          aria-label="Client list view"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ToggleGroupItem
                                value="table"
                                aria-label="Table view"
                                className={whiteControlClass}
                              >
                                <Table2 size={16} strokeWidth={2.25} aria-hidden />
                              </ToggleGroupItem>
                            </TooltipTrigger>
                            <TooltipContent>Table View</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ToggleGroupItem
                                value="grid"
                                aria-label="Grid view"
                                className={whiteControlClass}
                              >
                                <LayoutGrid size={16} strokeWidth={2.25} aria-hidden />
                              </ToggleGroupItem>
                            </TooltipTrigger>
                            <TooltipContent>Grid View</TooltipContent>
                          </Tooltip>
                        </ToggleGroup>
                        <AddClientSplitButton
                          size="md"
                          label="New Client"
                          subAgentId={subAgent.id}
                          onAddClient={() => setCustomerOpen(true)}
                        />
                      </div>

                      {clients.length === 0 ? (
                        <Empty className="bg-card shadow-sm">
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <Users />
                            </EmptyMedia>
                            <EmptyTitle>No Customers Yet</EmptyTitle>
                          </EmptyHeader>
                          <EmptyContent>
                            <AddClientSplitButton
                              size="md"
                              subAgentId={subAgent.id}
                              onAddClient={() => setCustomerOpen(true)}
                            />
                          </EmptyContent>
                        </Empty>
                      ) : filteredClients.length === 0 ? (
                        <Empty className="bg-card shadow-sm">
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <Users />
                            </EmptyMedia>
                            <EmptyTitle>No Clients Match</EmptyTitle>
                          </EmptyHeader>
                          <EmptyContent>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg"
                              onClick={resetClientFilters}
                            >
                              Reset Filters
                            </Button>
                          </EmptyContent>
                        </Empty>
                      ) : clientsListView === 'grid' ? (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {filteredClients.map((client) => {
                            const serviceStatus = deriveClientServiceStatus(
                              casesByClientId.get(client.id) ?? [],
                            )
                            return (
                              <Card
                                key={client.id}
                                className="cursor-pointer shadow-sm"
                                onClick={() => navigate(`/clients/${client.id}`)}
                              >
                                <CardHeader>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <Avatar className="size-9">
                                        {client.avatarUrl ? (
                                          <AvatarImage src={client.avatarUrl} alt="" />
                                        ) : null}
                                        <AvatarFallback>
                                          {initials(client.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <CardTitle className="truncate">{client.name}</CardTitle>
                                    </div>
                                    {serviceStatus ? (
                                      <Badge
                                        variant={caseStatusShadcnVariant(serviceStatus)}
                                      >
                                        {serviceStatus}
                                      </Badge>
                                    ) : null}
                                  </div>
                                </CardHeader>
                                <CardContent className="grid gap-1 text-sm text-muted-foreground">
                                  <div className="flex justify-between gap-2">
                                    <span>Mobile</span>
                                    <span className="text-foreground">
                                      {formatMobile(client.phone)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-2">
                                    <span>Passport</span>
                                    <span className="text-foreground">
                                      {client.passport || '-'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-2">
                                    <span>Country</span>
                                    <span className="text-foreground">
                                      {client.preferredCountry || '-'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-2">
                                    <span>Balance Due</span>
                                    <span className="text-foreground">
                                      {formatBalance(
                                        deriveClientBalance(
                                          casesByClientId.get(client.id) ?? [],
                                        ),
                                      )}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="overflow-auto rounded-xl border bg-card shadow-md">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className={chromeHeadClass}>Name</TableHead>
                                <TableHead className={chromeHeadClass}>Mobile</TableHead>
                                <TableHead className={chromeHeadClass}>Passport</TableHead>
                                <TableHead className={chromeHeadClass}>Country</TableHead>
                                <TableHead className={chromeHeadClass}>Balance Due</TableHead>
                                <TableHead className={chromeHeadClass}>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredClients.map((client) => {
                                const serviceStatus = statusForClient(client.id)
                                return (
                                  <TableRow
                                    key={client.id}
                                    className="cursor-pointer"
                                    onClick={() => navigate(`/clients/${client.id}`)}
                                  >
                                    <TableCell>
                                      <div className="flex min-w-0 items-center gap-2.5">
                                        <Avatar className="size-8">
                                          {client.avatarUrl ? (
                                            <AvatarImage src={client.avatarUrl} alt="" />
                                          ) : null}
                                          <AvatarFallback>
                                            {initials(client.name)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="truncate font-medium">
                                          {client.name}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {normalizePhone(client.phone) || client.phone}
                                    </TableCell>
                                    <TableCell>{client.passport || '-'}</TableCell>
                                    <TableCell>
                                      {client.preferredCountry || '-'}
                                    </TableCell>
                                    <TableCell>
                                      {formatBalance(
                                        deriveClientBalance(
                                          casesByClientId.get(client.id) ?? [],
                                        ),
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {serviceStatus ? (
                                        <Badge
                                          variant={caseStatusShadcnVariant(serviceStatus)}
                                        >
                                          {serviceStatus}
                                        </Badge>
                                      ) : (
                                        '-'
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  id: 'report',
                  label: <TabLabel icon={FileText}>Report</TabLabel>,
                  content: (
                    <SubAgentClientReportPanel
                      subAgent={subAgent}
                      clients={clients}
                      casesByClientId={casesByClientId}
                    />
                  ),
                },
                {
                  id: 'login',
                  label: <TabLabel icon={KeyRound}>Login</TabLabel>,
                  content: (
                    <SubAgentLoginSection
                      subAgent={subAgent}
                      onEmailSaved={(email) => {
                        if (subAgent.email !== email) {
                          updateSubAgent(subAgent.id, { email })
                        }
                      }}
                    />
                  ),
                },
              ]}
            />
          </div>
        </div>

        <Sheet
          open={customerOpen}
          onOpenChange={(open) => {
            if (!open) setCustomerOpen(false)
          }}
        >
          <SheetContent className={cn(floatingSheetClass, floatingSheetWideClass)}>
            <SheetHeader className="border-b border-border px-5 py-4 pr-12">
              <SheetTitle className="text-base font-semibold">Add Client</SheetTitle>
            </SheetHeader>
            <NewClientForm
              defaultSubAgentId={subAgent.id}
              onCancel={() => setCustomerOpen(false)}
              onSubmit={handleCreateClient}
            />
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  )
}
