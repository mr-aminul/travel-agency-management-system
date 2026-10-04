import { describe, expect, it } from 'vitest'
import { DEFAULT_AGENCY_PROFILE } from '@/lib/agencyProfile'
import { buildCaseInvoice, invoiceNumberForCase } from '@/lib/caseInvoice'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'
import type { Payment } from '@/types/payment'
import { TENANT_IDS } from '@/types/tenant'

const caseItem: Case = {
  id: 'case-test',
  tenantId: TENANT_IDS.full,
  caseId: 'CASE-00999',
  clientId: 'c-test',
  clientName: 'Test Client',
  service: 'Manpower',
  status: 'In-Progress',
  stage: 'Processing',
  currentStepId: 'medical',
  steps: {},
  documents: [],
  destination: 'Riyadh, Saudi Arabia',
  balance: 20000,
  createdAt: '2026-01-01',
  updatedAt: '2026-02-01',
}

const client: Client = {
  id: 'c-test',
  tenantId: TENANT_IDS.full,
  name: 'Test Client',
  phone: '01700000000',
  email: 'test@example.com',
  address: 'Dhaka',
  passport: 'A11111111',
  services: ['Manpower'],
  balance: 20000,
  activeCases: 1,
  status: 'Active',
  idChecked: true,
  createdAt: '2026-01-01',
}

const payments: Payment[] = [
  {
    id: 'pay-a',
    tenantId: TENANT_IDS.full,
    clientId: 'c-test',
    caseId: 'case-test',
    amount: 15000,
    method: 'bKash',
    note: 'Deposit',
    createdAt: '2026-01-15',
  },
  {
    id: 'pay-b',
    tenantId: TENANT_IDS.full,
    clientId: 'c-test',
    caseId: 'case-test',
    amount: 5000,
    method: 'Cash',
    createdAt: '2026-01-10',
  },
]

describe('case invoice', () => {
  it('builds package total from payments plus remaining balance', () => {
    const invoice = buildCaseInvoice({
      caseItem,
      payments,
      client,
      profile: DEFAULT_AGENCY_PROFILE,
    })

    expect(invoice.invoiceNumber).toBe('INV-CASE-00999')
    expect(invoice.paidTotal).toBe(20000)
    expect(invoice.balanceDue).toBe(20000)
    expect(invoice.packageTotal).toBe(40000)
    expect(invoice.status).toBe('partial')
    expect(invoice.lineDescription).toBe(
      'Manpower package — Riyadh, Saudi Arabia',
    )
    expect(invoice.payments.map((item) => item.id)).toEqual(['pay-b', 'pay-a'])
    expect(invoice.issuedOn).toBe('2026-01-15')
    expect(invoice.clientPhone).toBe('01700000000')
  })

  it('marks an invoice paid when nothing remains due', () => {
    const invoice = buildCaseInvoice({
      caseItem: { ...caseItem, balance: 0 },
      payments,
      client,
      profile: DEFAULT_AGENCY_PROFILE,
    })
    expect(invoice.status).toBe('paid')
    expect(invoice.packageTotal).toBe(20000)
  })

  it('uses the case reference in the invoice number', () => {
    expect(invoiceNumberForCase(caseItem)).toBe('INV-CASE-00999')
  })
})
