import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { getEnabledServiceOptions } from '@/lib/serviceCatalog'
import { getTenantById, tenantAllowsService } from '@/lib/tenantsStore'
import { BUILTIN_SERVICE_OPTIONS } from '@/types/case'
import { useAuth } from '@/lib/useAuth'
import { publicUrl } from '@/lib/publicUrl'
import { DEFAULT_TENANT_ID, TENANT_IDS } from '@/types/tenant'
import type {
  Client,
  ClientFileRef,
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
    banglaName: 'মোঃ রহিম উদ্দিন',
    fatherName: 'Abdul Karim',
    motherName: 'Rokeya Begum',
    dateOfBirth: '1995-04-12',
    gender: 'Male',
    maritalStatus: 'Married',
    nationality: 'Bangladeshi',
    placeOfBirth: 'Kishoreganj',
    spouseName: 'Ayesha Akter',
    bloodGroup: 'B+',
    whatsapp: '01712345678',
    presentAddress: 'Mirpur, Dhaka',
    permanentAddress: 'Kishoreganj',
    district: 'Kishoreganj',
    upazila: 'Bhairab',
    education: 'HSC',
    profession: 'Construction',
    skillTrade: 'Mason',
    experience: '5 years',
    previousOverseasExp: 'None',
    preferredCountry: 'Saudi Arabia',
    preferredJob: 'Mason',
    expectedSalary: '35000',
    contractAmount: 180000,
    branch: 'Dhaka',
    address: 'Mirpur, Dhaka',
    nid: '1990123456789',
    passport: 'A12345678',
    passportExpiry: '2030-06-15',
    passportIssuedOn: '2020-06-16',
    passportPlaceOfIssue: 'Dhaka',
    avatarUrl: DUMMY_AVATAR_URL,
    partnerId: 'AGT-T0001',
    services: ['Work Permit Visa', 'Air Ticket'],
    balance: 45000,
    activeCases: 2,
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
    partnerId: 'AGT-T0002',
    services: ['Student Visa'],
    balance: 0,
    activeCases: 0,
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
    services: ['Work Permit Visa'],
    balance: 0,
    activeCases: 0,
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
    partnerId: 'AGT-T0001',
    services: ['Hajj/Umrah Visa'],
    balance: 0,
    activeCases: 0,
    idChecked: true,
    createdAt: '2026-02-14',
  },
  {
    id: 'c-328',
    tenantId: TENANT_IDS.full,
    name: 'Imran Hossain',
    phone: '01988776655',
    services: ['Tour Package', 'Hotel Booking'],
    balance: 0,
    activeCases: 0,
    idChecked: false,
    createdAt: '2026-03-01',
  },
  {
    id: 'c-340',
    tenantId: TENANT_IDS.full,
    name: 'Ayesha Rahman',
    phone: '01733445566',
    email: 'ayesha.rahman@email.com',
    address: 'Dhanmondi, Dhaka',
    passport: 'D44556677',
    services: ['Tourist Visa'],
    balance: 0,
    activeCases: 0,
    idChecked: true,
    createdAt: '2026-06-18',
  },
  {
    id: 'c-351',
    tenantId: TENANT_IDS.full,
    name: 'Dr. Kamal Uddin',
    phone: '01822334455',
    email: 'kamal.uddin@email.com',
    address: 'Gulshan, Dhaka',
    passport: 'E55667788',
    nid: '1978123456789',
    services: ['Medical Visa'],
    balance: 0,
    activeCases: 0,
    idChecked: true,
    createdAt: '2026-07-01',
  },
  {
    id: 'c-l-328',
    tenantId: TENANT_IDS.leisure,
    name: 'Imran Hossain',
    phone: '01988776655',
    services: ['Tour Package'],
    balance: 0,
    activeCases: 0,
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
    services: ['Air Ticket'],
    balance: 0,
    activeCases: 0,
    idChecked: true,
    createdAt: '2026-04-02',
  },
  {
    id: 'c-m-284',
    tenantId: TENANT_IDS.manpower,
    name: 'Md. Rahim Uddin',
    phone: '01712345678',
    email: 'rahim.uddin@email.com',
    banglaName: 'মোঃ রহিম উদ্দিন',
    fatherName: 'Abdul Karim',
    motherName: 'Rokeya Begum',
    dateOfBirth: '1995-04-12',
    gender: 'Male',
    maritalStatus: 'Married',
    nationality: 'Bangladeshi',
    placeOfBirth: 'Kishoreganj',
    spouseName: 'Ayesha Akter',
    bloodGroup: 'B+',
    whatsapp: '01712345678',
    presentAddress: 'Mirpur, Dhaka',
    permanentAddress: 'Kishoreganj',
    district: 'Kishoreganj',
    upazila: 'Bhairab',
    education: 'HSC',
    profession: 'Construction',
    skillTrade: 'Mason',
    experience: '5 years',
    previousOverseasExp: 'None',
    preferredCountry: 'Saudi Arabia',
    preferredJob: 'Mason',
    expectedSalary: '35000',
    contractAmount: 180000,
    branch: 'Dhaka',
    address: 'Mirpur, Dhaka',
    nid: '1990123456789',
    passport: 'A12345678',
    passportExpiry: '2030-06-15',
    passportIssuedOn: '2020-06-16',
    passportPlaceOfIssue: 'Dhaka',
    avatarUrl: DUMMY_AVATAR_URL,
    partnerId: 'AGT-M0001',
    services: ['Work Permit Visa'],
    balance: 35000,
    activeCases: 1,
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
    partnerId: 'AGT-M0001',
    services: ['Work Permit Visa'],
    balance: 0,
    activeCases: 0,
    idChecked: true,
    createdAt: '2025-08-20',
  },
]

