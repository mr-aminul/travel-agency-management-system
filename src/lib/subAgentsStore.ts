import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import {
  DATA_KEYS,
  hasJson,
  injectClientSideSeeds,
  loadJsonParsed,
  removeJson,
  saveJson,
} from '@/lib/data'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID, TENANT_IDS } from '@/types/tenant'
import type { SubAgent, SubAgentDraft } from '@/types/subAgent'

type Listener = () => void

const SEED_SUB_AGENTS: SubAgent[] = [
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

const STORAGE_KEY = DATA_KEYS.subAgentsCreated
const LEGACY_STORAGE_KEY = DATA_KEYS.subAgentsCreatedLegacy
const SEED_IDS = new Set(SEED_SUB_AGENTS.map((subAgent) => subAgent.id))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function normalizeStoredSubAgent(value: unknown): SubAgent | undefined {
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

function readCreatedSubAgents(): SubAgent[] {
  const key = hasJson(STORAGE_KEY) ? STORAGE_KEY : LEGACY_STORAGE_KEY
  const items = loadJsonParsed(key, [] as SubAgent[], (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map(normalizeStoredSubAgent)
      .filter((subAgent): subAgent is SubAgent => subAgent != null)
  })
  if (key === LEGACY_STORAGE_KEY && items.length > 0) {
    saveJson(STORAGE_KEY, items)
    removeJson(LEGACY_STORAGE_KEY)
  }
  return items
}

function seedSubAgents(): SubAgent[] {
  return SEED_SUB_AGENTS.map((subAgent) => ({ ...subAgent }))
}

function mergeWithSeeds(created: SubAgent[]): SubAgent[] {
  if (!injectClientSideSeeds()) return created
  const createdIds = new Set(created.map((subAgent) => subAgent.id))
  return [
    ...created,
    ...seedSubAgents().filter((subAgent) => !createdIds.has(subAgent.id)),
  ]
}

function persistCreatedSubAgents() {
  const created = injectClientSideSeeds()
    ? subAgents.filter((subAgent) => !SEED_IDS.has(subAgent.id))
    : subAgents
  saveJson(STORAGE_KEY, created)
  removeJson(LEGACY_STORAGE_KEY)
}

let subAgents: SubAgent[] = mergeWithSeeds(readCreatedSubAgents())
const listeners = new Set<Listener>()

function emit(persist = true) {
  if (persist) persistCreatedSubAgents()
  listeners.forEach((listener) => listener())
}

function hydrateSubAgentsFromStorage() {
  subAgents = mergeWithSeeds(readCreatedSubAgents())
  emit(false)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== LEGACY_STORAGE_KEY) return
    hydrateSubAgentsFromStorage()
  })
  window.addEventListener('focus', hydrateSubAgentsFromStorage)
  window.addEventListener('pd-data-rehydrated', hydrateSubAgentsFromStorage)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') hydrateSubAgentsFromStorage()
  })
}

export function resetSubAgents() {
  removeJson(STORAGE_KEY)
  removeJson(LEGACY_STORAGE_KEY)
  subAgents = seedSubAgents()
  emit(false)
}

export function reloadSubAgentsFromStorage() {
  hydrateSubAgentsFromStorage()
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return subAgents
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function inActiveTenant(subAgent: SubAgent) {
  return subAgent.tenantId === tenantId()
}

function nextId(existing: string[]) {
  const nums = existing
    .map((id) => Number(id.replace(/\D/g, '').slice(-4)))
    .filter((n) => !Number.isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `AGT-T${String(next).padStart(4, '0')}`
}

export function useSubAgents(): SubAgent[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () => all.filter((subAgent) => subAgent.tenantId === activeId),
    [all, activeId],
  )
}

export function getSubAgentById(id: string): SubAgent | undefined {
  return subAgents.find(
    (subAgent) => subAgent.id === id && inActiveTenant(subAgent),
  )
}

/** Public intake: resolve a sub agent without requiring a signed-in tenant. */
export function findSubAgentById(id: string): SubAgent | undefined {
  return subAgents.find((subAgent) => subAgent.id === id)
}

export function createSubAgent(draft: SubAgentDraft): SubAgent {
  const created: SubAgent = {
    ...draft,
    id: nextId(subAgents.map((subAgent) => subAgent.id)),
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
  subAgents = [created, ...subAgents]
  emit()
  return created
}

export function updateSubAgent(
  id: string,
  patch: Partial<SubAgentDraft>,
): SubAgent | undefined {
  let updated: SubAgent | undefined
  subAgents = subAgents.map((subAgent) => {
    if (subAgent.id !== id || !inActiveTenant(subAgent)) return subAgent
    updated = { ...subAgent, ...patch }
    return updated
  })
  if (updated) emit()
  return updated
}
