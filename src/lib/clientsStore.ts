import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { activeTenantAllowsService } from '@/lib/activeTenant'
import { useAuth } from '@/lib/useAuth'
import { publicUrl } from '@/lib/publicUrl'
import { DEFAULT_TENANT_ID, TENANT_IDS } from '@/types/tenant'
import type {
  Client,
  CreateClientInput,
  ServiceType,
  UpdateClientInput,
} from '@/types/client'

type Listener = () => void

const DUMMY_AVATAR_URL = publicUrl('images/client-avatar-dummy.png')

const SEED_CLIENTS: Client[] = [
  {
    id: 'c-284',
    tenantId: TENANT_IDS.full,
    name: 'Md. Rahim Uddin',
    phone: '01712345678',
    email: 'rahim.uddin@email.com',
    address: 'Mirpur, Dhaka',
    nid: '1990123456789',
    passport: 'A12345678',
    avatarUrl: DUMMY_AVATAR_URL,
    services: ['Manpower', 'Ticketing'],
    balance: 0,
    activeCases: 0,
    status: 'Active',
    idChecked: true,
    createdAt: '2025-11-12',
  },
  {
    id: 'c-291',
    tenantId: TENANT_IDS.full,
    name: 'Farhana Akter',
    phone: '01819221100',
    email: 'farhana.akter@email.com',
    address: 'Chittagong',
    nid: '1995123456789',
    passport: 'B98765432',
    services: ['Student'],
    balance: 0,
    activeCases: 0,
    status: 'Active',
    idChecked: true,
    createdAt: '2026-01-08',
  },
  {
    id: 'c-302',
    tenantId: TENANT_IDS.full,
    name: 'Jamal Haque',
    phone: '01611889900',
    address: 'Sylhet',
    nid: '1988123456789',
    services: ['Manpower'],
    balance: 0,
    activeCases: 0,
    status: 'Deployed',
    idChecked: true,
    createdAt: '2025-08-20',
  },
  {
    id: 'c-315',
    tenantId: TENANT_IDS.full,
    name: 'Nusrat Jahan',
    phone: '01552334455',
    email: 'nusrat.j@email.com',
    address: 'Uttara, Dhaka',
    passport: 'C11223344',
    services: ['Hajj/Umrah'],
    balance: 0,
    activeCases: 0,
    status: 'Active',
    idChecked: true,
    createdAt: '2026-02-14',
  },
  {
    id: 'c-328',
    tenantId: TENANT_IDS.full,
    name: 'Imran Hossain',
    phone: '01988776655',
    services: ['Leisure'],
    balance: 0,
    activeCases: 0,
    status: 'Lead',
    idChecked: false,
    createdAt: '2026-03-01',
  },
  {
    id: 'c-l-328',
    tenantId: TENANT_IDS.leisure,
    name: 'Imran Hossain',
    phone: '01988776655',
    services: ['Leisure'],
    balance: 0,
    activeCases: 0,
    status: 'Lead',
    idChecked: false,
    createdAt: '2026-03-01',
  },
  {
    id: 'c-l-401',
    tenantId: TENANT_IDS.leisure,
    name: 'Sadia Karim',
    phone: '01755551212',
    email: 'sadia.karim@email.com',
    address: 'Cox’s Bazar',
    services: ['Ticketing'],
    balance: 0,
    activeCases: 0,
    status: 'Active',
    idChecked: true,
    createdAt: '2026-04-02',
  },
  {
    id: 'c-m-284',
    tenantId: TENANT_IDS.manpower,
    name: 'Md. Rahim Uddin',
    phone: '01712345678',
    email: 'rahim.uddin@email.com',
    address: 'Mirpur, Dhaka',
    nid: '1990123456789',
    passport: 'A12345678',
    avatarUrl: DUMMY_AVATAR_URL,
    services: ['Manpower'],
    balance: 0,
    activeCases: 0,
    status: 'Active',
    idChecked: true,
    createdAt: '2025-11-12',
  },
  {
    id: 'c-m-302',
    tenantId: TENANT_IDS.manpower,
    name: 'Jamal Haque',
    phone: '01611889900',
    address: 'Sylhet',
    nid: '1988123456789',
    services: ['Manpower'],
    balance: 0,
    activeCases: 0,
    status: 'Deployed',
    idChecked: true,
    createdAt: '2025-08-20',
  },
]

