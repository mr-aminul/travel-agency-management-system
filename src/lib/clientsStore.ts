import { useSyncExternalStore } from 'react'
import { publicUrl } from '@/lib/publicUrl'
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
    name: 'Imran Hossain',
    phone: '01988776655',
    services: ['Leisure'],
    balance: 0,
    activeCases: 0,
    status: 'Lead',
    idChecked: false,
    createdAt: '2026-03-01',
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

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function useClients(): Client[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function getClientById(id: string): Client | undefined {
  return clients.find((client) => client.id === id)
}

export function getClientByPhone(
  phone: string,
  excludeId?: string,
): Client | undefined {
  const digits = normalizePhone(phone)
  if (!digits) return undefined
  return clients.find(
    (client) =>
      client.id !== excludeId && normalizePhone(client.phone) === digits,
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

  const created: Client = {
    id: `c-${Date.now().toString(36)}`,
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

export function updateClient(
  id: string,
  patch: UpdateClientInput,
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
    updated = { ...client, ...nextPatch }
    return updated
  })
  if (updated) emit()
  return updated
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