const STORAGE_KEY = 'pd-clients-created'
const SEED_IDS = new Set(SEED_CLIENTS.map((client) => client.id))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function optionalFileRef(value: unknown): ClientFileRef | undefined {
  if (!isRecord(value)) return undefined
  const fileId = optionalString(value.fileId)
  const fileName = optionalString(value.fileName)
  if (!fileId || !fileName) return undefined
  return {
    fileId,
    fileName,
    mimeType: optionalString(value.mimeType),
  }
}

function optionalCustomFields(
  value: unknown,
): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined
  const next: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value)) {
    const fieldId = key.trim()
    const text = optionalString(entry)
    if (fieldId && text) next[fieldId] = text
  }
  return Object.keys(next).length ? next : undefined
}

function normalizeStoredClient(value: unknown): Client | undefined {
  if (!isRecord(value)) return undefined
  const id = optionalString(value.id)
  const tenantId = optionalString(value.tenantId)
  const name = optionalString(value.name)
  const phone = optionalString(value.phone)
  if (!id || !tenantId || !name || !phone) return undefined
  const services = Array.isArray(value.services)
    ? value.services.filter((item): item is ServiceType => typeof item === 'string')
    : []
  return {
    id,
    tenantId,
    name,
    phone,
    email: optionalString(value.email),
    address: optionalString(value.address),
    banglaName: optionalString(value.banglaName),
    fatherName: optionalString(value.fatherName),
    motherName: optionalString(value.motherName),
    dateOfBirth: optionalString(value.dateOfBirth),
    gender:
      value.gender === 'Male' || value.gender === 'Female' || value.gender === 'Other'
        ? value.gender
        : undefined,
    maritalStatus:
      value.maritalStatus === 'Single' ||
      value.maritalStatus === 'Married' ||
      value.maritalStatus === 'Divorced' ||
      value.maritalStatus === 'Widowed'
        ? value.maritalStatus
        : undefined,
    nationality: optionalString(value.nationality),
    placeOfBirth: optionalString(value.placeOfBirth),
    spouseName: optionalString(value.spouseName),
    bloodGroup: optionalString(value.bloodGroup),
    whatsapp: optionalString(value.whatsapp),
    presentAddress: optionalString(value.presentAddress),
    permanentAddress: optionalString(value.permanentAddress),
    district: optionalString(value.district),
    upazila: optionalString(value.upazila),
    education: optionalString(value.education),
    profession: optionalString(value.profession),
    skillTrade: optionalString(value.skillTrade),
    experience: optionalString(value.experience),
    previousOverseasExp: optionalString(value.previousOverseasExp),
    preferredCountry: optionalString(value.preferredCountry),
    preferredJob: optionalString(value.preferredJob),
    customFields: optionalCustomFields(value.customFields),
    expectedSalary: optionalString(value.expectedSalary),
    contractAmount:
      typeof value.contractAmount === 'number' ? value.contractAmount : undefined,
    branch: optionalString(value.branch),
    nid: optionalString(value.nid),
    passport: optionalString(value.passport),
    passportExpiry: optionalString(value.passportExpiry),
    passportIssuedOn: optionalString(value.passportIssuedOn),
    passportPlaceOfIssue: optionalString(value.passportPlaceOfIssue),
    passportFile: optionalFileRef(value.passportFile),
    nidFile: optionalFileRef(value.nidFile),
    avatarUrl: optionalString(value.avatarUrl),
    partnerId: optionalString(value.partnerId),
    services: services.length ? services : ['Tour Package'],
    balance: typeof value.balance === 'number' ? value.balance : 0,
    activeCases: typeof value.activeCases === 'number' ? value.activeCases : 0,
    idChecked: value.idChecked === true,
    createdAt: optionalString(value.createdAt) ?? new Date().toISOString().slice(0, 10),
  }
}

function readCreatedClients(): Client[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeStoredClient)
      .filter((client): client is Client => client != null)
  } catch {
    return []
  }
}

function seedClients(): Client[] {
  return SEED_CLIENTS.map((client) => ({ ...client }))
}

function mergeWithSeeds(created: Client[]): Client[] {
  const createdIds = new Set(created.map((client) => client.id))
  return [
    ...created,
    ...seedClients().filter((client) => !createdIds.has(client.id)),
  ]
}

function persistCreatedClients() {
  const created = clients.filter((client) => !SEED_IDS.has(client.id))
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(created))
  } catch {
    /* ignore quota / private mode */
  }
}

let clients: Client[] = mergeWithSeeds(readCreatedClients())
const listeners = new Set<Listener>()

