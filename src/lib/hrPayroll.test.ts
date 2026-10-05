import { describe, expect, it } from 'vitest'
import { currentYearMonth, payrollLine } from '@/lib/hrPayroll'
import type { AttendanceRecord } from '@/types/hr'

describe('payrollLine', () => {
  it('deducts unpaid days at a 30-day rate', () => {
    const records: AttendanceRecord[] = [
      {
        id: 'ATT-1',
        tenantId: 'tenant-full',
        employeeId: 'EMP-1',
        kind: 'Absent',
        startDate: '2026-10-04',
        endDate: '2026-10-04',
      },
      {
        id: 'ATT-2',
        tenantId: 'tenant-full',
        employeeId: 'EMP-1',
        kind: 'Leave',
        startDate: '2026-10-06',
        endDate: '2026-10-07',
        leaveType: 'Unpaid',
      },
    ]
    expect(
      payrollLine({ id: 'EMP-1', salary: 30000 }, records, '2026-10'),
    ).toEqual({
      employeeId: 'EMP-1',
      salary: 30000,
      unpaidDays: 3,
      deduction: 3000,
      net: 27000,
    })
  })
})

describe('currentYearMonth', () => {
  it('pads the month', () => {
    expect(currentYearMonth(new Date(2026, 8, 5))).toBe('2026-09')
  })
})
