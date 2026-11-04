import type { AgencyProfile } from '@/lib/agencyProfile'
import {
  DEFAULT_BRAND_NAME,
  resolveBrandDisplay,
} from '@/lib/agencyProfile'
import { formatDisplayDate } from '@/lib/formatDate'
import { formatSalary } from '@/lib/employeesStore'
import { formatYearMonthLabel } from '@/lib/hrPayroll'
import type { Employee } from '@/types/employee'
import type { PayrollLine } from '@/types/hr'

export type EmployeePayslip = {
  payslipNumber: string
  yearMonth: string
  monthLabel: string
  issuedOn: string
  agencyName: string
  agencyAddress: string
  agencyMobile: string
  agencyWebsite: string
  agencyLogoUrl?: string
  agencyLogoIsCustom: boolean
  employeeId: string
  employeeName: string
  department: string
  designation: string
  phone: string
  email: string
  joined: string
  salary: number
  unpaidDays: number
  deduction: number
  net: number
}

export function buildEmployeePayslip(input: {
  employee: Employee
  line: PayrollLine
  yearMonth: string
  profile: AgencyProfile
  defaultLogoUrl?: string
  issuedOn?: string
}): EmployeePayslip {
  const brand = resolveBrandDisplay(input.profile, input.defaultLogoUrl)
  const issuedOn = input.issuedOn ?? new Date().toISOString().slice(0, 10)
  const safeMonth = input.yearMonth.replace(/[^\d-]/g, '') || 'month'
  return {
    payslipNumber: `PS-${input.employee.id}-${safeMonth}`,
    yearMonth: input.yearMonth,
    monthLabel: formatYearMonthLabel(input.yearMonth),
    issuedOn,
    agencyName: brand.name || DEFAULT_BRAND_NAME,
    agencyAddress: input.profile.address.trim(),
    agencyMobile: input.profile.mobile.trim(),
    agencyWebsite: input.profile.website.trim(),
    agencyLogoUrl: brand.logoUrl,
    agencyLogoIsCustom: brand.isCustomLogo,
    employeeId: input.employee.id,
    employeeName: input.employee.name,
    department: input.employee.department,
    designation: input.employee.designation,
    phone: input.employee.phone,
    email: input.employee.email,
    joined: input.employee.joined,
    salary: input.line.salary,
    unpaidDays: input.line.unpaidDays,
    deduction: input.line.deduction,
    net: input.line.net,
  }
}

export function formatPayslipWebsite(website: string): string {
  return website.trim().replace(/^https?:\/\//i, '')
}

export function formatPayslipDate(value: string): string {
  return formatDisplayDate(value, value)
}

export function formatPayslipAmount(amount: number): string {
  return formatSalary(amount)
}

export function payslipPdfFileName(payslip: Pick<EmployeePayslip, 'employeeId' | 'yearMonth'>) {
  const id = payslip.employeeId.replace(/[^\w.-]+/g, '-') || 'employee'
  const month = payslip.yearMonth.replace(/[^\d-]/g, '') || 'month'
  return `payslip-${id}-${month}.pdf`
}
