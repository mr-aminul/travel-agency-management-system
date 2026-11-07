import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { TENANT_IDS } from '@/types/tenant'
import EmployeeDetailPage from '@/pages/EmployeeDetailPage'

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
})

function renderEmployee(path: string) {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.demo,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/hr/employees/:id" element={<EmployeeDetailPage />} />
          <Route path="/hr/employees" element={<p>Employees list</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('employee profile', () => {
  it('shows read-only left card and editable Profile tab first', async () => {
    renderEmployee('/hr/employees/EMP-7001')

    const profile = screen.getByLabelText('Employee profile')
    expect(
      within(profile).getByRole('heading', { name: 'Md. Karim Ahmed' }),
    ).toBeInTheDocument()
    expect(within(profile).getByText('01711234567')).toBeInTheDocument()
    expect(within(profile).getByText('karim@abctravel.demo')).toBeInTheDocument()
    expect(within(profile).queryByLabelText('Full Name')).not.toBeInTheDocument()
    expect(
      within(profile).getByRole('button', { name: 'Delete' }),
    ).toBeInTheDocument()

    const workspace = screen.getByLabelText('Employee workspace')
    expect(
      within(workspace).getByRole('tab', { name: 'Profile' }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(
      within(workspace).getByRole('tab', { name: 'Attendance' }),
    ).toBeInTheDocument()
    expect(
      within(workspace).getByRole('tab', { name: 'Leave' }),
    ).toBeInTheDocument()
    expect(
      within(workspace).getByRole('tab', { name: 'Payroll' }),
    ).toBeInTheDocument()

    // Profile fields mount with the active tabpanel; wait for label↔input wiring.
    expect(
      await within(workspace).findByLabelText('Full Name', {}, { timeout: 3000 }),
    ).toHaveValue('Md. Karim Ahmed')
    expect(within(workspace).getByLabelText('Phone')).toHaveValue('01711234567')
  })

  it('opens leave recorded for this person', () => {
    renderEmployee('/hr/employees/EMP-7002?tab=leave')

    expect(screen.getByRole('tab', { name: 'Leave' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    const leave = screen.getByLabelText('Lima Chowdhury leave')
    expect(within(leave).getByText('Sick')).toBeInTheDocument()
    expect(within(leave).getByText('03-Oct-2026')).toBeInTheDocument()
    expect(within(leave).getByText('05-Oct-2026')).toBeInTheDocument()
  })

  it('shows this month’s payroll line and payslip preview', () => {
    renderEmployee('/hr/employees/EMP-7006?tab=payroll')

    fireEvent.change(screen.getByLabelText('Month'), {
      target: { value: '2026-10' },
    })

    const payroll = screen.getByLabelText('Mehnaz Sultana payroll')
    expect(within(payroll).getByText('Basic Salary')).toBeInTheDocument()
    expect(within(payroll).getByText('৳30,000')).toBeInTheDocument()
    expect(within(payroll).getByText('Unpaid Days')).toBeInTheDocument()
    expect(within(payroll).getByText('2')).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: 'Download PDF' }),
    ).toBeInTheDocument()
    const preview = screen.getByLabelText('Payslip preview')
    expect(within(preview).getByText('Payslip')).toBeInTheDocument()
    expect(within(preview).getByText('Mehnaz Sultana')).toBeInTheDocument()
  })

  it('returns to the employees list when the person is missing', () => {
    renderEmployee('/hr/employees/EMP-missing')
    expect(screen.getByText('Employees list')).toBeInTheDocument()
  })
})