let clients: Client[] = SEED_CLIENTS.map((client) => ({ ...client }))
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return clients
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function inActiveTenant(client: Client) {
  return client.tenantId === tenantId()
}

export function findClientRecord(id: string): Client | undefined {
  return clients.find((client) => client.id === id)
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function useClients(): Client[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () => all.filter((client) => client.tenantId === activeId),
    [all, activeId],
  )
}

export function getClientById(id: string): Client | undefined {
  return clients.find((client) => client.id === id && inActiveTenant(client))
}

export function getClientByPhone(
  phone: string,
  excludeId?: string,
): Client | undefined {
  const digits = normalizePhone(phone)
  if (!digits) return undefined
  return clients.find(
    (client) =>
      inActiveTenant(client) &&
      client.id !== excludeId &&
      normalizePhone(client.phone) === digits,
  )
}

export function createClient(input: CreateClientInput): Client {
  const phone = normalizePhone(input.phone)
  if (!phone) {
    throw new Error('Phone number is required.')
  }
  if (getClientByPhone(phone)) {
    throw new Error('A client with this phone number already exists.')
  }
  if (!activeTenantAllowsService(input.primaryService)) {
    throw new Error('This service line is not enabled for your agency.')
  }

  const created: Client = {
    id: `c-${Date.now().toString(36)}`,
    tenantId: tenantId(),
    name: input.name.trim(),
    phone,
    email: input.email?.trim() || undefined,
    address: input.address?.trim() || undefined,
    nid: input.nid?.trim() || undefined,
    passport: input.passport?.trim() || undefined,
    services: [input.primaryService],
    balance: 0,
    activeCases: 0,
    status: 'Lead',
    idChecked: input.idChecked,
    createdAt: new Date().toISOString().slice(0, 10),
  }
  clients = [created, ...clients]
  emit()
  return created
}

function applyClientPatch(
  id: string,
  patch: UpdateClientInput,
  requireActiveTenant: boolean,
): Client | undefined {
  let updated: Client | undefined
  const nextPatch =
    patch.phone !== undefined
      ? { ...patch, phone: normalizePhone(patch.phone) }
      : patch

  if (nextPatch.phone !== undefined) {
    if (!nextPatch.phone) {
      throw new Error('Phone number is required.')
    }
    if (getClientByPhone(nextPatch.phone, id)) {
      throw new Error('A client with this phone number already exists.')
    }
  }

  clients = clients.map((client) => {
    if (client.id !== id) return client
    if (requireActiveTenant && !inActiveTenant(client)) return client
    updated = { ...client, ...nextPatch }
    return updated
  })
  if (updated) emit()
  return updated
}

export function updateClient(
  id: string,
  patch: UpdateClientInput,
): Client | undefined {
  return applyClientPatch(id, patch, true)
}

/** Used when deriving client fields from cases during seed (any tenant). */
export function updateClientRecord(
  id: string,
  patch: UpdateClientInput,
): Client | undefined {
  return applyClientPatch(id, patch, false)
}

export function formatBalance(amount: number): string {
  if (!amount) return '—'
  return `৳ ${amount.toLocaleString('en-BD')}`
}

export const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'Manpower', label: 'Manpower' },
  { value: 'Student', label: 'Student' },
  { value: 'Hajj/Umrah', label: 'Hajj / Umrah' },
  { value: 'Leisure', label: 'Leisure' },
  { value: 'Ticketing', label: 'Ticketing' },
]

export function getEnabledServiceTypeOptions(): {
  value: ServiceType
  label: string
}[] {
  return SERVICE_TYPE_OPTIONS.filter((option) =>
    activeTenantAllowsService(option.value),
  )
}