function emit(persist = true) {
  if (persist) persistCreatedClients()
  listeners.forEach((listener) => listener())
}

function hydrateClientsFromStorage() {
  clients = mergeWithSeeds(readCreatedClients())
  emit(false)
}

export function reloadClientsFromStorage() {
  hydrateClientsFromStorage()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    hydrateClientsFromStorage()
  })
  window.addEventListener('focus', hydrateClientsFromStorage)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') hydrateClientsFromStorage()
  })
}

export function resetClients() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  clients = seedClients()
  emit(false)
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
  forTenantId = tenantId(),
): Client | undefined {
  const digits = normalizePhone(phone)
  if (!digits) return undefined
  return clients.find(
    (client) =>
      client.tenantId === forTenantId &&
      client.id !== excludeId &&
      normalizePhone(client.phone) === digits,
  )
}

function normalizePassport(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase()
}

/** Public tracking: passport lookup is not tenant-scoped. */
export function findClientByPassport(passport: string): Client | undefined {
  const needle = normalizePassport(passport)
  if (!needle) return undefined
  return clients.find(
    (client) =>
      Boolean(client.passport) &&
      normalizePassport(client.passport ?? '') === needle,
  )
}

export function getClientsByPartnerId(partnerId: string): Client[] {
  return clients.filter(
    (client) => inActiveTenant(client) && client.partnerId === partnerId,
  )
}

export function createClient(
  input: CreateClientInput,
  options?: { tenantId?: string },
): Client {
  const assignedTenantId = options?.tenantId ?? tenantId()
  const phone = normalizePhone(input.phone)
  if (!phone) {
    throw new Error('Phone number is required.')
  }
  if (getClientByPhone(phone, undefined, assignedTenantId)) {
    throw new Error('A client with this phone number already exists.')
  }
  const tenant = getTenantById(assignedTenantId)
  if (!tenant || !tenantAllowsService(tenant, input.primaryService)) {
    throw new Error('This service line is not enabled for your agency.')
  }

  const created: Client = {
    id: `c-${Date.now().toString(36)}`,
    tenantId: assignedTenantId,
    name: input.name.trim(),
    phone,
    email: input.email?.trim() || undefined,
    address: input.address?.trim() || input.presentAddress?.trim() || undefined,
    banglaName: input.banglaName?.trim() || undefined,
    fatherName: input.fatherName?.trim() || undefined,
    motherName: input.motherName?.trim() || undefined,
    dateOfBirth: input.dateOfBirth?.trim() || undefined,
    gender: input.gender,
    maritalStatus: input.maritalStatus,
    nationality: input.nationality?.trim() || undefined,
    placeOfBirth: input.placeOfBirth?.trim() || undefined,
    spouseName: input.spouseName?.trim() || undefined,
    bloodGroup: input.bloodGroup?.trim() || undefined,
    whatsapp: input.whatsapp?.trim() || undefined,
    presentAddress:
      input.presentAddress?.trim() || input.address?.trim() || undefined,
    permanentAddress: input.permanentAddress?.trim() || undefined,
    district: input.district?.trim() || undefined,
    upazila: input.upazila?.trim() || undefined,
    education: input.education?.trim() || undefined,
    profession: input.profession?.trim() || undefined,
    skillTrade: input.skillTrade?.trim() || undefined,
    experience: input.experience?.trim() || undefined,
    previousOverseasExp: input.previousOverseasExp?.trim() || undefined,
    preferredCountry: input.preferredCountry?.trim() || undefined,
    preferredJob: input.preferredJob?.trim() || undefined,
    customFields: optionalCustomFields(input.customFields),
    expectedSalary: input.expectedSalary?.trim() || undefined,
    contractAmount: input.contractAmount,
    branch: input.branch?.trim() || undefined,
    partnerId: input.partnerId,
    avatarUrl: input.avatarUrl?.trim() || undefined,
    nid: input.nid?.trim() || undefined,
    passport: input.passport?.trim() || undefined,
    passportExpiry: input.passportExpiry?.trim() || undefined,
    passportIssuedOn: input.passportIssuedOn?.trim() || undefined,
    passportPlaceOfIssue: input.passportPlaceOfIssue?.trim() || undefined,
    services: [input.primaryService],
    balance: 0,
    activeCases: 0,
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

export function renameServiceOnClients(
  from: ServiceType,
  to: ServiceType,
): number {
  if (from === to) return 0
  let changed = 0
  clients = clients.map((client) => {
    if (!inActiveTenant(client)) return client
    if (!client.services.includes(from)) return client
    changed += 1
    return {
      ...client,
      services: Array.from(
        new Set(client.services.map((service) => (service === from ? to : service))),
      ),
    }
  })
  if (changed) emit()
  return changed
}

export function formatBalance(amount: number): string {
  return `৳ ${amount.toLocaleString('en-BD')}`
}

export const SERVICE_TYPE_OPTIONS = BUILTIN_SERVICE_OPTIONS

export function getEnabledServiceTypeOptions(): {
  value: ServiceType
  label: string
}[] {
  return getEnabledServiceOptions()
}
