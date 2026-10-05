import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { TENANT_IDS } from '@/types/tenant'
import EmployeeDetailPage from '@/pages/EmployeeDetailPage'

afterEach(() => {
  cleanup()
  clearSession()
})

function renderEmployee(path: string) {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.full,
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
  it('shows identity and Attendance, Leave, and Payroll sections', () => {
    renderEmployee('/hr/employees/EMP-7001')

    const header = screen.getByRole('banner')
    expect(within(header).getByRole('heading', { name: 'Md. Karim Ahmed' })).toBeInTheDocument()
    expect(within(header).getByText('01711234567')).toBeInTheDocument()
    expect(within(header).getByText('Recruitment Manager · Recruitment')).toBeInTheDocument()

    expect(screen.getByRole('tab', { name: 'Attendance' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Leave' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Payroll' })).toBeInTheDocument()

    const attendance = screen.getByLabelText('Md. Karim Ahmed attendance')
    expect(within(attendance).getByText('Present')).toBeInTheDocument()
    expect(within(attendance).getByText('Late')).toBeInTheDocument()
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

  it('shows this month’s payroll line', () => {
    renderEmployee('/hr/employees/EMP-7006?tab=payroll')

    fireEvent.change(screen.getByLabelText('Month'), {
      target: { value: '2026-10' },
    })

    const payroll = screen.getByLabelText('Mehnaz Sultana payroll')
    expect(within(payroll).getByText('Basic salary')).toBeInTheDocument()
    expect(within(payroll).getByText('৳30,000')).toBeInTheDocument()
    expect(within(payroll).getByText('Unpaid days')).toBeInTheDocument()
    expect(within(payroll).getByText('2')).toBeInTheDocument()
  })

  it('returns to the employees list when the person is missing', () => {
    renderEmployee('/hr/employees/EMP-missing')
    expect(screen.getByText('Employees list')).toBeInTheDocument()
  })
})
