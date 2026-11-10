import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { resetClientActionItems } from '@/lib/clientActionItemsStore'
import { TENANT_IDS } from '@/types/tenant'
import { clientTrackingUrl } from '@/lib/publicUrl'

vi.mock('@/components/cases/PdfPreview', () => ({
  PdfPreview: ({ name, url }: { name: string; url: string }) => (
    <div role="img" aria-label={name} title={name} data-preview-url={url} />
  ),
}))

import ClientDetailPage from '@/pages/ClientDetailPage'
import CaseDetailPage from '@/pages/CaseDetailPage'

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() { }
      unobserve() { }
      disconnect() { }
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
  it('opens add-service inline on the services tab', () => {
    renderClient('/clients/c-284')

    fireEvent.click(screen.getByRole('tab', { name: 'Services' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add Service' }))

    expect(screen.getByRole('tab', { name: 'Services' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(
      screen.getByLabelText('Add service for Md. Rahim Uddin'),
    ).toBeInTheDocument()
    expect(screen.getByText('Service')).toBeInTheDocument()
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
    expect(
      within(profile).getByText('rahim.uddin@email.com'),
    ).toBeInTheDocument()
    expect(within(profile).getByText('A12345678')).toBeInTheDocument()
    expect(within(profile).getByLabelText('Call Md. Rahim Uddin')).toHaveAttribute(
      'href',
      'tel:01712345678',
    )
    expect(within(profile).getByLabelText('Identity')).toBeInTheDocument()
    expect(within(profile).getByRole('button', { name: /Passport/i })).toBeInTheDocument()
    expect(
      within(profile).getByRole('button', { name: /National ID/i }),
    ).toBeInTheDocument()
    expect(
      within(profile).getByRole('button', { name: 'More client actions' }),
    ).toBeInTheDocument()

    const tabs = screen.getByRole('tablist', { name: 'Client sections' })
    expect(within(tabs).getByRole('tab', { name: /Profile/i })).toBeInTheDocument()
    expect(within(tabs).queryByRole('tab', { name: 'Email' })).not.toBeInTheDocument()
    expect(within(tabs).queryByRole('tab', { name: 'Messages' })).not.toBeInTheDocument()
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
  it('stacks every service file on the Services tab', () => {
    renderClient('/clients/c-284/services/case-101')

    expect(screen.getByRole('heading', { name: 'Md. Rahim Uddin' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Services' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(
      screen.queryByRole('button', { name: 'Expand Identity' }),
    ).not.toBeInTheDocument()

    const work = screen.getByLabelText('Work Permit Visa (SR-00101)')
    const ticket = screen.getByLabelText('Air Ticket (SR-00102)')
    expect(within(work).getByRole('heading', { name: 'Work Permit Visa' })).toBeInTheDocument()
    expect(within(ticket).getByRole('heading', { name: 'Air Ticket' })).toBeInTheDocument()
    expect(within(work).getByText('In-Progress')).toBeInTheDocument()
    expect(within(work).queryByRole('tablist')).not.toBeInTheDocument()
    expect(within(work).queryByLabelText('Service documents')).not.toBeInTheDocument()

    expect(within(work).queryByText('SR-00101')).not.toBeInTheDocument()
    expect(
      within(work).getByLabelText('Steps').textContent,
    ).toMatch(/Medical/)
    expect(within(work).getByLabelText('Documents')).toBeInTheDocument()
    expect(
      within(work).getByRole('button', { name: 'More service actions' }),
    ).toBeInTheDocument()
    expect(
      within(work).getByRole('button', {
        name: /Blocked/i,
      }),
    ).toBeInTheDocument()
  })

  it('edits service details while the stage tree stays visible', () => {
    renderClient('/clients/c-284/services/case-101')

    const service = screen.getByLabelText('Work Permit Visa (SR-00101)')
    fireEvent.click(within(service).getByRole('button', { name: 'Edit' }))

    const details = within(service).getByLabelText('Service details')
    expect(within(details).getByLabelText('Status')).toBeInTheDocument()
    expect(within(details).getByLabelText('Country')).toBeInTheDocument()
    expect(within(details).getByLabelText('City / destination')).toBeInTheDocument()
    expect(within(details).getByLabelText('Assigned to')).toBeInTheDocument()
    expect(within(details).getByLabelText('Departure')).toBeInTheDocument()
    expect(within(details).getByLabelText('Notes')).toBeInTheDocument()
    expect(within(details).getByLabelText('Service fee')).toBeInTheDocument()
    expect(within(service).getByLabelText('Steps')).toBeInTheDocument()
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

  it('shows documents beside journey and opens a selected paper', () => {
    renderClient('/clients/c-284/services/case-101')

    const service = screen.getByLabelText('Work Permit Visa (SR-00101)')
    const documents = within(service).getByLabelText('Documents')
    const journey = within(service).getByLabelText('Steps')

    expect(within(journey).getByText('Medical')).toBeInTheDocument()
    expect(
      within(journey).getByRole('button', { name: 'Mark complete' }),
    ).toBeInTheDocument()
    expect(
      within(journey).getByRole('button', { name: /Medical Fitness Report/i }),
    ).toBeInTheDocument()
    expect(
      within(documents).getByRole('button', { name: 'Medical Fitness Report' }),
    ).toBeInTheDocument()

    fireEvent.click(
      within(documents).getByRole('button', { name: 'Medical Fitness Report' }),
    )
    const paperSheet = screen.getByRole('dialog', {
      name: 'Medical Fitness Report',
    })
    expect(paperSheet).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    fireEvent.click(within(service).getByRole('button', { name: /Blocked/i }))
    expect(
      screen.getByRole('dialog', { name: 'Demand Letter' }),
    ).toBeInTheDocument()
  })

  it('shows every service card when landing on Services', () => {
    renderClient('/clients/c-284?tab=services')

    const files = screen.getByLabelText('Md. Rahim Uddin services')
    expect(
      within(files).getByRole('button', { name: 'Add Service' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Work Permit Visa (SR-00101)')).toBeInTheDocument()
    expect(screen.getByLabelText('Air Ticket (SR-00102)')).toBeInTheDocument()
  })
})

describe('client identity documents', () => {
  it('opens the passport in a right sheet over Profile', () => {
    renderClient('/clients/c-284?tab=profile&focus=passport')

    const sheet = screen.getByRole('dialog', { name: 'Passport' })
    expect(
      screen.getByRole('tab', { name: /Profile/i, hidden: true }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByLabelText('Client profile editor', { hidden: true }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Documents' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Collapse Identity', hidden: true }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'Work Permit Visa, SR-00101',
        hidden: true,
      }),
    ).not.toBeInTheDocument()

    const passport = within(sheet).getByLabelText('Passport')
    expect(within(passport).queryByRole('heading', { name: 'Passport' })).not.toBeInTheDocument()
    expect(within(passport).getByLabelText('Passport number')).toHaveValue('A12345678')
    expect(within(passport).getByLabelText('Date of expiry')).toHaveValue('2030-06-15')
    expect(within(sheet).queryByText(/SR-00101/)).not.toBeInTheDocument()
  })

  it('edits passport fields in the document workspace', () => {
    renderClient('/clients/c-284?tab=profile&focus=passport')

    const sheet = screen.getByRole('dialog', { name: 'Passport' })
    const passport = within(sheet).getByLabelText('Passport')
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

  it('opens passport on Services without leaving the tab', async () => {
    renderClient('/clients/c-284?tab=services&focus=passport')

    expect(
      await screen.findByRole('dialog', { name: 'Passport' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: /Services/i, hidden: true }),
    ).toHaveAttribute('aria-selected', 'true')
  })

  it('opens passport from a service file while staying on the service', async () => {
    renderClient('/clients/c-284/services/case-101?focus=passport')

    expect(
      await screen.findByRole('dialog', { name: 'Passport' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: /Services/i, hidden: true }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByLabelText('Work Permit Visa (SR-00101)', { hidden: true }),
    ).toBeInTheDocument()
  })

  it('redirects the legacy documents tab into Services', () => {
    renderClient('/clients/c-284?tab=documents')

    expect(screen.getByRole('tab', { name: 'Services' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.queryByRole('tab', { name: 'Documents' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Md. Rahim Uddin services')).toBeInTheDocument()
  })

  it('redirects legacy documents identity focus into Profile', async () => {
    renderClient('/clients/c-284?tab=documents&focus=nid')

    expect(
      await screen.findByRole('dialog', { name: 'National ID' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: /Profile/i, hidden: true }),
    ).toHaveAttribute('aria-selected', 'true')
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

  it('opens profile from edit profile as a main tab', async () => {
    renderClient('/clients/c-284')

    const aside = screen.getByLabelText('Client profile')
    fireEvent.pointerDown(
      within(aside).getByRole('button', { name: 'More client actions' }),
      {
        button: 0,
        ctrlKey: false,
      },
    )
    fireEvent.click(await screen.findByRole('menuitem', { name: /Edit Profile/i }))
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

  it('shows every profile section at once and edits on demand', () => {
    renderClient('/clients/c-284?tab=profile')

    const profile = screen.getByLabelText('Client profile editor')
    expect(within(profile).getByRole('heading', { name: 'Personal' })).toBeInTheDocument()
    expect(within(profile).getByRole('heading', { name: 'Contact' })).toBeInTheDocument()
    expect(within(profile).getByRole('heading', { name: 'Work' })).toBeInTheDocument()
    expect(within(profile).queryByRole('heading', { name: 'Placement' })).not.toBeInTheDocument()
    const personal = within(profile).getByLabelText('Personal')
    expect(within(personal).getByText('Full Name')).toBeInTheDocument()
    expect(within(personal).getByText('Date of Birth')).toBeInTheDocument()
    const contact = within(profile).getByLabelText('Contact')
    expect(within(contact).getByText('WhatsApp')).toBeInTheDocument()
    expect(within(contact).getByText('Present Address')).toBeInTheDocument()
    expect(within(profile).queryByText('Address')).not.toBeInTheDocument()
    expect(within(profile).getByText('Profession')).toBeInTheDocument()
    expect(within(profile).getByText('Education')).toBeInTheDocument()
    expect(within(profile).queryByText('Preferred Country')).not.toBeInTheDocument()
    expect(within(profile).queryByText('Skill / Trade')).not.toBeInTheDocument()
    expect(within(profile).queryByText('Branch')).not.toBeInTheDocument()
    expect(within(profile).queryByText('Sub Agent')).not.toBeInTheDocument()
    expect(within(profile).queryByText('Passport')).not.toBeInTheDocument()
    expect(within(profile).queryByText('National ID')).not.toBeInTheDocument()

    fireEvent.click(within(profile).getByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText('Full Name')).toHaveValue('Md. Rahim Uddin')
  })
})
