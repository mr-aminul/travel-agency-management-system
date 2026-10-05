export type DayAttendanceKind = 'Present' | 'Late' | 'Absent'

export type LeaveType = 'Casual' | 'Sick' | 'Unpaid'

export type AttendanceKind = DayAttendanceKind | 'Leave'

export type AttendanceRecord = {
  id: string
  tenantId: string
  employeeId: string
  kind: AttendanceKind
  startDate: string
  endDate: string
  leaveType?: LeaveType
  note?: string
}

export type DayAttendanceDraft = {
  employeeId: string
  date: string
  kind: DayAttendanceKind
  note?: string
}

export type LeaveDraft = {
  employeeId: string
  startDate: string
  endDate: string
  leaveType: LeaveType
  note?: string
}

export type PayrollLine = {
  employeeId: string
  salary: number
  unpaidDays: number
  deduction: number
  net: number
}
