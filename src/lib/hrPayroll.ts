import type { Employee } from '@/types/employee'
import type { AttendanceRecord, PayrollLine } from '@/types/hr'
import { unpaidDaysInMonth } from '@/lib/hrAttendance'

const PAY_DAYS_PER_MONTH = 30

export function dailyRate(salary: number): number {
  return salary / PAY_DAYS_PER_MONTH
}

export function payrollLine(
  employee: Pick<Employee, 'id' | 'salary'>,
  records: AttendanceRecord[],
  yearMonth: string,
): PayrollLine {
  const unpaidDays = unpaidDaysInMonth(records, employee.id, yearMonth)
  const deduction = Math.round(dailyRate(employee.salary) * unpaidDays)
  return {
    employeeId: employee.id,
    salary: employee.salary,
    unpaidDays,
    deduction,
    net: Math.max(0, employee.salary - deduction),
  }
}

export function buildPayrollLines(
  employees: Employee[],
  records: AttendanceRecord[],
  yearMonth: string,
): PayrollLine[] {
  return employees
    .filter((employee) => employee.status === 'Active')
    .map((employee) => payrollLine(employee, records, yearMonth))
}

export function formatYearMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  if (!year || !month) return yearMonth
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
}

export function currentYearMonth(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}
