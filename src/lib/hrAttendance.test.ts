import { describe, expect, it } from 'vitest'
import {
  coveringRecord,
  eachIsoDate,
  unpaidDaysInMonth,
} from '@/lib/hrAttendance'
import type { AttendanceRecord } from '@/types/hr'

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
  {
    id: 'ATT-3',
    tenantId: 'tenant-full',
    employeeId: 'EMP-1',
    kind: 'Leave',
    startDate: '2026-10-03',
    endDate: '2026-10-05',
    leaveType: 'Sick',
  },
  {
    id: 'ATT-4',
    tenantId: 'tenant-full',
    employeeId: 'EMP-1',
    kind: 'Present',
    startDate: '2026-10-04',
    endDate: '2026-10-04',
  },
]

describe('eachIsoDate', () => {
  it('includes the start and end days', () => {
    expect(eachIsoDate('2026-10-03', '2026-10-05')).toEqual([
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
    ])
  })
})

describe('coveringRecord', () => {
  it('prefers leave when a day also has a mark', () => {
    const match = coveringRecord(records, 'EMP-1', '2026-10-04')
    expect(match?.kind).toBe('Leave')
    expect(match?.leaveType).toBe('Sick')
  })
})

describe('unpaidDaysInMonth', () => {
  it('counts absent days and unpaid leave once', () => {
    expect(unpaidDaysInMonth(records, 'EMP-1', '2026-10')).toBe(3)
  })

  it('ignores other months', () => {
    expect(unpaidDaysInMonth(records, 'EMP-1', '2026-09')).toBe(0)
  })
})
