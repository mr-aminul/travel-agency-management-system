import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { saveAgencyProfile } from '@/lib/agencyProfile'
import { DATA_KEYS } from '@/lib/data/keys'
import { resetCustomServices } from '@/lib/customServicesStore'
import { resetClientProfileFields } from '@/lib/clientProfileFieldsStore'
import { resetDocumentFormFields } from '@/lib/documentFormFieldsStore'
import { resetHiddenServices } from '@/lib/hiddenServicesStore'
import { resetServiceIconOverrides } from '@/lib/serviceIconOverridesStore'
import { resetServiceTemplates } from '@/lib/serviceTemplatesStore'
import { resetUserPageAccess } from '@/lib/userAccessStore'
import { TENANT_IDS } from '@/types/tenant'
import SettingsPage from '@/pages/SettingsPage'

const INCOMPLETE_TENANT_ID = 'tenant-incomplete-profile'

afterEach(() => {
  cleanup()
  clearSession()
  localStorage.removeItem(DATA_KEYS.agencyProfiles)
  resetCustomServices()
  resetClientProfileFields()
  resetDocumentFormFields()
  resetHiddenServices()
  resetServiceIconOverrides()
  resetServiceTemplates()
  resetUserPageAccess()
})

function renderSettings(path: string, tenantId = TENANT_IDS.full) {
  writeSession({
    user: DEMO_USER,
    tenantId,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
          <Route
            path="/settings/services/:serviceKey"
            element={<SettingsPage />}
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('settings service catalog', () => {
  it('names the settings section Service catalog and lists lines', async () => {
    renderSettings('/settings?section=services')

    expect(
      await screen.findByRole('heading', { name: 'Service catalog' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Service catalog' }).closest('header'),
    ).toHaveTextContent('Add service')
    expect(
      screen.getByRole('navigation', { name: 'Settings sections' }),
    ).toHaveTextContent('Service catalog')
    expect(screen.getByRole('table', { name: 'Service catalog' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Tourist Visa' }),
    ).toHaveAttribute('href', '/settings/services/tourist-visa')
    expect(screen.queryByRole('heading', { name: 'Catalog' })).not.toBeInTheDocument()
  }, 15000)

  it('opens add-field in a right panel and creates the field', async () => {
    renderSettings('/settings?section=clientFields')

    expect(
      await screen.findByRole('heading', { name: 'Client fields' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add field' }))

    const panel = screen.getByRole('dialog', { name: 'Add field' })
    expect(panel).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Field name'), {
      target: { value: 'Profession' },
    })
    fireEvent.click(
      within(panel).getByRole('button', { name: 'Add field' }),
    )
    expect(await screen.findByText('Profession')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Client fields' })).toBeInTheDocument()
  }, 15000)

  it('sets document fields beside the document in the service checklist', async () => {
    renderSettings('/settings/services/tourist-visa')

    expect(
      await screen.findByRole('button', { name: 'Save checklist' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: /set fields for machine readable passport/i,
      }),
    )
    expect(screen.getByText('Fields to fill in')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Field name 1'), {
      target: { value: 'Pass no.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save checklist' }))

    expect(
      await screen.findByText(/saved\. new files without a country match/i),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Field name 1')).toHaveValue('Pass no.')
  }, 15000)

  it('adds a next-step branch from a document dropdown', async () => {
    renderSettings('/settings/services/work-permit-visa')

    expect(
      await screen.findByRole('button', { name: 'Save checklist' }),
    ).toBeInTheDocument()

    const medicalFields = screen.getByRole('button', {
      name: /set fields for medical/i,
    })
    fireEvent.click(medicalFields)
    expect(screen.getByText('Fields to fill in')).toBeInTheDocument()

    // Medical Result is already a Fit/Unfit dropdown — branch from Medical step.
    const branchButtons = screen.getAllByRole('button', { name: 'Branch' })
    expect(branchButtons.length).toBeGreaterThan(0)
    fireEvent.click(branchButtons[0])
    expect(screen.getByLabelText('Branch field 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Branch value 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Branch next step 1')).toBeInTheDocument()
  }, 15000)

  it('puts the business name beside the profile photo', async () => {
    renderSettings('/settings?section=business')

    expect(
      await screen.findByRole('heading', { name: 'Business profile' }),
    ).toBeInTheDocument()
    const settingsNav = screen.getByRole('navigation', {
      name: 'Settings sections',
    })
    expect(settingsNav).not.toHaveTextContent('How OneTrack works')
    expect(settingsNav).not.toHaveTextContent('About')
    expect(
      screen.getByRole('button', { name: 'Upload photo' }),
    ).toBeInTheDocument()
    const nameField = screen.getByLabelText('Business name')
    expect(nameField.closest('.pd-profile-photo__name')).not.toBeNull()
  }, 15000)

  it('badges Business profile and marks required fields when incomplete', async () => {
    saveAgencyProfile(
      {
        businessName: 'River Tours',
        address: '',
        mobile: '',
        website: '',
        profilePicture: null,
      },
      INCOMPLETE_TENANT_ID,
    )
    renderSettings('/settings?section=business', INCOMPLETE_TENANT_ID)

    expect(
      await screen.findByRole('heading', { name: 'Business profile' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Business profile, 1 needing attention',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('Address').closest('.pd-settings-form__field'),
    ).toHaveClass('is-attention')
    expect(
      screen.getByLabelText('Mobile number').closest('.pd-settings-form__field'),
    ).toHaveClass('is-attention')
    expect(
      screen.getByLabelText('Business name').closest('.pd-settings-form__field'),
    ).not.toHaveClass('is-attention')
  }, 15000)

  it('can leave Sub-agent access for Service catalog and User access', async () => {
    renderSettings('/settings?section=subAgentAccess')

    expect(
      await screen.findByRole('heading', { name: 'Sub-agent access' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Service catalog' }))
    expect(
      await screen.findByRole('heading', { name: 'Service catalog' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'User-wise Access Management' }),
    )
    expect(
      await screen.findByRole('heading', {
        name: 'User-wise Access Management',
      }),
    ).toBeInTheDocument()
  }, 15000)

  it('writes the section into the URL', async () => {
    renderSettings('/settings')

    fireEvent.click(
      await screen.findByRole('button', { name: 'Appearance' }),
    )
    expect(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Light' })).toBeInTheDocument()
  }, 15000)

  it('lists agency users with parent-prefixed page columns', async () => {
    renderSettings('/settings?section=userAccess')

    expect(
      await screen.findByRole('heading', {
        name: 'User-wise Access Management',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Settings sections' }),
    ).toHaveTextContent('User-wise Access Management')
    expect(
      screen.queryByRole('button', { name: 'Employees' }),
    ).not.toBeInTheDocument()

    const table = screen.getByRole('table', {
      name: 'User-wise Access Management',
    })
    expect(table).toHaveTextContent('HR - Employees')
    expect(table).toHaveTextContent('HR - Attendance & Leave')
    expect(table).toHaveTextContent('HR - Payroll')
    expect(table).toHaveTextContent('User')
    expect(table).toHaveTextContent('OneTrack Agency')
    expect(table).toHaveTextContent('Owner · ops@onetrack.bd')
    expect(
      screen.getByRole('button', {
        name: 'HR - Payroll access for OneTrack Agency',
      }),
    ).toBeInTheDocument()
  }, 15000)

  it('opens add-service in a right panel and creates the line', async () => {
    renderSettings('/settings?section=services')

    fireEvent.click(await screen.findByRole('button', { name: 'Add service' }))

    const panel = screen.getByRole('dialog', { name: 'Add service' })
    expect(panel).toBeInTheDocument()
    expect(
      within(panel).getByRole('listbox', { name: 'Service icons' }),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Service name'), {
      target: { value: 'Visa processing' },
    })
    fireEvent.click(within(panel).getByRole('option', { name: 'Visa' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Create and edit checklist' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Visa processing' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save checklist' })).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Change icon for Visa processing',
      }),
    )
    expect(
      screen.getByRole('option', { name: 'Visa' }),
    ).toHaveAttribute('aria-selected', 'true')
  }, 15000)

  it('keeps focus in the service name field while typing', async () => {
    renderSettings('/settings?section=services')

    fireEvent.click(await screen.findByRole('button', { name: 'Add service' }))

    const nameField = screen.getByLabelText('Service name')
    nameField.focus()
    expect(nameField).toHaveFocus()

    fireEvent.change(nameField, { target: { value: 'V' } })
    expect(nameField).toHaveFocus()

    fireEvent.change(nameField, { target: { value: 'Visa' } })
    expect(nameField).toHaveFocus()
    expect(nameField).toHaveValue('Visa')
  }, 15000)

  it('opens a catalog row in a full-panel editor', async () => {
    renderSettings('/settings?section=services')

    fireEvent.click(await screen.findByRole('link', { name: 'Tourist Visa' }))

    expect(
      await screen.findByRole('heading', { name: 'Tourist Visa' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to Catalog' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save checklist' })).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Service catalog' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('listbox', { name: 'Service icons' }),
    ).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Change icon for Tourist Visa' }),
    )
    expect(
      screen.getByRole('listbox', { name: 'Service icons' }),
    ).toBeInTheDocument()
  }, 15000)
})
