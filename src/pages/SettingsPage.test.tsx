import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { resetCustomServices } from '@/lib/customServicesStore'
import { resetClientProfileFields } from '@/lib/clientProfileFieldsStore'
import { resetHiddenServices } from '@/lib/hiddenServicesStore'
import { resetServiceIconOverrides } from '@/lib/serviceIconOverridesStore'
import { resetServiceTemplates } from '@/lib/serviceTemplatesStore'
import { resetUserPageAccess } from '@/lib/userAccessStore'
import { TENANT_IDS } from '@/types/tenant'
import SettingsPage from '@/pages/SettingsPage'

afterEach(() => {
  cleanup()
  clearSession()
  resetCustomServices()
  resetClientProfileFields()
  resetHiddenServices()
  resetServiceIconOverrides()
  resetServiceTemplates()
  resetUserPageAccess()
})

function renderSettings(path: string) {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.full,
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

  it('writes the section into the URL', async () => {
    renderSettings('/settings')

    fireEvent.click(
      await screen.findByRole('button', { name: 'Appearance' }),
    )
    expect(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Light' })).toBeInTheDocument()
  }, 15000)

  it('lists employees with parent-prefixed page columns', async () => {
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
    expect(table).toHaveTextContent('Employee')
    expect(table).toHaveTextContent('Md. Karim Ahmed')
    expect(table).toHaveTextContent('Recruitment Manager, Recruitment')
    expect(
      screen.getByRole('button', {
        name: 'HR - Payroll access for Md. Karim Ahmed',
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
    expect(screen.getByRole('option', { name: 'Visa' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
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
  }, 15000)
})
