import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { TENANT_IDS } from '@/types/tenant'
import { SERVICE_FEE_HIGHLIGHT_MS } from '@/components/cases/CasesList'
import ClientDetailPage from '@/pages/ClientDetailPage'
import CaseDetailPage from '@/pages/CaseDetailPage'

afterEach(() => {
  cleanup()
  clearSession()
  vi.useRealTimers()
})

function renderClient(path: string) {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.full,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/clients/:id" element={<ClientDetailPage />}>
            <Route path="services/:caseId" element={<CaseDetailPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('client overview', () => {
  it('opens add-service in a right panel', () => {
    renderClient('/clients/c-284')

    fireEvent.click(
      within(screen.getByRole('banner')).getByRole('button', {
        name: 'Add service',
      }),
    )

    expect(
      screen.getByRole('dialog', { name: 'Add service' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Service')).toBeInTheDocument()
    expect(screen.getByLabelText('Country')).toBeInTheDocument()
  })

  it('shows total contracted service fee across this client’s services', () => {
    renderClient('/clients/c-284')

    const summary = screen.getByLabelText('Summary')
    const labels = within(summary)
      .getAllByText(/Open services|Total service fee|Balance due/)
      .map((node) => node.textContent)
    expect(labels).toEqual(['Open services', 'Total service fee', 'Balance due'])
    expect(within(summary).getByText('৳ 60,000')).toBeInTheDocument()

    const header = screen.getByRole('banner')
    expect(within(header).getByText('01712345678')).toBeInTheDocument()
    expect(within(header).getByText('rahim.uddin@email.com')).toBeInTheDocument()
    expect(within(header).queryByRole('link', { name: /@/ })).toBeNull()
    expect(
      within(header).getByRole('button', { name: 'Copy email address' }),
    ).toBeInTheDocument()
    expect(within(header).getByText('A12345678')).toBeInTheDocument()
    expect(
      within(header).getByRole('button', { name: 'Copy passport number' }),
    ).toBeInTheDocument()
  })

  it('highlights the service fee column after opening services from the total', () => {
    vi.useFakeTimers()
    renderClient('/clients/c-284')

    fireEvent.click(
      within(screen.getByLabelText('Summary')).getByRole('button', {
        name: /total service fee/i,
      }),
    )

    expect(screen.getByRole('tab', { name: 'Services' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    const table = screen.getByLabelText('Md. Rahim Uddin services')
    const feeHeader = within(table).getByRole('columnheader', {
      name: 'Service fee',
    })
    expect(feeHeader).toHaveClass('is-highlight')
    const feeCells = table.querySelectorAll('td.pd-cases__fee')
    expect(feeCells).toHaveLength(2)
    feeCells.forEach((cell) => expect(cell).toHaveClass('is-highlight'))

    act(() => {
      vi.advanceTimersByTime(SERVICE_FEE_HIGHLIGHT_MS)
    })

    expect(feeHeader).not.toHaveClass('is-highlight')
    feeCells.forEach((cell) => expect(cell).not.toHaveClass('is-highlight'))
    vi.useRealTimers()
  })
})

describe('service detail', () => {
  it('opens the service below the table on the same client page', () => {
    renderClient('/clients/c-284/services/case-101')

    expect(screen.getByRole('link', { name: 'Back to Clients' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Md. Rahim Uddin' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Add service' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('tab', { name: 'Services' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    const table = screen.getByLabelText('Md. Rahim Uddin services')
    expect(within(table).getByText('Current step')).toBeInTheDocument()
    expect(within(table).getByText('SR-00101')).toBeInTheDocument()
    expect(within(table).getByText('SR-00102')).toBeInTheDocument()
    expect(within(table).getByText('SR-00101').closest('tr')).toHaveAttribute(
      'aria-selected',
      'true',
    )

    const service = screen.getByLabelText('Work Permit Visa (SR-00101)')
    expect(within(service).getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(within(service).queryByText('Current step')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Case' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Travel' })).not.toBeInTheDocument()

    const facts = screen.getByLabelText('Service details')
    expect(within(facts).getByRole('heading', { name: 'Work Permit Visa' })).toBeInTheDocument()
    expect(within(facts).getByRole('button', { name: 'Request update' })).toBeInTheDocument()
    expect(within(facts).getByText('Md. Karim Ahmed')).toBeInTheDocument()
    expect(within(facts).getByText('4 needed')).toBeInTheDocument()
    expect(
      within(facts).getByText(
        'Nurse recruitment for Al Rajhi Hospital. Medical + police clearance in progress.',
      ),
    ).toBeInTheDocument()
  })

  it('opens a row from the services table without leaving the list', () => {
    renderClient('/clients/c-284?tab=services')

    const table = screen.getByLabelText('Md. Rahim Uddin services')
    expect(screen.queryByLabelText('Air Ticket (SR-00102)')).not.toBeInTheDocument()

    fireEvent.click(within(table).getByText('SR-00102'))

    expect(screen.getByLabelText('Md. Rahim Uddin services')).toBeInTheDocument()
    expect(within(table).getByText('SR-00101')).toBeInTheDocument()
    expect(screen.getByLabelText('Air Ticket (SR-00102)')).toBeInTheDocument()
    expect(within(table).getByText('SR-00102').closest('tr')).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('opens documents from the overview facts without leaving the client page', () => {
    renderClient('/clients/c-284/services/case-101')

    const service = screen.getByLabelText('Work Permit Visa (SR-00101)')
    const facts = screen.getByLabelText('Service details')
    fireEvent.click(within(facts).getByRole('button', { name: /needed/i }))
    expect(within(service).getByRole('tab', { name: 'Documents' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByLabelText('Document checklist')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Md. Rahim Uddin' })).toBeInTheDocument()
    expect(screen.getByLabelText('Md. Rahim Uddin services')).toBeInTheDocument()
  })
})

describe('client documents tab', () => {
  it('shows identity once and service papers grouped by file', () => {
    renderClient('/clients/c-284?tab=documents')

    expect(screen.getByRole('tab', { name: 'Documents' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    const identity = screen.getByLabelText('Identity')
    expect(within(identity).getByText('Passport')).toBeInTheDocument()
    expect(within(identity).getByText('A12345678')).toBeInTheDocument()
    expect(within(identity).getByText('National ID')).toBeInTheDocument()
    expect(within(identity).getByText('1990123456789')).toBeInTheDocument()

    const workPermitTrigger = screen.getByRole('button', {
      name: 'Work Permit Visa',
    })
    if (workPermitTrigger.getAttribute('aria-expanded') !== 'true') {
      fireEvent.click(workPermitTrigger)
    }

    const workPermit = screen.getByLabelText('Work Permit Visa papers')
    expect(within(workPermit).getByText('Medical Fitness Report')).toBeInTheDocument()
    expect(within(workPermit).getByText('Demand Letter')).toBeInTheDocument()
    expect(
      within(workPermit).queryByText('Machine Readable Passport'),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Air Ticket' })).toBeInTheDocument()
    expect(screen.queryByText(/SR-00101/)).not.toBeInTheDocument()
  })

  it('opens the same document drawer for passport as for service papers', () => {
    renderClient('/clients/c-284?tab=documents')

    const identity = screen.getByLabelText('Identity')
    fireEvent.click(within(identity).getAllByRole('button', { name: 'View' })[0])

    const drawer = screen.getByRole('dialog', { name: 'Passport' })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Edit' }))

    expect(within(drawer).getByLabelText('Passport number')).toHaveValue(
      'A12345678',
    )
    expect(within(drawer).getByLabelText('Expiry date')).toHaveValue('2030-06-15')
    expect(within(drawer).getByText('Scan / file')).toBeInTheDocument()
  })
})
