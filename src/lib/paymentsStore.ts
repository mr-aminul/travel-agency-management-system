import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getCaseById, updateCase } from '@/lib/casesStore'
import { caseBalanceDue } from '@/lib/caseMoney'
import { getActiveTenantId } from '@/lib/authApi'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID, TENANT_IDS } from '@/types/tenant'
import type { CreatePaymentInput, Payment } from '@/types/payment'

type Listener = () => void

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

let payments: Payment[] = SEED_PAYMENTS.map((item) => ({ ...item }))
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
  return payments
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function inActiveTenant(item: Payment) {
  return item.tenantId === tenantId()
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
    createdAt: new Date().toISOString().slice(0, 10),
  }

  payments = [created, ...payments]
  const paidTotal = getPaymentsByCaseId(caseItem.id).reduce(
    (sum, item) => sum + item.amount,
    0,
  )
  updateCase(caseItem.id, {
    balance: caseBalanceDue(caseItem, paidTotal),
  })
  emit()
  return created
}

export function formatPaymentAmount(amount: number): string {
  return `৳ ${amount.toLocaleString('en-BD')}`
}
