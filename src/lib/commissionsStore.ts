import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { caseServiceFee } from '@/lib/caseMoney'
import { getCaseById } from '@/lib/casesStore'
import { getClientById } from '@/lib/clientsStore'
import { DATA_KEYS, loadJsonParsed, removeJson, saveJson } from '@/lib/data'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID } from '@/types/tenant'
import type {
  CommissionEntry,
  CommissionRule,
  CommissionSettlement,
} from '@/types/commission'

type Listener = () => void

const ENTRIES_KEY = DATA_KEYS.commissionsCreated
const SETTLEMENTS_KEY = DATA_KEYS.commissionSettlements
/** Default when no rule matches — 5% of fee. */
const DEFAULT_PERCENT = 5

const listeners = new Set<Listener>()
let rules: CommissionRule[] = []
let entries: CommissionEntry[] = []
let settlements: CommissionSettlement[] = []

function emit() {
  listeners.forEach((listener) => listener())
}

export function subscribeCommissions(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getEntriesSnapshot() {
  return entries
}

function getSettlementsSnapshot() {
  return settlements
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeRule(value: unknown): CommissionRule | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const subAgentId =
    typeof value.subAgentId === 'string' ? value.subAgentId.trim() : ''
  const percent =
    typeof value.percent === 'number' && Number.isFinite(value.percent)
      ? value.percent
      : Number(value.percent)
  if (!id || !tenantId || !subAgentId || !Number.isFinite(percent)) return undefined
  const flatAmount =
    typeof value.flatAmount === 'number' && Number.isFinite(value.flatAmount)
      ? value.flatAmount
      : undefined
  const serviceType =
    typeof value.serviceType === 'string' && value.serviceType.trim()
      ? value.serviceType.trim()
      : undefined
  return { id, tenantId, subAgentId, percent, flatAmount, serviceType }
}

function normalizeEntry(value: unknown): CommissionEntry | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const subAgentId =
    typeof value.subAgentId === 'string' ? value.subAgentId.trim() : ''
  const caseId = typeof value.caseId === 'string' ? value.caseId.trim() : ''
  const clientId =
    typeof value.clientId === 'string' ? value.clientId.trim() : ''
  const amount =
    typeof value.amount === 'number' && Number.isFinite(value.amount)
      ? value.amount
      : Number(value.amount)
  const createdAt =
    typeof value.createdAt === 'string' ? value.createdAt.trim() : ''
  const status = value.status === 'settled' ? 'settled' : 'pending'
  if (!id || !tenantId || !subAgentId || !caseId || !clientId || !createdAt) {
    return undefined
  }
  if (!Number.isFinite(amount) || amount < 0) return undefined
  return {
    id,
    tenantId,
    subAgentId,
    caseId,
    clientId,
    amount,
    status,
    createdAt,
    settledAt:
      typeof value.settledAt === 'string' && value.settledAt.trim()
        ? value.settledAt.trim()
        : undefined,
    paymentId:
      typeof value.paymentId === 'string' && value.paymentId.trim()
        ? value.paymentId.trim()
        : undefined,
  }
}

function normalizeSettlement(value: unknown): CommissionSettlement | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const subAgentId =
    typeof value.subAgentId === 'string' ? value.subAgentId.trim() : ''
  const settledAt =
    typeof value.settledAt === 'string' ? value.settledAt.trim() : ''
  const total =
    typeof value.total === 'number' && Number.isFinite(value.total)
      ? value.total
      : Number(value.total)
  const entryIds = Array.isArray(value.entryIds)
    ? value.entryIds
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : []
  if (!id || !tenantId || !subAgentId || !settledAt || entryIds.length === 0) {
    return undefined
  }
  if (!Number.isFinite(total) || total < 0) return undefined
  return {
    id,
    tenantId,
    subAgentId,
    entryIds,
    total,
    settledAt,
    note:
      typeof value.note === 'string' && value.note.trim()
        ? value.note.trim()
        : undefined,
  }
}

