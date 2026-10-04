import { describe, expect, it } from 'vitest'
import type { CaseInvoice } from '@/lib/caseInvoice'
import {
  decodeInvoiceShare,
  encodeInvoiceShare,
  publicInvoicePath,
} from '@/lib/invoiceShare'

const invoice: CaseInvoice = {
  invoiceNumber: 'INV-SR-00101',
  issuedOn: '2026-01-15',
  caseRef: 'SR-00101',
  caseInternalId: 'case-101',
  service: 'Manpower',
  destination: 'Riyadh, Saudi Arabia',
  agencyName: 'Horizon Manpower',
  agencyAddress: 'Suite 5B, 88 Motijheel Commercial Area, Dhaka 1000',
  agencyMobile: '01816 445 773',
  agencyWebsite: 'https://www.horizonmanpower.com',
  agencyLogoUrl: '/images/logo.svg',
  agencyLogoIsCustom: false,
  clientName: 'Md. Rahim Uddin',
  clientPhone: '01712345678',
  clientEmail: 'rahim.uddin@email.com',
  clientAddress: 'Mirpur, Dhaka',
  clientPassport: 'A12345678',
  lineDescription: 'Manpower package — Riyadh, Saudi Arabia',
  packageTotal: 50000,
  paidTotal: 15000,
  balanceDue: 35000,
  payments: [
    {
      id: 'pay-1',
      date: '2026-01-15',
      method: 'Bank transfer',
      note: 'Partial package deposit',
      amount: 15000,
    },
  ],
  status: 'partial',
}

describe('invoice share token', () => {
  it('round-trips an invoice snapshot in a public path', () => {
    const token = encodeInvoiceShare(invoice)
    expect(decodeInvoiceShare(token)).toEqual(invoice)
    expect(publicInvoicePath(invoice)).toBe(`i/${token}`)
  })

  it('drops data-url logos so the link stays shareable', () => {
    const token = encodeInvoiceShare({
      ...invoice,
      agencyLogoUrl: 'data:image/jpeg;base64,abc',
      agencyLogoIsCustom: true,
    })
    expect(decodeInvoiceShare(token)?.agencyLogoUrl).toBeUndefined()
    expect(decodeInvoiceShare(token)?.agencyLogoIsCustom).toBe(false)
  })

  it('rejects a broken token', () => {
    expect(decodeInvoiceShare('not-a-token')).toBeNull()
    expect(decodeInvoiceShare('')).toBeNull()
  })
})
