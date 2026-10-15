import { afterEach, describe, expect, it } from 'vitest'
import type { CaseInvoice } from '@/lib/caseInvoice'
import {
  mergeInvoicePayments,
  overlayInvoice,
  rememberInvoicePayOverlay,
} from '@/lib/invoicePay'

const invoice: CaseInvoice = {
  invoiceNumber: 'INV-SR-00101',
  issuedOn: '2026-01-15',
  caseRef: 'SR-00101',
  caseInternalId: 'case-101',
  service: 'Work Permit Visa',
  agencyName: 'Horizon Manpower',
  agencyAddress: 'Dhaka',
  agencyMobile: '01816 445 773',
  agencyWebsite: 'https://horizon.example',
  agencyLogoIsCustom: false,
  clientName: 'Md. Rahim Uddin',
  clientPhone: '01712345678',
  lineDescription: 'Work Permit Visa package',
  packageTotal: 50000,
  paidTotal: 15000,
  balanceDue: 35000,
  payments: [
    {
      id: 'pay-1',
      date: '2026-01-15',
      method: 'Bank transfer',
      amount: 15000,
    },
  ],
  status: 'partial',
}

afterEach(() => {
  sessionStorage.clear()
})

describe('invoice pay overlay', () => {
  it('marks the invoice paid when overlay covers the balance', () => {
    const next = mergeInvoicePayments(invoice, [
      {
        id: 'pay-online',
        date: '2026-10-15',
        method: 'bKash',
        amount: 35000,
      },
    ])
    expect(next.paidTotal).toBe(50000)
    expect(next.balanceDue).toBe(0)
    expect(next.status).toBe('paid')
    expect(next.payments).toHaveLength(2)
  })

  it('persists overlay payments against a share token', () => {
    rememberInvoicePayOverlay('tok-1', {
      id: 'pay-online',
      date: '2026-10-15',
      method: 'Nagad',
      amount: 35000,
    })
    const next = overlayInvoice(invoice, 'tok-1')
    expect(next.status).toBe('paid')
    expect(next.payments.some((row) => row.method === 'Nagad')).toBe(true)
  })
})