type StoredCommissions = {
  rules: CommissionRule[]
  entries: CommissionEntry[]
}

function loadStored(): StoredCommissions {
  return loadJsonParsed(
    ENTRIES_KEY,
    { rules: [], entries: [] } as StoredCommissions,
    (value) => {
      // Legacy: plain entry array
      if (Array.isArray(value)) {
        return {
          rules: [],
          entries: value
            .map(normalizeEntry)
            .filter((item): item is CommissionEntry => item != null),
        }
      }
      if (!isRecord(value)) return { rules: [], entries: [] }
      const nextRules = Array.isArray(value.rules)
        ? value.rules
            .map(normalizeRule)
            .filter((item): item is CommissionRule => item != null)
        : []
      const nextEntries = Array.isArray(value.entries)
        ? value.entries
            .map(normalizeEntry)
            .filter((item): item is CommissionEntry => item != null)
        : []
      return { rules: nextRules, entries: nextEntries }
    },
  )
}

function loadSettlements(): CommissionSettlement[] {
  return loadJsonParsed(
    SETTLEMENTS_KEY,
    [] as CommissionSettlement[],
    (value) => {
      if (!Array.isArray(value)) return []
      return value
        .map(normalizeSettlement)
        .filter((item): item is CommissionSettlement => item != null)
    },
  )
}

function persistEntries() {
  saveJson(ENTRIES_KEY, { rules, entries })
}

function persistSettlements() {
  saveJson(SETTLEMENTS_KEY, settlements)
}

function hydrate() {
  const stored = loadStored()
  rules = stored.rules
  entries = stored.entries
  settlements = loadSettlements()
}

hydrate()

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function reloadFromStorage() {
  hydrate()
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pd-data-rehydrated', reloadFromStorage)
}

function findRule(
  subAgentId: string,
  serviceType: string | undefined,
  forTenantId: string,
): CommissionRule | undefined {
  const forAgent = rules.filter(
    (rule) => rule.tenantId === forTenantId && rule.subAgentId === subAgentId,
  )
  if (serviceType) {
    const exact = forAgent.find(
      (rule) =>
        rule.serviceType &&
        rule.serviceType.toLowerCase() === serviceType.toLowerCase(),
    )
    if (exact) return exact
  }
  return forAgent.find((rule) => !rule.serviceType)
}

/** Suggested commission from a case fee using the best matching rule. */
export function computeSuggestedCommission(input: {
  subAgentId: string
  fee: number
  serviceType?: string
  forTenantId?: string
}): number {
  const active = input.forTenantId ?? tenantId()
  if (!Number.isFinite(input.fee) || input.fee <= 0) return 0
  const rule = findRule(input.subAgentId, input.serviceType, active)
  const percent = rule?.percent ?? DEFAULT_PERCENT
  const fromPercent = Math.round((input.fee * percent) / 100)
  const flat = rule?.flatAmount ?? 0
  return Math.max(0, fromPercent + flat)
}

