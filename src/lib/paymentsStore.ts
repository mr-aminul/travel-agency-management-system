import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getCaseById, updateCase } from '@/lib/casesStore'
import { caseBalanceDue } from '@/lib/caseMoney'
import { getActiveTenantId } from '@/lib/authApi'
import { getClientById } from '@/lib/clientsStore'
import { recordCommissionForCase } from '@/lib/commissionsStore'
import {
  DATA_KEYS,
  injectClientSideSeeds,
  loadJsonParsed,
  saveJson,
} from '@/lib/data'
import { logAuditEvent } from '@/lib/auditClient'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID, TENANT_IDS } from '@/types/tenant'
import type { CreatePaymentInput, Payment } from '@/types/payment'

type Listener = () => void

const STORAGE_KEY = DATA_KEYS.paymentsCreated

const SEED_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    tenantId: TENANT_IDS.full,
    clientId: 'c-284',
    caseId: 'case-101',
    amount: 15000,
    method: 'Bank transfer',
    note: 'Partial package deposit',
    createdAt: '2026-07-10',
  },
  {
    id: 'pay-2',
    tenantId: TENANT_IDS.full,
    clientId: 'c-291',
    caseId: 'case-103',
    amount: 50000,
    method: 'Cash',
    note: 'University counselling + application fee',
    createdAt: '2026-02-01',
  },
  {
    id: 'pay-3',
    tenantId: TENANT_IDS.full,
    clientId: 'c-315',
    caseId: 'case-104',
    amount: 25000,
    method: 'bKash',
    note: 'Hajj package advance',
    createdAt: '2026-03-01',
  },
  {
    id: 'pay-l-1',
    tenantId: TENANT_IDS.leisure,
    clientId: 'c-l-328',
    caseId: 'case-l-105',
    amount: 5000,
    method: 'bKash',
    note: 'Leisure package deposit',
    createdAt: '2026-03-06',
  },
  {
    id: 'pay-m-1',
    tenantId: TENANT_IDS.manpower,
    clientId: 'c-m-284',
    caseId: 'case-m-101',
    amount: 15000,
    method: 'Bank transfer',
    note: 'Partial package deposit',
    createdAt: '2026-07-10',
  },
]

const SEED_IDS = new Set(SEED_PAYMENTS.map((item) => item.id))
const dirtySeedIds = new Set<string>()
const listeners = new Set<Listener>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizePayment(value: unknown): Payment | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const clientId =
    typeof value.clientId === 'string' ? value.clientId.trim() : ''
  const caseId = typeof value.caseId === 'string' ? value.caseId.trim() : ''
  const amount =
    typeof value.amount === 'number' && Number.isFinite(value.amount)
      ? value.amount
      : Number(value.amount)
  const method =
    typeof value.method === 'string' && value.method.trim()
      ? value.method.trim()
      : 'Cash'
  const createdAt =
    typeof value.createdAt === 'string' ? value.createdAt.trim() : ''
  if (!id || !tenantId || !clientId || !caseId || !createdAt) return undefined
  if (!Number.isFinite(amount) || amount <= 0) return undefined
  return {
    id,
    tenantId,
    clientId,
    caseId,
    amount,
    method,
    note:
      typeof value.note === 'string' && value.note.trim()
        ? value.note.trim()
        : undefined,
    txnId:
      typeof value.txnId === 'string' && value.txnId.trim()
        ? value.txnId.trim()
        : undefined,
    createdAt,
  }
}

function readCreated(): Payment[] {
  return loadJsonParsed(STORAGE_KEY, [] as Payment[], (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map(normalizePayment)
      .filter((item): item is Payment => item != null)
  })
}

function shouldPersist(item: Payment): boolean {
  if (!injectClientSideSeeds()) return true
  return !SEED_IDS.has(item.id) || dirtySeedIds.has(item.id)
}

function persist() {
  saveJson(STORAGE_KEY, payments.filter(shouldPersist))
}

function mergeWithSeeds(created: Payment[]): Payment[] {
  if (!injectClientSideSeeds()) return created
  const createdIds = new Set(created.map((item) => item.id))
  return [
    ...SEED_PAYMENTS.filter((item) => !createdIds.has(item.id)).map((item) => ({
      ...item,
    })),
    ...created,
  ]
}

let payments: Payment[] = mergeWithSeeds(readCreated())

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
  return payments
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function inActiveTenant(item: Payment) {
  return item.tenantId === tenantId()
}

function reloadFromStorage() {
  payments = mergeWithSeeds(readCreated())
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pd-data-rehydrated', reloadFromStorage)
}

export function usePayments(): Payment[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () => all.filter((item) => item.tenantId === activeId),
    [all, activeId],
  )
}

export function usePaymentsByClientId(clientId: string): Payment[] {
  return usePayments().filter((item) => item.clientId === clientId)
}

export function usePaymentsByCaseId(caseId: string): Payment[] {
  return usePayments().filter((item) => item.caseId === caseId)
}

export function getPaymentsByClientId(clientId: string): Payment[] {
  return payments.filter(
    (item) => item.clientId === clientId && inActiveTenant(item),
  )
}

export function getPaymentsByCaseId(caseId: string): Payment[] {
  return payments.filter(
    (item) => item.caseId === caseId && inActiveTenant(item),
  )
}

/** Cross-tenant count for admin overview. */
export function countPaymentsForTenant(forTenantId: string): number {
  return payments.filter((item) => item.tenantId === forTenantId).length
}

export function latestPaymentActivityForTenant(
  forTenantId: string,
): string | undefined {
  let latest: string | undefined
  for (const item of payments) {
    if (item.tenantId !== forTenantId) continue
    if (!latest || item.createdAt > latest) latest = item.createdAt
  }
  return latest
}

export function createPayment(input: CreatePaymentInput): Payment {
  const caseItem = getCaseById(input.caseId)
  if (!caseItem) {
    throw new Error('Case not found for payment.')
  }
  if (caseItem.clientId !== input.clientId) {
    throw new Error('Payment client does not match case client.')
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Payment amount must be greater than zero.')
  }

  const created: Payment = {
    id: `pay-${Date.now().toString(36)}`,
    tenantId: tenantId(),
    clientId: input.clientId,
    caseId: input.caseId,
    amount: input.amount,
    method: input.method?.trim() || 'Cash',
    note: input.note?.trim() || undefined,
    txnId: input.txnId?.trim() || undefined,
    createdAt: new Date().toISOString().slice(0, 10),
  }

  payments = [created, ...payments]
  persist()
  const paidTotal = getPaymentsByCaseId(caseItem.id).reduce(
    (sum, item) => sum + item.amount,
    0,
  )
  updateCase(caseItem.id, {
    balance: caseBalanceDue(caseItem, paidTotal),
  })
  emit()
  void logAuditEvent({
    action: 'payment.create',
    entityType: 'payment',
    entityId: created.id,
    summary: `Collected ${formatPaymentAmount(created.amount)} via ${created.method}`,
    meta: { caseId: created.caseId, clientId: created.clientId },
  })
  const client = getClientById(created.clientId)
  if (client?.subAgentId) {
    recordCommissionForCase({
      caseId: created.caseId,
      clientId: created.clientId,
      paymentId: created.id,
      paymentAmount: created.amount,
    })
  }
  return created
}

export function formatPaymentAmount(amount: number): string {
  return `৳ ${amount.toLocaleString('en-BD')}`
}
