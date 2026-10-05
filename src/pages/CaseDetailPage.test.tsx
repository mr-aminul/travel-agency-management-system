import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { TENANT_IDS } from '@/types/tenant'
import ClientDetailPage from '@/pages/ClientDetailPage'
import CaseDetailPage from '@/pages/CaseDetailPage'

afterEach(() => {
  cleanup()
  clearSession()
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
      within(screen.getByLabelText('Client profile')).getByRole('button', {
        name: 'Add service',
      }),
    )

    expect(
      screen.getByRole('dialog', { name: 'Add service' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Service')).toBeInTheDocument()
    expect(screen.getByLabelText('Country')).toBeInTheDocument()
  })

  it('shows client profile contact details and snapshot', () => {
    renderClient('/clients/c-284')

    const profile = screen.getByLabelText('Client profile')
    expect(within(profile).getByText('01712345678')).toBeInTheDocument()
    expect(within(profile).getByText('rahim.uddin@email.com')).toBeInTheDocument()
    expect(
      within(profile).getByRole('link', { name: 'rahim.uddin@email.com' }),
    ).toHaveAttribute('href', 'mailto:rahim.uddin@email.com')
    expect(
      within(profile).getByRole('button', { name: 'Copy email address' }),
    ).toBeInTheDocument()
    expect(within(profile).getByText('A12345678')).toBeInTheDocument()
    expect(
      within(profile).getByRole('button', { name: 'Copy passport number' }),
    ).toBeInTheDocument()
    expect(within(profile).getByLabelText('Call Md. Rahim Uddin')).toHaveAttribute(
      'href',
      'tel:01712345678',
    )
    expect(within(profile).getByText('Services')).toBeInTheDocument()
    expect(within(profile).getByText('Due balance')).toBeInTheDocument()
    expect(within(profile).getByText('৳ 45,000')).toBeInTheDocument()
  })

  it('opens services from the profile snapshot', () => {
    renderClient('/clients/c-284')

    fireEvent.click(
      within(screen.getByLabelText('Snapshot')).getByRole('button', {
        name: /services/i,
      }),
    )

    expect(screen.getByRole('tab', { name: 'Services' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByLabelText('Md. Rahim Uddin services')).toBeInTheDocument()
  })

  it('opens collect-payment in a side drawer from the payments banner', () => {
    renderClient('/clients/c-284?tab=payments')

    expect(
      screen.getByRole('heading', { name: /Payment History/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/Collect this amount to clear/i),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Payment history stays below/i),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Collect payment' }))

    expect(
      screen.getByRole('dialog', { name: 'Collect payment' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Amount (৳)')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Save payment' }),
    ).toBeInTheDocument()
  })
})

describe('service detail', () => {
  it('opens the selected file in a workspace beside the list', () => {
    renderClient('/clients/c-284/services/case-101')

    expect(screen.getByRole('heading', { name: 'Md. Rahim Uddin' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Add service' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('tab', { name: 'Services' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    const files = screen.getByLabelText('Md. Rahim Uddin services')
    expect(within(files).getByRole('link', { name: 'Work Permit Visa, SR-00101' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(files).getByRole('link', { name: 'Air Ticket, SR-00102' })).toBeInTheDocument()
    expect(within(files).queryByRole('columnheader')).not.toBeInTheDocument()

    const service = screen.getByLabelText('Work Permit Visa (SR-00101)')
    expect(within(service).getByRole('heading', { name: 'Work Permit Visa' })).toBeInTheDocument()
    expect(within(service).getByText('In-Progress')).toBeInTheDocument()
    expect(within(service).queryByRole('tablist')).not.toBeInTheDocument()
    expect(within(service).queryByRole('tab', { name: 'Documents' })).not.toBeInTheDocument()
    expect(within(service).queryByRole('tab', { name: 'Payments' })).not.toBeInTheDocument()
    expect(within(service).queryByRole('tab', { name: 'Messages' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Case' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Travel' })).not.toBeInTheDocument()

    const facts = screen.getByLabelText('Service details')
    expect(within(facts).getByText('Destination')).toBeInTheDocument()
    expect(within(facts).getByText('Riyadh, Saudi Arabia')).toBeInTheDocument()
    expect(within(facts).getByText('Departure')).toBeInTheDocument()
    expect(within(facts).getByText('15-Sep-2026')).toBeInTheDocument()
    expect(within(facts).getByText('Current step')).toBeInTheDocument()
    expect(within(facts).getByText('Medical')).toBeInTheDocument()
    expect(within(facts).getByText('Service fee')).toBeInTheDocument()
    expect(within(facts).getByText('Balance due')).toBeInTheDocument()
    expect(within(service).getByLabelText('Pipeline')).toBeInTheDocument()
    expect(within(service).getByRole('heading', { name: 'Pipeline' })).toBeInTheDocument()
    expect(within(service).getByRole('button', { name: 'Request update' })).toBeInTheDocument()
    expect(within(facts).getByText('Md. Karim Ahmed')).toBeInTheDocument()
    expect(within(facts).getByText('1 needed')).toBeInTheDocument()
    expect(
      within(facts).getByText(
        'Nurse recruitment for Al Rajhi Hospital. Medical + police clearance in progress.',
      ),
    ).toBeInTheDocument()
  })

  it('opens the first file when landing on Services, then switches files from the list', () => {
    renderClient('/clients/c-284?tab=services')

    const files = screen.getByLabelText('Md. Rahim Uddin services')
    expect(screen.getByLabelText('Work Permit Visa (SR-00101)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Air Ticket (SR-00102)')).not.toBeInTheDocument()

    fireEvent.click(within(files).getByRole('link', { name: 'Air Ticket, SR-00102' }))

    expect(screen.getByLabelText('Md. Rahim Uddin services')).toBeInTheDocument()
    expect(screen.getByLabelText('Air Ticket (SR-00102)')).toBeInTheDocument()
    expect(
      within(files).getByRole('link', { name: 'Air Ticket, SR-00102' }),
    ).toHaveAttribute('aria-current', 'page')
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