export function listPendingCommissions(
  subAgentId: string,
  forTenantId = tenantId(),
): CommissionEntry[] {
  return entries
    .filter(
      (item) =>
        item.tenantId === forTenantId &&
        item.subAgentId === subAgentId &&
        item.status === 'pending',
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listCommissionSettlements(
  subAgentId: string,
  forTenantId = tenantId(),
): CommissionSettlement[] {
  return settlements
    .filter(
      (item) =>
        item.tenantId === forTenantId && item.subAgentId === subAgentId,
    )
    .sort((a, b) => b.settledAt.localeCompare(a.settledAt))
}

export function listCommissionRules(
  subAgentId?: string,
  forTenantId = tenantId(),
): CommissionRule[] {
  return rules.filter(
    (rule) =>
      rule.tenantId === forTenantId &&
      (subAgentId == null || rule.subAgentId === subAgentId),
  )
}

export function saveCommissionRule(
  input: Omit<CommissionRule, 'id' | 'tenantId'> & { id?: string },
): CommissionRule {
  const active = tenantId()
  const saved: CommissionRule = {
    id: input.id ?? `crule-${Date.now().toString(36)}`,
    tenantId: active,
    subAgentId: input.subAgentId,
    serviceType: input.serviceType?.trim() || undefined,
    percent: input.percent,
    flatAmount: input.flatAmount,
  }
  rules = [
    saved,
    ...rules.filter((rule) => rule.id !== saved.id),
  ]
  persistEntries()
  emit()
  return saved
}

/**
 * Record a commission when a payment is collected for a client
 * referred by a sub agent. Idempotent per paymentId.
 */
export function recordCommissionForCase(input: {
  caseId: string
  clientId: string
  paymentId?: string
  paymentAmount?: number
}): CommissionEntry | undefined {
  const client = getClientById(input.clientId)
  if (!client?.subAgentId) return undefined
  const caseItem = getCaseById(input.caseId)
  if (!caseItem) return undefined

  if (input.paymentId) {
    const existing = entries.find(
      (item) =>
        item.paymentId === input.paymentId &&
        item.tenantId === tenantId(),
    )
    if (existing) return existing
  }

  const feeBase =
    input.paymentAmount != null && Number.isFinite(input.paymentAmount)
      ? input.paymentAmount
      : caseServiceFee(caseItem)
  const amount = computeSuggestedCommission({
    subAgentId: client.subAgentId,
    fee: feeBase,
    serviceType: caseItem.service,
  })
  if (amount <= 0) return undefined

  const created: CommissionEntry = {
    id: `comm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId: tenantId(),
    subAgentId: client.subAgentId,
    caseId: input.caseId,
    clientId: input.clientId,
    amount,
    status: 'pending',
    createdAt: new Date().toISOString(),
    paymentId: input.paymentId,
  }
  entries = [created, ...entries]
  persistEntries()
  emit()
  return created
}

export function settleEntries(
  subAgentId: string,
  entryIds: string[],
  note?: string,
): CommissionSettlement | undefined {
  const active = tenantId()
  const idSet = new Set(entryIds)
  const pending = entries.filter(
    (item) =>
      item.tenantId === active &&
      item.subAgentId === subAgentId &&
      item.status === 'pending' &&
      idSet.has(item.id),
  )
  if (pending.length === 0) return undefined

  const settledAt = new Date().toISOString()
  const total = pending.reduce((sum, item) => sum + item.amount, 0)
  const settlement: CommissionSettlement = {
    id: `cset-${Date.now().toString(36)}`,
    tenantId: active,
    subAgentId,
    entryIds: pending.map((item) => item.id),
    total,
    settledAt,
    note: note?.trim() || undefined,
  }

  const settledIds = new Set(settlement.entryIds)
  entries = entries.map((item) =>
    settledIds.has(item.id)
      ? { ...item, status: 'settled' as const, settledAt }
      : item,
  )
  settlements = [settlement, ...settlements]
  persistEntries()
  persistSettlements()
  emit()
  return settlement
}

export function resetCommissions() {
  removeJson(ENTRIES_KEY)
  removeJson(SETTLEMENTS_KEY)
  rules = []
  entries = []
  settlements = []
  emit()
}

export function usePendingCommissions(subAgentId: string): CommissionEntry[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(
    subscribeCommissions,
    getEntriesSnapshot,
    getEntriesSnapshot,
  )
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () =>
      all
        .filter(
          (item) =>
            item.tenantId === activeId &&
            item.subAgentId === subAgentId &&
            item.status === 'pending',
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [all, activeId, subAgentId],
  )
}

export function useCommissionSettlements(
  subAgentId: string,
): CommissionSettlement[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(
    subscribeCommissions,
    getSettlementsSnapshot,
    getSettlementsSnapshot,
  )
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () =>
      all
        .filter(
          (item) =>
            item.tenantId === activeId && item.subAgentId === subAgentId,
        )
        .sort((a, b) => b.settledAt.localeCompare(a.settledAt)),
    [all, activeId, subAgentId],
  )
}
