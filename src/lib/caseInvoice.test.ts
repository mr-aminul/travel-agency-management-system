import { describe, expect, it } from 'vitest'
import { DEFAULT_AGENCY_PROFILE } from '@/lib/agencyProfile'
import {
  buildCaseInvoice,
  formatInvoiceWebsite,
  invoiceNumberForCase,
} from '@/lib/caseInvoice'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'
import type { Payment } from '@/types/payment'
import { TENANT_IDS } from '@/types/tenant'

const caseItem: Case = {
  id: 'case-test',
  tenantId: TENANT_IDS.full,
  caseId: 'SR-00999',
  clientId: 'c-test',
  clientName: 'Test Client',
  service: 'Work Permit Visa',
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
  services: ['Work Permit Visa'],
  balance: 20000,
  activeCases: 1,
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
  it('builds package total from the stored service fee', () => {
    const invoice = buildCaseInvoice({
      caseItem,
      payments,
      client,
      profile: DEFAULT_AGENCY_PROFILE,
    })

    expect(invoice.invoiceNumber).toBe('INV-SR-00999')
    expect(invoice.paidTotal).toBe(20000)
    expect(invoice.balanceDue).toBe(20000)
    expect(invoice.packageTotal).toBe(40000)
    expect(invoice.status).toBe('partial')
    expect(invoice.lineDescription).toBe(
      'Work Permit Visa package — Riyadh, Saudi Arabia',
    )
    expect(invoice.payments.map((item) => item.id)).toEqual(['pay-b', 'pay-a'])
    expect(invoice.issuedOn).toBe('2026-01-15')
    expect(invoice.clientPhone).toBe('01700000000')
    expect(invoice.agencyLogoUrl).toBeUndefined()
    expect(invoice.agencyLogoIsCustom).toBe(false)
  })

  it('uses the default brand logo when the agency has not uploaded one', () => {
    const invoice = buildCaseInvoice({
      caseItem,
      payments,
      client,
      profile: DEFAULT_AGENCY_PROFILE,
      defaultLogoUrl: '/images/logo.svg',
    })
    expect(invoice.agencyLogoUrl).toBe('/images/logo.svg')
    expect(invoice.agencyLogoIsCustom).toBe(false)
  })

  it('prefers the agency profile picture over the default logo', () => {
    const invoice = buildCaseInvoice({
      caseItem,
      payments,
      client,
      profile: {
        ...DEFAULT_AGENCY_PROFILE,
        profilePicture: 'data:image/jpeg;base64,abc',
      },
      defaultLogoUrl: '/images/logo.svg',
    })
    expect(invoice.agencyLogoUrl).toBe('data:image/jpeg;base64,abc')
    expect(invoice.agencyLogoIsCustom).toBe(true)
  })

  it('marks an invoice paid when the service fee is fully collected', () => {
    const invoice = buildCaseInvoice({
      caseItem: { ...caseItem, serviceFee: 20000, balance: 0 },
      payments,
      client,
      profile: DEFAULT_AGENCY_PROFILE,
    })
    expect(invoice.status).toBe('paid')
    expect(invoice.packageTotal).toBe(20000)
    expect(invoice.balanceDue).toBe(0)
  })

  it('reconstructs the fee from payments when none was stored', () => {
    const invoice = buildCaseInvoice({
      caseItem: { ...caseItem, serviceFee: undefined as unknown as number, balance: 10000 },
      payments,
      client,
      profile: DEFAULT_AGENCY_PROFILE,
    })
    expect(invoice.packageTotal).toBe(30000)
    expect(invoice.balanceDue).toBe(10000)
  })

  it('uses the case reference in the invoice number', () => {
    expect(invoiceNumberForCase(caseItem)).toBe('INV-SR-00999')
  })

  it('strips the protocol from website display text', () => {
    expect(formatInvoiceWebsite('https://www.onetrack.app')).toBe(
      'www.onetrack.app',
    )
    expect(formatInvoiceWebsite('http://www.example.com')).toBe(
      'www.example.com',
    )
    expect(formatInvoiceWebsite('www.already.clean')).toBe('www.already.clean')
  })
})
