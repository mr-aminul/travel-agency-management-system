import { describe, expect, it } from 'vitest'
import {
  hrAttendancePath,
  hrEmployeePath,
  hrEmployeesPath,
  hrPayrollPath,
  serviceCatalogEditorPath,
  serviceCatalogPath,
  settingsSectionPath,
  workListPath,
} from '@/lib/workPaths'

describe('HR paths', () => {
  it('nests employees, attendance, and payroll under /hr', () => {
    expect(hrEmployeesPath()).toBe('/hr/employees')
    expect(hrAttendancePath()).toBe('/hr/attendance')
    expect(hrPayrollPath()).toBe('/hr/payroll')
  })

  it('opens an employee profile under employees', () => {
    expect(hrEmployeePath('EMP-7001')).toBe('/hr/employees/EMP-7001')
    expect(hrEmployeePath('EMP-7001', 'leave')).toBe(
      '/hr/employees/EMP-7001?tab=leave',
    )
    expect(hrEmployeePath('EMP-7001', 'payroll')).toBe(
      '/hr/employees/EMP-7001?tab=payroll',
    )
  })
})

describe('settings and catalog paths', () => {
  it('keeps the file queue on /services', () => {
    expect(workListPath()).toBe('/services')
    expect(workListPath('Tourist Visa')).toBe('/services?service=tourist-visa')
  })

  it('puts the catalog under settings, not the queue', () => {
    expect(settingsSectionPath()).toBe('/settings')
    expect(settingsSectionPath('business')).toBe('/settings')
    expect(serviceCatalogPath()).toBe('/settings?section=services')
    expect(serviceCatalogEditorPath('Tourist Visa')).toBe(
      '/settings/services/tourist-visa',
    )
    expect(serviceCatalogEditorPath('Hajj/Umrah Visa')).toBe(
      '/settings/services/hajj-umrah-visa',
    )
  })
})
