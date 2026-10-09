import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import * as useAgencyProfileMod from '@/layout/useAgencyProfile'
import { TENANT_IDS } from '@/types/tenant'
import CaseInvoicePage from '@/pages/CaseInvoicePage'

afterEach(() => {
  cleanup()
  clearSession()
  vi.restoreAllMocks()
})

function renderInvoice(path: string) {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.full,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/clients/:id/services/:caseId/invoice"
            element={<CaseInvoicePage />}
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('case invoice page', () => {
  it('shows agency invoice totals and recorded payments', () => {
    renderInvoice('/clients/c-284/services/case-101/invoice')

    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Print invoice' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument()
    expect(screen.getByText('INV-SR-00101')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'From' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Billed To' })).toBeInTheDocument()
    expect(
      screen.getByText('Level 4, Plot 11, Road 17, Gulshan 1, Dhaka 1212'),
    ).toBeInTheDocument()
    expect(screen.getByText('01670 221 884')).toBeInTheDocument()
    expect(screen.getByText('www.onetrack.app')).toBeInTheDocument()
    expect(screen.queryByText('https://www.onetrack.app')).not.toBeInTheDocument()
    expect(screen.getByText('Md. Rahim Uddin')).toBeInTheDocument()
    expect(screen.queryByText('Service')).not.toBeInTheDocument()
    expect(screen.getByText('Partial package deposit')).toBeInTheDocument()
    expect(screen.getByText('Bank transfer')).toBeInTheDocument()
    expect(screen.queryByText('Partially paid')).not.toBeInTheDocument()
    expect(screen.getAllByText('৳ 15,000').length).toBeGreaterThan(0)
    expect(screen.getAllByText('৳ 35,000').length).toBeGreaterThan(0)
    expect(screen.getAllByText('৳ 50,000').length).toBeGreaterThan(0)
    expect(
      screen.getByText(
        'This is a computer generated invoice and does not require a signature',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('status', { name: 'Business profile incomplete' }),
    ).not.toBeInTheDocument()

    const logo = document.querySelector('.pd-invoice__logo')
    expect(logo).toHaveAttribute('src', expect.stringContaining('images/logo.svg'))
    expect(screen.getByText('OneTrack')).toBeInTheDocument()
  })

  it('blocks share when business profile contact details are missing', () => {
    vi.spyOn(useAgencyProfileMod, 'useAgencyProfile').mockReturnValue({
      businessName: 'River Tours',
      address: '',
      mobile: '',
      website: '',
      profilePicture: null,
    })
    renderInvoice('/clients/c-284/services/case-101/invoice')

    expect(
      screen.getByRole('status', { name: 'Business profile incomplete' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Open Business profile' }),
    ).toHaveAttribute('href', '/settings')
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Print invoice' })).toBeEnabled()
  })
})
