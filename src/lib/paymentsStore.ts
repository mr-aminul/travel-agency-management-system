import { useSyncExternalStore } from 'react'
import { getCaseById, updateCase } from '@/lib/casesStore'
import type { CreatePaymentInput, Payment } from '@/types/payment'

type Listener = () => void

const SEED_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    clientId: 'c-284',
    caseId: 'case-101',
    amount: 15000,
    method: 'Bank transfer',
    note: 'Partial package deposit',
    createdAt: '2026-07-10',
  },
  {
    id: 'pay-2',
    clientId: 'c-291',
    caseId: 'case-103',
    amount: 50000,
    method: 'Cash',
    note: 'University counselling + application fee',
    createdAt: '2026-02-01',
  },
  {
    id: 'pay-3',
    clientId: 'c-315',
    caseId: 'case-104',
    amount: 25000,
    method: 'bKash',
    note: 'Hajj package advance',
    createdAt: '2026-03-01',
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

export function usePayments(): Payment[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function usePaymentsByClientId(clientId: string): Payment[] {
  return usePayments().filter((item) => item.clientId === clientId)
}

export function usePaymentsByCaseId(caseId: string): Payment[] {
  return usePayments().filter((item) => item.caseId === caseId)
}

export function getPaymentsByClientId(clientId: string): Payment[] {
  return payments.filter((item) => item.clientId === clientId)
}

export function getPaymentsByCaseId(caseId: string): Payment[] {
  return payments.filter((item) => item.caseId === caseId)
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
    clientId: input.clientId,
    caseId: input.caseId,
    amount: input.amount,
    method: input.method?.trim() || 'Cash',
    note: input.note?.trim() || undefined,
    createdAt: new Date().toISOString().slice(0, 10),
  }

  payments = [created, ...payments]
  const nextBalance = Math.max(0, caseItem.balance - input.amount)
  updateCase(caseItem.id, { balance: nextBalance })
  emit()
  return created
}

export function formatPaymentAmount(amount: number): string {
  return `৳ ${amount.toLocaleString('en-BD')}`
}
