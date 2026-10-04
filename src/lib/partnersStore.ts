import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID, TENANT_IDS } from '@/types/tenant'
import type { Partner, PartnerDraft } from '@/types/partner'

type Listener = () => void

const SEED_PARTNERS: Partner[] = [
  {
    id: 'AGT-T0001',
    tenantId: TENANT_IDS.full,
    name: 'Rakib Travels',
    phone: '01700001111',
    email: 'rakib@example.com',
    address: 'Motijheel, Dhaka',
    licenseNumber: 'RL-1001',
    branch: 'Dhaka',
    status: 'Active',
    createdAt: '2024-01-10T08:00:00.000Z',
  },
  {
    id: 'AGT-T0002',
    tenantId: TENANT_IDS.full,
    name: 'Sadia Enterprise',
    phone: '01700002222',
    email: 'sadia@example.com',
    address: 'Agrabad, Chattogram',
    licenseNumber: 'RL-1002',
    branch: 'Chattogram',
    status: 'Active',
    createdAt: '2024-02-14T08:00:00.000Z',
  },
  {
    id: 'AGT-M0001',
    tenantId: TENANT_IDS.manpower,
    name: 'Rakib Travels',
    phone: '01700001111',
    email: 'rakib@example.com',
    address: 'Motijheel, Dhaka',
    licenseNumber: 'RL-1001',
    branch: 'Dhaka',
    status: 'Active',
    createdAt: '2024-01-10T08:00:00.000Z',
  },
]

const STORAGE_KEY = 'pd-partners-created'
const SEED_IDS = new Set(SEED_PARTNERS.map((partner) => partner.id))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function normalizeStoredPartner(value: unknown): Partner | undefined {
  if (!isRecord(value)) return undefined
  const id = optionalString(value.id)
  const tenantId = optionalString(value.tenantId)
  const name = optionalString(value.name)
  const phone = optionalString(value.phone)
  if (!id || !tenantId || !name || !phone) return undefined
  return {
    id,
    tenantId,
    name,
    phone,
    email: optionalString(value.email),
    address: optionalString(value.address),
    licenseNumber: optionalString(value.licenseNumber),
    branch: optionalString(value.branch),
    photoUrl: optionalString(value.photoUrl),
    status: value.status === 'Inactive' ? 'Inactive' : 'Active',
    createdAt: optionalString(value.createdAt) ?? new Date().toISOString(),
  }
}

function readCreatedPartners(): Partner[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeStoredPartner)
      .filter((partner): partner is Partner => partner != null)
  } catch {
    return []
  }
}

function seedPartners(): Partner[] {
  return SEED_PARTNERS.map((partner) => ({ ...partner }))
}

function mergeWithSeeds(created: Partner[]): Partner[] {
  const createdIds = new Set(created.map((partner) => partner.id))
  return [
    ...created,
    ...seedPartners().filter((partner) => !createdIds.has(partner.id)),
  ]
}

function persistCreatedPartners() {
  const created = partners.filter((partner) => !SEED_IDS.has(partner.id))
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(created))
  } catch {
    /* ignore quota / private mode */
  }
}

let partners: Partner[] = mergeWithSeeds(readCreatedPartners())
const listeners = new Set<Listener>()

function emit(persist = true) {
  if (persist) persistCreatedPartners()
  listeners.forEach((listener) => listener())
}

function hydratePartnersFromStorage() {
  partners = mergeWithSeeds(readCreatedPartners())
  emit(false)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    hydratePartnersFromStorage()
  })
  window.addEventListener('focus', hydratePartnersFromStorage)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') hydratePartnersFromStorage()
  })
}

export function resetPartners() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  partners = seedPartners()
  emit(false)
}

export function reloadPartnersFromStorage() {
  hydratePartnersFromStorage()
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return partners
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function inActiveTenant(partner: Partner) {
  return partner.tenantId === tenantId()
}

function nextId(existing: string[]) {
  const nums = existing
    .map((id) => Number(id.replace(/\D/g, '').slice(-4)))
    .filter((n) => !Number.isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `AGT-T${String(next).padStart(4, '0')}`
}

export function usePartners(): Partner[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () => all.filter((partner) => partner.tenantId === activeId),
    [all, activeId],
  )
}

export function getPartnerById(id: string): Partner | undefined {
  return partners.find(
    (partner) => partner.id === id && inActiveTenant(partner),
  )
}

/** Public intake: resolve a sub agent without requiring a signed-in tenant. */
export function findPartnerById(id: string): Partner | undefined {
  return partners.find((partner) => partner.id === id)
}

export function createPartner(draft: PartnerDraft): Partner {
  const created: Partner = {
    ...draft,
    id: nextId(partners.map((partner) => partner.id)),
    tenantId: tenantId(),
    name: draft.name.trim(),
    phone: draft.phone.trim(),
    email: draft.email?.trim() || undefined,
    address: draft.address?.trim() || undefined,
    licenseNumber: draft.licenseNumber?.trim() || undefined,
    branch: draft.branch?.trim() || undefined,
    status: draft.status ?? 'Active',
    createdAt: new Date().toISOString(),
  }
  partners = [created, ...partners]
  emit()
  return created
}

export function updatePartner(
  id: string,
  patch: Partial<PartnerDraft>,
): Partner | undefined {
  let updated: Partner | undefined
  partners = partners.map((partner) => {
    if (partner.id !== id || !inActiveTenant(partner)) return partner
    updated = { ...partner, ...patch }
    return updated
  })
  if (updated) emit()
  return updated
}
