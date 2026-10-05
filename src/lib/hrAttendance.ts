import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID, TENANT_IDS } from '@/types/tenant'
import type {
  AttendanceRecord,
  DayAttendanceDraft,
  DayAttendanceKind,
  LeaveDraft,
} from '@/types/hr'

type Listener = () => void

const SEED_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'ATT-0001',
    tenantId: TENANT_IDS.full,
    employeeId: 'EMP-7001',
    kind: 'Present',
    startDate: '2026-10-01',
    endDate: '2026-10-01',
  },
  {
    id: 'ATT-0002',
    tenantId: TENANT_IDS.full,
    employeeId: 'EMP-7001',
    kind: 'Late',
    startDate: '2026-10-02',
    endDate: '2026-10-02',
  },
  {
    id: 'ATT-0003',
    tenantId: TENANT_IDS.full,
    employeeId: 'EMP-7003',
    kind: 'Absent',
    startDate: '2026-10-04',
    endDate: '2026-10-04',
  },
  {
    id: 'ATT-0004',
    tenantId: TENANT_IDS.full,
    employeeId: 'EMP-7002',
    kind: 'Leave',
    startDate: '2026-10-03',
    endDate: '2026-10-05',
    leaveType: 'Sick',
  },
  {
    id: 'ATT-0005',
    tenantId: TENANT_IDS.full,
    employeeId: 'EMP-7006',
    kind: 'Leave',
    startDate: '2026-10-06',
    endDate: '2026-10-07',
    leaveType: 'Unpaid',
  },
  {
    id: 'ATT-M001',
    tenantId: TENANT_IDS.manpower,
    employeeId: 'EMP-M001',
    kind: 'Present',
    startDate: '2026-10-01',
    endDate: '2026-10-01',
  },
]

let records: AttendanceRecord[] = SEED_ATTENDANCE.map((item) => ({ ...item }))
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return records
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function nextId(existing: string[], prefix: string) {
  const nums = existing
    .map((id) => Number(id.replace(/\D/g, '').slice(-4)))
    .filter((n) => !Number.isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}-${String(next).padStart(4, '0')}`
}

export function parseIsoDate(value: string): Date {
  return new Date(`${value}T12:00:00`)
}

export function formatIsoDate(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function eachIsoDate(startDate: string, endDate: string): string[] {
  const start = parseIsoDate(startDate)
  const end = parseIsoDate(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return []
  }
  const dates: string[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    dates.push(formatIsoDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

export function recordCoversDate(record: AttendanceRecord, date: string): boolean {
  return record.startDate <= date && date <= record.endDate
}

export function coveringRecord(
  items: AttendanceRecord[],
  employeeId: string,
  date: string,
): AttendanceRecord | undefined {
  const matches = items.filter(
    (item) => item.employeeId === employeeId && recordCoversDate(item, date),
  )
  return matches.find((item) => item.kind === 'Leave') ?? matches[0]
}

function isUnpaidDay(record: AttendanceRecord): boolean {
  return record.kind === 'Absent' || record.leaveType === 'Unpaid'
}

export function unpaidDaysInMonth(
  items: AttendanceRecord[],
  employeeId: string,
  yearMonth: string,
): number {
  const [year, month] = yearMonth.split('-').map(Number)
  if (!year || !month) return 0
  const start = `${yearMonth}-01`
  const end = formatIsoDate(new Date(year, month, 0, 12))
  const unpaid = new Set<string>()
  for (const record of items) {
    if (record.employeeId !== employeeId || !isUnpaidDay(record)) continue
    for (const date of eachIsoDate(record.startDate, record.endDate)) {
      if (date >= start && date <= end) unpaid.add(date)
    }
  }
  return unpaid.size
}

export function useAttendance(): AttendanceRecord[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () =>
      all
        .filter((item) => item.tenantId === activeId)
        .slice()
        .sort((a, b) => {
          if (a.startDate !== b.startDate) return b.startDate.localeCompare(a.startDate)
          return b.id.localeCompare(a.id)
        }),
    [all, activeId],
  )
}

export function useLeaveRecords(): AttendanceRecord[] {
  const items = useAttendance()
  return useMemo(
    () => items.filter((item) => item.kind === 'Leave'),
    [items],
  )
}

export function setDayAttendance(draft: DayAttendanceDraft): AttendanceRecord {
  const date = draft.date
  const employeeId = draft.employeeId
  const existing = records.find(
    (item) =>
      item.tenantId === tenantId() &&
      item.employeeId === employeeId &&
      item.kind !== 'Leave' &&
      item.startDate === date &&
      item.endDate === date,
  )
  if (existing) {
    records = records.map((item) =>
      item.id === existing.id
        ? { ...item, kind: draft.kind, note: draft.note?.trim() || undefined }
        : item,
    )
    emit()
    return records.find((item) => item.id === existing.id)!
  }
  const created: AttendanceRecord = {
    id: nextId(records.map((item) => item.id), 'ATT'),
    tenantId: tenantId(),
    employeeId,
    kind: draft.kind,
    startDate: date,
    endDate: date,
    note: draft.note?.trim() || undefined,
  }
  records = [created, ...records]
  emit()
  return created
}

export function createLeave(draft: LeaveDraft): AttendanceRecord {
  const startDate =
    draft.startDate <= draft.endDate ? draft.startDate : draft.endDate
  const endDate =
    draft.startDate <= draft.endDate ? draft.endDate : draft.startDate
  const created: AttendanceRecord = {
    id: nextId(records.map((item) => item.id), 'ATT'),
    tenantId: tenantId(),
    employeeId: draft.employeeId,
    kind: 'Leave',
    startDate,
    endDate,
    leaveType: draft.leaveType,
    note: draft.note?.trim() || undefined,
  }
  records = [created, ...records]
  emit()
  return created
}

export function deleteAttendance(id: string) {
  records = records.filter((item) => item.id !== id)
  emit()
}

export function isDayAttendanceKind(value: string): value is DayAttendanceKind {
  return value === 'Present' || value === 'Late' || value === 'Absent'
}
