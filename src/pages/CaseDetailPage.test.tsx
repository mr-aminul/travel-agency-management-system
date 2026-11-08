import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { resetClientActionItems } from '@/lib/clientActionItemsStore'
import { TENANT_IDS } from '@/types/tenant'
import ClientDetailPage from '@/pages/ClientDetailPage'
import CaseDetailPage from '@/pages/CaseDetailPage'
import { clientTrackingUrl } from '@/lib/publicUrl'

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
})

afterEach(() => {
  cleanup()
  clearSession()
  resetClientActionItems()
})

function renderClient(path: string) {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.demo,
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
        name: 'Add Service',
      }),
    )

    expect(
      screen.getByRole('dialog', { name: 'Add Service' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Service')).toBeInTheDocument()
    expect(screen.getByLabelText('Country')).toBeInTheDocument()
  })

  it('shows a compact client header', () => {
    renderClient('/clients/c-284')

    const profile = screen.getByLabelText('Client profile')
    expect(within(profile).getByText('01712345678')).toBeInTheDocument()
    expect(
      within(profile).queryByRole('link', { name: '01712345678' }),
    ).not.toBeInTheDocument()
    expect(
      within(profile).getByRole('button', { name: 'Copy Phone Number' }),
    ).toBeInTheDocument()
    expect(within(profile).getByText('মোঃ রহিম উদ্দিন')).toBeInTheDocument()
    expect(within(profile).queryByText('rahim.uddin@email.com')).not.toBeInTheDocument()
    expect(within(profile).queryByText('A12345678')).not.toBeInTheDocument()
    expect(within(profile).getByLabelText('Call Md. Rahim Uddin')).toHaveAttribute(
      'href',
      'tel:01712345678',
    )
    expect(within(profile).queryByText('Due Balance')).not.toBeInTheDocument()
    expect(within(profile).queryByLabelText('Missing details')).not.toBeInTheDocument()
    expect(
      within(profile).getByRole('button', { name: /Edit Profile/i }),
    ).toBeInTheDocument()

    const tabs = screen.getByRole('tablist', { name: 'Client sections' })
    expect(within(tabs).getByRole('tab', { name: /Profile/i })).toBeInTheDocument()
    expect(within(tabs).queryByRole('tab', { name: 'Email' })).not.toBeInTheDocument()
    expect(within(tabs).getByRole('tab', { name: 'Messages' })).toBeInTheDocument()
  })

  it('lets staff add notes on overview', () => {
    renderClient('/clients/c-284')

    const notes = screen.getByLabelText('Notes')
    expect(within(notes).getByText('Notes')).toBeInTheDocument()

    fireEvent.change(within(notes).getByLabelText('New note'), {
      target: { value: 'Collect passport copy' },
    })
    fireEvent.click(within(notes).getByRole('button', { name: 'Save' }))

    expect(within(notes).getByText('Collect passport copy')).toBeInTheDocument()
    expect(
      within(notes).queryByRole('checkbox', { name: 'Collect passport copy' }),
    ).not.toBeInTheDocument()
    expect(within(notes).getByText(DEMO_USER.name)).toBeInTheDocument()
  })

  it('shows one needs-attention queue on overview', () => {
    renderClient('/clients/c-284')

    const overview = screen.getByLabelText('Md. Rahim Uddin overview')
    const attention = within(overview).getByLabelText('Needs attention')
    expect(attention).toBeInTheDocument()
    expect(within(attention).getByText('Collect Payment')).toBeInTheDocument()
    expect(within(attention).getByText('৳ 45,000')).toBeInTheDocument()
    expect(within(overview).queryByLabelText('Open services')).not.toBeInTheDocument()
  })

  it('opens payments from overview collect payment', () => {
    renderClient('/clients/c-284')

    fireEvent.click(
      within(screen.getByLabelText('Needs attention')).getByRole('button', {
        name: /Collect Payment/i,
      }),
    )

    expect(screen.getByRole('tab', { name: 'Payments' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
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

    fireEvent.click(screen.getByRole('button', { name: 'Collect Payment' }))

    expect(
      screen.getByRole('dialog', { name: 'Collect Payment' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Amount (৳)')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Save Payment' }),
    ).toBeInTheDocument()
  })
})

describe('service detail', () => {
  it('opens the selected file in a workspace with a compact service switcher', () => {
    renderClient('/clients/c-284/services/case-101')

    expect(screen.getByRole('heading', { name: 'Md. Rahim Uddin' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Add Service' }).length).toBeGreaterThan(0)
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
    expect(within(facts).getByLabelText('Country')).toHaveValue(
      'Saudi Arabia',
    )
    expect(within(facts).getByLabelText('Destination')).toHaveValue(
      'Riyadh, Saudi Arabia',
    )
    expect(within(facts).getByLabelText('Departure')).toHaveValue('15-Sep-2026')
    expect(within(facts).getByLabelText('Current step')).toHaveValue('Medical')
    expect(within(facts).getByLabelText('Service fee')).toBeInTheDocument()
    expect(within(facts).getByLabelText('Balance due')).toBeInTheDocument()
    expect(within(service).getByLabelText('Pipeline')).toBeInTheDocument()
    expect(within(service).getByText('Pipeline')).toBeInTheDocument()
    expect(within(service).getByText('Stage 5 of 9')).toBeInTheDocument()
    expect(within(service).getByText('Now')).toBeInTheDocument()
    expect(within(service).getAllByText('Upcoming').length).toBeGreaterThan(0)
    expect(
      within(service).getByRole('button', { name: 'More service actions' }),
    ).toBeInTheDocument()
    expect(within(facts).getByLabelText('Assigned to')).toHaveValue(
      'Md. Karim Ahmed',
    )
    expect(within(facts).getByLabelText('Documents')).toHaveValue('1 needed')
    expect(
      within(service).getByRole('button', {
        name: /Blocked/i,
      }),
    ).toBeInTheDocument()
    expect(within(facts).getByLabelText('Notes')).toHaveValue(
      'Nurse recruitment for Al Rajhi Hospital. Medical + police clearance in progress.',
    )
    expect(within(facts).queryByLabelText('Status')).not.toBeInTheDocument()
    expect(within(facts).queryByLabelText('Opened')).not.toBeInTheDocument()
    expect(within(facts).queryByLabelText('Updated')).not.toBeInTheDocument()
  })

  it('keeps the same detail fields when editing', () => {
    renderClient('/clients/c-284/services/case-101')

    const service = screen.getByLabelText('Work Permit Visa (SR-00101)')
    fireEvent.click(within(service).getByRole('button', { name: 'Edit' }))

    const facts = screen.getByLabelText('Service details')
    const labels = [
      'Country',
      'City / destination',
      'Departure',
      'Current step',
      'Assigned to',
      'Service fee',
      'Balance due',
      'Documents',
      'Status',
      'Notes',
    ]
    for (const label of labels) {
      expect(within(facts).getByLabelText(label)).toBeInTheDocument()
    }
    expect(within(service).getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(
      within(service).getByRole('button', { name: 'Cancel' }),
    ).toBeInTheDocument()
  })

  it('copies the public tracking URL from more actions', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    renderClient('/clients/c-284/services/case-101')

    const service = screen.getByLabelText('Work Permit Visa (SR-00101)')
    const more = within(service).getByRole('button', {
      name: 'More service actions',
    })
    more.focus()
    fireEvent.keyDown(more, { key: 'Enter' })
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Copy Tracking Link' }),
    )

    expect(writeText).toHaveBeenCalledWith(clientTrackingUrl('A12345678'))
  })

  it('opens documents from the blocked service board ribbon', () => {
    renderClient('/clients/c-284/services/case-101')

    const service = screen.getByLabelText('Work Permit Visa (SR-00101)')
    fireEvent.click(within(service).getByRole('button', { name: /Blocked/i }))

    expect(screen.getByRole('tab', { name: 'Documents' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByLabelText('Md. Rahim Uddin documents')).toBeInTheDocument()
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
  it('nests papers under each group and opens a document in the workspace', () => {
    renderClient('/clients/c-284?tab=documents')

    expect(screen.getByRole('tab', { name: 'Documents' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    const files = screen.getByLabelText('Md. Rahim Uddin documents')
    expect(
      within(files).getByRole('button', { name: 'Collapse Identity' }),
    ).toHaveAttribute('aria-expanded', 'true')
    expect(
      within(files).getByRole('button', { name: 'Collapse Work Permit Visa' }),
    ).toHaveAttribute('aria-expanded', 'true')

    const identity = within(files).getByRole('group', { name: 'Identity' })
    expect(within(identity).getByRole('button', { name: 'Passport' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(identity).getByRole('button', { name: 'National ID' })).toBeInTheDocument()

    const passport = screen.getByLabelText('Passport')
    expect(within(passport).getByRole('heading', { name: 'Passport' })).toBeInTheDocument()
    expect(within(passport).getByLabelText('Passport number')).toHaveValue('A12345678')
    expect(within(passport).getByLabelText('Date of expiry')).toHaveValue('2030-06-15')
    expect(screen.queryByRole('dialog', { name: 'Passport' })).not.toBeInTheDocument()

    const workPermit = within(files).getByRole('group', { name: 'Work Permit Visa' })
    expect(within(workPermit).getByRole('button', { name: 'Medical Fitness Report' })).toBeInTheDocument()
    expect(within(workPermit).getByRole('button', { name: 'Demand Letter' })).toBeInTheDocument()
    expect(
      within(workPermit).queryByText('Machine Readable Passport'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/SR-00101/)).not.toBeInTheDocument()

    fireEvent.click(
      within(workPermit).getByRole('button', { name: 'Medical Fitness Report' }),
    )
    expect(
      within(workPermit).getByRole('button', { name: 'Medical Fitness Report' }),
    ).toHaveAttribute('aria-current', 'page')
    expect(
      screen.getByRole('heading', { name: 'Medical Fitness Report' }),
    ).toBeInTheDocument()
  })

  it('edits passport fields in the document workspace', () => {
    renderClient('/clients/c-284?tab=documents')

    const passport = screen.getByLabelText('Passport')
    expect(within(passport).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(within(passport).queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(within(passport).getByLabelText('Passport number')).toHaveValue(
      'A12345678',
    )
    expect(within(passport).getByLabelText('Date of expiry')).toHaveValue('2030-06-15')
    expect(within(passport).getByRole('button', { name: 'Browse File' })).toBeInTheDocument()
    expect(
      within(passport).getByText('Choose a file or drag & drop it here.'),
    ).toBeInTheDocument()

    fireEvent.change(within(passport).getByLabelText('Passport number'), {
      target: { value: 'B99998888' },
    })
    expect(within(passport).getByRole('button', { name: 'Save' })).toBeInTheDocument()

    fireEvent.click(within(passport).getByRole('button', { name: 'Discard Changes' }))
    expect(within(passport).getByLabelText('Passport number')).toHaveValue(
      'A12345678',
    )
    expect(within(passport).queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })
})

describe('client profile editor', () => {
  it('shows bangla name right after full name', () => {
    renderClient('/clients/c-284?tab=profile')

    expect(screen.getByLabelText('Client profile editor')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Profile/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    const profile = screen.getByLabelText('Client profile editor')
    expect(within(profile).getByText('Full Name')).toBeInTheDocument()
    expect(within(profile).getByText('Md. Rahim Uddin')).toBeInTheDocument()
    expect(within(profile).getByText('Bangla Name')).toBeInTheDocument()
    expect(within(profile).getByText('মোঃ রহিম উদ্দিন')).toBeInTheDocument()
  })

  it('shows bangla name on a client who only had an english name before', () => {
    renderClient('/clients/c-291?tab=profile')

    const profile = screen.getByLabelText('Client profile editor')
    expect(within(profile).getByText('Farhana Akter')).toBeInTheDocument()
    expect(within(profile).getByText('ফারহানা আক্তার')).toBeInTheDocument()
  })

  it('opens profile from edit profile as a main tab', () => {
    renderClient('/clients/c-284')

    fireEvent.click(
      within(screen.getByLabelText('Client profile')).getByRole('button', {
        name: /Edit Profile/i,
      }),
    )
    expect(screen.getByLabelText('Client profile editor')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Profile/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }))
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('shows profile sections like services and edits on demand', () => {
    renderClient('/clients/c-284?tab=profile')

    const profile = screen.getByLabelText('Client profile editor')
    const sections = within(profile).getByLabelText('Profile sections')
    expect(
      within(sections).getByRole('button', { name: 'Contact' }),
    ).toBeInTheDocument()
    expect(
      within(sections).getByRole('button', { name: 'Identity' }),
    ).toBeInTheDocument()
    expect(within(profile).getByText('Full Name')).toBeInTheDocument()
    expect(within(profile).getByText('Present Address')).toBeInTheDocument()

    fireEvent.click(within(sections).getByRole('button', { name: 'Identity' }))
    expect(within(profile).getByText('Passport')).toBeInTheDocument()
    expect(within(profile).getByText('National ID')).toBeInTheDocument()
    expect(within(profile).getByText('Date of Birth')).toBeInTheDocument()

    fireEvent.click(within(sections).getByRole('button', { name: 'Contact' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText('Full Name')).toHaveValue('Md. Rahim Uddin')
  })
})
