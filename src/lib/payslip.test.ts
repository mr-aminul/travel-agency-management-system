import { describe, expect, it } from 'vitest'
import { buildEmployeePayslip, payslipPdfFileName } from '@/lib/payslip'
import type { Employee } from '@/types/employee'
import type { AgencyProfile } from '@/lib/agencyProfile'

const employee: Employee = {
  id: 'EMP-7001',
  tenantId: 'tenant-full',
  name: 'Md. Karim Ahmed',
  phone: '01711234567',
  email: 'karim@abctravel.demo',
  department: 'Recruitment',
  designation: 'Recruitment Manager',
  joined: '2022-01-05',
  salary: 55000,
  status: 'Active',
}

const profile: AgencyProfile = {
  businessName: 'ABC Travel Agency',
  address: 'Gulshan 1, Dhaka',
  mobile: '01700000000',
  website: 'https://abctravel.demo',
  profilePicture: 'data:image/png;base64,abc',
}

describe('buildEmployeePayslip', () => {
  it('includes company brand and payroll figures', () => {
    const payslip = buildEmployeePayslip({
      employee,
      line: {
        employeeId: employee.id,
        salary: 55000,
        unpaidDays: 2,
        deduction: 3667,
        net: 51333,
      },
      yearMonth: '2026-10',
      profile,
      issuedOn: '2026-11-04',
    })

    expect(payslip.agencyName).toBe('ABC Travel Agency')
    expect(payslip.agencyLogoUrl).toBe('data:image/png;base64,abc')
    expect(payslip.agencyLogoIsCustom).toBe(true)
    expect(payslip.monthLabel).toBe('October 2026')
    expect(payslip.net).toBe(51333)
    expect(payslip.payslipNumber).toBe('PS-EMP-7001-2026-10')
    expect(payslipPdfFileName(payslip)).toBe('payslip-EMP-7001-2026-10.pdf')
  })
})
