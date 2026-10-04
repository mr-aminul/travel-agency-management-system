import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import PublicInvoicePage from '@/pages/PublicInvoicePage'
import type { CaseInvoice } from '@/lib/caseInvoice'
import { encodeInvoiceShare } from '@/lib/invoiceShare'

afterEach(() => {
  cleanup()
})

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

describe('public invoice page', () => {
  it('renders a shared invoice without signing in', () => {
    const token = encodeInvoiceShare(invoice)
    render(
      <MemoryRouter initialEntries={[`/i/${token}`]}>
        <Routes>
          <Route path="/i/:token" element={<PublicInvoicePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.queryByText('Back to service')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Invoice' })).toBeInTheDocument()
    expect(screen.getByText('INV-SR-00101')).toBeInTheDocument()
    expect(screen.getAllByText('Horizon Manpower').length).toBeGreaterThan(0)
    expect(screen.getByText('Md. Rahim Uddin')).toBeInTheDocument()
    expect(screen.getByText('Partial package deposit')).toBeInTheDocument()
  })

  it('explains when the share link is invalid', () => {
    render(
      <MemoryRouter initialEntries={['/i/not-valid']}>
        <Routes>
          <Route path="/i/:token" element={<PublicInvoicePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Invoice not found')).toBeInTheDocument()
  })
})
