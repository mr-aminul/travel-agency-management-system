import { describe, expect, it } from 'vitest'
import {
  employeeAssignmentOptions,
  getEmployeeById,
  getEmployeeDisplayName,
} from '@/lib/employeesStore'
import type { Employee } from '@/types/employee'

const inactive: Employee = {
  id: 'EMP-9999',
  tenantId: 'tenant-full',
  name: 'Former Staff',
  phone: '01700000000',
  department: 'HR',
  designation: 'Officer',
  joined: '2020-01-01',
  salary: 20000,
  status: 'Inactive',
}

describe('getEmployeeDisplayName', () => {
  it('resolves HR employee names from ids', () => {
    expect(getEmployeeDisplayName('EMP-7001')).toBe('Karim Manager')
    expect(getEmployeeDisplayName('EMP-7002')).toBe('Lima Accounts')
    expect(getEmployeeDisplayName('EMP-7003')).toBe('Sajid HR')
  })

  it('keeps unmatched values so legacy names still display', () => {
    expect(getEmployeeDisplayName('Karim Ahmed')).toBe('Karim Ahmed')
  })

  it('returns empty when nothing is assigned', () => {
    expect(getEmployeeDisplayName('')).toBe('')
    expect(getEmployeeDisplayName(undefined)).toBe('')
  })
})

describe('employeeAssignmentOptions', () => {
  it('lists active employees by name', () => {
    const employee = getEmployeeById('EMP-7001')
    expect(employee).toBeDefined()
    expect(employeeAssignmentOptions([employee!])).toEqual([
      { value: 'EMP-7001', label: 'Karim Manager' },
    ])
  })

  it('keeps an inactive assignee in the picker when already selected', () => {
    expect(employeeAssignmentOptions([inactive])).toEqual([])
    expect(employeeAssignmentOptions([inactive], 'EMP-9999')).toEqual([
      { value: 'EMP-9999', label: 'Former Staff' },
    ])
  })
})
