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

let partners: Partner[] = SEED_PARTNERS.map((partner) => ({ ...partner }))
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
