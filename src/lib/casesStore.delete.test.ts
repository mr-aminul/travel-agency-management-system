import { afterEach, describe, expect, it } from 'vitest'
import {
  DEMO_USER,
  clearSession,
  writeSession,
} from '@/lib/authApi'
import {
  createCase,
  deleteCase,
  getCaseById,
  getCasesByClientId,
  resetCases,
} from '@/lib/casesStore'
import {
  createClient,
  getClientById,
  resetClients,
} from '@/lib/clientsStore'
import {
  createPayment,
  getPaymentsByCaseId,
  resetPayments,
} from '@/lib/paymentsStore'
import { TENANT_IDS } from '@/types/tenant'

afterEach(() => {
  clearSession()
  resetCases()
  resetClients()
  resetPayments()
})

function signIn() {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.demo,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

describe('deleteCase', () => {
  it('removes a mistaken service file and its payments', () => {
    signIn()
    const client = createClient({
      name: 'Delete Me Client',
      phone: `016${Date.now().toString().slice(-8)}`,
      primaryService: 'Work Permit Visa',
      idChecked: true,
    })
    const mistaken = createCase({
      clientId: client.id,
      service: 'Tourist Visa',
      serviceFee: 8000,
      balance: 8000,
    })
    createPayment({
      clientId: client.id,
      caseId: mistaken.id,
      amount: 2000,
      method: 'Cash',
    })

    expect(deleteCase(mistaken.id)).toBe(true)
    expect(getCaseById(mistaken.id)).toBeUndefined()
    expect(getPaymentsByCaseId(mistaken.id)).toHaveLength(0)
    expect(getCasesByClientId(client.id)).toHaveLength(0)
    expect(getClientById(client.id)?.services).not.toContain('Tourist Visa')
  })

  it('keeps another service of the same type on the client', () => {
    signIn()
    const client = createClient({
      name: 'Keep Sibling Client',
      phone: `017${Date.now().toString().slice(-8)}`,
      primaryService: 'Tourist Visa',
      idChecked: true,
    })
    const first = createCase({
      clientId: client.id,
      service: 'Tourist Visa',
    })
    const second = createCase({
      clientId: client.id,
      service: 'Tourist Visa',
    })

    expect(deleteCase(first.id)).toBe(true)
    expect(getCaseById(second.id)?.service).toBe('Tourist Visa')
    expect(getClientById(client.id)?.services).toContain('Tourist Visa')
  })
})
