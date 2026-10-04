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
    partnerId: 'AGT-T0002',
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
    partnerId: 'AGT-T0001',
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
    partnerId: 'AGT-M0001',
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
  if (!amount) return '—'
  return `৳ ${amount.toLocaleString('en-BD')}`
}

export const SERVICE_TYPE_OPTIONS = BUILTIN_SERVICE_OPTIONS

export function getEnabledServiceTypeOptions(): {
  value: ServiceType
  label: string
}[] {
  return getEnabledServiceOptions()
}
