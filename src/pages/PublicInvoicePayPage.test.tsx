import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import PublicInvoicePage from '@/pages/PublicInvoicePage'
import PublicInvoicePayPage from '@/pages/PublicInvoicePayPage'
import type { CaseInvoice } from '@/lib/caseInvoice'
import { encodeInvoiceShare } from '@/lib/invoiceShare'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

const invoice: CaseInvoice = {
  invoiceNumber: 'INV-SR-00101',
  issuedOn: '2026-01-15',
  caseRef: 'SR-00101',
  caseInternalId: 'case-101',
  service: 'Work Permit Visa',
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
  lineDescription: 'Work Permit Visa package for Riyadh, Saudi Arabia',
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

function renderInvoiceRoutes(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/i/:token/pay" element={<PublicInvoicePayPage />} />
        <Route path="/i/:token" element={<PublicInvoicePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('public invoice checkout', () => {
  it('collects the remaining balance and returns a paid invoice', async () => {
    const token = encodeInvoiceShare(invoice)
    renderInvoiceRoutes(`/i/${token}`)

    fireEvent.click(
      await screen.findByRole('link', { name: 'Pay ৳ 35,000 now' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Pay Horizon Manpower' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Amount due')).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'Pay ৳ 35,000 with bKash' }),
    )

    await waitFor(() => {
      expect(
        screen.getByText('Payment received. This invoice is up to date.'),
      ).toBeInTheDocument()
    })
    expect(screen.getByText('Paid in full')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Pay ৳ 35,000 now' }),
    ).not.toBeInTheDocument()
    expect(screen.getAllByText('৳ 50,000').length).toBeGreaterThan(0)
  })
})
