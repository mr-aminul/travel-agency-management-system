import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { TENANT_IDS } from '@/types/tenant'
import CaseInvoicePage from '@/pages/CaseInvoicePage'

afterEach(() => {
  cleanup()
  clearSession()
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
          <Route path="/cases/:id/invoice" element={<CaseInvoicePage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('case invoice page', () => {
  it('shows agency invoice totals and recorded payments', () => {
    renderInvoice('/cases/case-101/invoice')

    expect(screen.getByRole('heading', { name: 'Invoice' })).toBeInTheDocument()
    expect(screen.getByText('INV-CASE-00101')).toBeInTheDocument()
    expect(screen.getByText('Md. Rahim Uddin')).toBeInTheDocument()
    expect(screen.getByText('Partial package deposit')).toBeInTheDocument()
    expect(screen.getByText('Bank transfer')).toBeInTheDocument()
    expect(screen.getByText('Partially paid')).toBeInTheDocument()
    expect(screen.getAllByText('৳ 15,000').length).toBeGreaterThan(0)
    expect(screen.getAllByText('৳ 35,000').length).toBeGreaterThan(0)
    expect(screen.getAllByText('৳ 50,000').length).toBeGreaterThan(0)
  })
})
