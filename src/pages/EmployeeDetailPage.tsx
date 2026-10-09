import { useMemo, useState, type ReactNode } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Avatar, BackButton, Badge, Button, ConfirmDialog, EmptyState, Input, Modal, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, Textarea, type BadgeVariant } from '@/components/ui'
import {
  Banknote,
  CalendarClock,
  CalendarOff,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  formatSalary,
  useEmployees,
} from '@/lib/employeesStore'
import {
  coveringRecord,
  createLeave,
  deleteAttendance,
  formatIsoDate,
  isDayAttendanceKind,
  setDayAttendance,
  useAttendance,
} from '@/lib/hrAttendance'
import {
  currentYearMonth,
  formatYearMonthLabel,
  payrollLine,
} from '@/lib/hrPayroll'
import { hrEmployeesPath } from '@/lib/workPaths'
import { formatDisplayDate } from '@/lib/formatDate'
import type { EmployeeStatus } from '@/types/employee'
import type { LeaveType } from '@/types/hr'
import '@/styles/layout-clients.css'
import '@/styles/layout-ops.css'

const EMPLOYEE_TABS = ['attendance', 'leave', 'payroll'] as const

const DAY_STATUS_OPTIONS = [
  { value: '', label: 'Not marked' },
  { value: 'Present', label: 'Present' },
  { value: 'Late', label: 'Late' },
  { value: 'Absent', label: 'Absent' },
]

const LEAVE_TYPE_OPTIONS = [
  { value: 'Casual', label: 'Casual' },
  { value: 'Sick', label: 'Sick' },
  { value: 'Unpaid', label: 'Unpaid' },
]

function tabFromSearch(searchParams: URLSearchParams): string {
  const tab = searchParams.get('tab')
  return tab && EMPLOYEE_TABS.includes(tab as (typeof EMPLOYEE_TABS)[number])
    ? tab
    : 'attendance'
}

function todayIso() {
  return formatIsoDate(new Date())
}

function statusBadgeVariant(status: EmployeeStatus): BadgeVariant {
  return status === 'Active' ? 'completed' : 'on-hold'
}

function dayBadgeVariant(kind: string): BadgeVariant {
  if (kind === 'Present') return 'completed'
  if (kind === 'Late') return 'pending'
  if (kind === 'Absent') return 'danger'
  return 'in-progress'
}

function TabLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <>
      <Icon size={15} strokeWidth={2.25} aria-hidden />
      {children}
    </>
  )
}

export default function EmployeeDetailPage() {
  const { id = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const employees = useEmployees()
  const attendance = useAttendance()
  const employee = employees.find((item) => item.id === id)
  const activeTab = tabFromSearch(searchParams)
  const [date, setDate] = useState(todayIso)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [pendingLeaveId, setPendingLeaveId] = useState<string | null>(null)
  const [yearMonth, setYearMonth] = useState(currentYearMonth)
  const [leaveDraft, setLeaveDraft] = useState({
    startDate: todayIso(),
    endDate: todayIso(),
    leaveType: 'Casual' as LeaveType,
    note: '',
  })

  const dayMarks = useMemo(
    () =>
      attendance.filter(
        (record) => record.employeeId === id && record.kind !== 'Leave',
      ),
    [attendance, id],
  )
  const leaveRecords = useMemo(
    () =>
      attendance.filter(
        (record) => record.employeeId === id && record.kind === 'Leave',
      ),
    [attendance, id],
  )

  if (!employee) {
    return <Navigate to={hrEmployeesPath()} replace />
  }

  const covering = coveringRecord(attendance, employee.id, date)
  const onLeave = covering?.kind === 'Leave'
  const line = payrollLine(employee, attendance, yearMonth)
  const monthLabel = formatYearMonthLabel(yearMonth)

  const selectTab = (tab: string) => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'attendance') next.delete('tab')
    else next.set('tab', tab)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="pd-page pd-client-detail pd-ops" aria-label={employee.name}>
      <BackButton to={hrEmployeesPath()} label="Employees" />

      <header className="pd-client-detail__header">
        <Avatar name={employee.name} size="xl" kind="staff" />
        <div className="pd-client-detail__header-text">
          <div className="pd-client-detail__title-row">
            <h1 className="pd-client-detail__name">{employee.name}</h1>
            <Badge variant={statusBadgeVariant(employee.status)}>
              {employee.status}
            </Badge>
          </div>
          <div className="pd-client-detail__meta-row">
            <span className="pd-client-detail__contact">
              <span className="pd-client-detail__contact-value">
                {employee.phone}
              </span>
            </span>
            <span className="pd-client-detail__contact">
              <span className="pd-client-detail__contact-value">
                {employee.designation} · {employee.department}
              </span>
            </span>
            <span className="pd-client-detail__contact">
              <span className="pd-client-detail__contact-value">
                {formatSalary(employee.salary)}
              </span>
            </span>
            <span className="pd-client-detail__contact">
              <span className="pd-client-detail__contact-value pd-table__code">
                {employee.id}
              </span>
            </span>
          </div>
        </div>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={selectTab}
        items={[
          {
            id: 'attendance',
            label: <TabLabel icon={CalendarClock}>Attendance</TabLabel>,
            content: (
              <div className="pd-ops__section">
                <div className="pd-ops__toolbar">
                  <Input
                    label="Day"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </div>
                {onLeave ? (
                  <p className="pd-ops__meta">
                    On leave
                    {covering.leaveType ? ` · ${covering.leaveType}` : ''} this
                    day. Change it from Leave.
                  </p>
                ) : (
                  <Select
                    label="Status"
                    options={DAY_STATUS_OPTIONS}
                    value={covering?.kind ?? ''}
                    onChange={(event) => {
                      const value = event.target.value
                      if (!value) {
                        if (covering) deleteAttendance(covering.id)
                        return
                      }
                      if (isDayAttendanceKind(value)) {
                        setDayAttendance({
                          employeeId: employee.id,
                          date,
                          kind: value,
                        })
                      }
                    }}
                  />
                )}
                {dayMarks.length === 0 ? (
                  <EmptyState
                    title="No attendance marked"
                    description="Pick a day and mark Present, Late, or Absent."
                  />
                ) : (
                  <Table aria-label={`${employee.name} attendance`}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayMarks.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{formatDisplayDate(record.startDate)}</TableCell>
                          <TableCell>
                            <Badge variant={dayBadgeVariant(record.kind)}>
                              {record.kind}
                            </Badge>
                          </TableCell>
                          <TableCell>{record.note ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ),
          },
          {
            id: 'leave',
            label: <TabLabel icon={CalendarOff}>Leave</TabLabel>,
            content: (
              <div className="pd-ops__section">
                <div className="pd-ops__toolbar">
                  <Button
                    onClick={() => {
                      const today = todayIso()
                      setLeaveDraft({
                        startDate: today,
                        endDate: today,
                        leaveType: 'Casual',
                        note: '',
                      })
                      setLeaveOpen(true)
                    }}
                  >
                    Record leave
                  </Button>
                </div>
                {leaveRecords.length === 0 ? (
                  <EmptyState
                    title="No leave recorded"
                    description="Record a range when this person will be away."
                  />
                ) : (
                  <Table aria-label={`${employee.name} leave`}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead> </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <Badge variant={dayBadgeVariant('Leave')}>
                              {record.leaveType ?? 'Leave'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDisplayDate(record.startDate)}</TableCell>
                          <TableCell>{formatDisplayDate(record.endDate)}</TableCell>
                          <TableCell>{record.note ?? '—'}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPendingLeaveId(record.id)}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ),
          },
          {
            id: 'payroll',
            label: <TabLabel icon={Banknote}>Payroll</TabLabel>,
            content: (
              <div className="pd-ops__section">
                <div className="pd-ops__toolbar">
                  <Input
                    label="Month"
                    type="month"
                    value={yearMonth}
                    onChange={(event) => setYearMonth(event.target.value)}
                  />
                  <p className="pd-ops__meta">{monthLabel}</p>
                </div>
                <Table aria-label={`${employee.name} payroll`}>
                  <TableBody>
                    <TableRow>
                      <TableCell>Basic salary</TableCell>
                      <TableCell>{formatSalary(line.salary)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Unpaid days</TableCell>
                      <TableCell>
                        {line.unpaidDays === 0 ? '—' : line.unpaidDays}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Deduction</TableCell>
                      <TableCell>
                        {line.deduction ? formatSalary(line.deduction) : '—'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Net pay</TableCell>
                      <TableCell>{formatSalary(line.net)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="Record leave"
        actions={
          <>
            <Button variant="secondary" onClick={() => setLeaveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!leaveDraft.startDate || !leaveDraft.endDate) return
                createLeave({
                  employeeId: employee.id,
                  startDate: leaveDraft.startDate,
                  endDate: leaveDraft.endDate,
                  leaveType: leaveDraft.leaveType,
                  note: leaveDraft.note,
                })
                setLeaveOpen(false)
              }}
            >
              Save leave
            </Button>
          </>
        }
      >
        <div className="pd-ops-form pd-ops-form--2">
          <Select
            label="Type"
            options={LEAVE_TYPE_OPTIONS}
            value={leaveDraft.leaveType}
            onChange={(event) =>
              setLeaveDraft((prev) => ({
                ...prev,
                leaveType: event.target.value as LeaveType,
              }))
            }
          />
          <Input
            label="From"
            type="date"
            value={leaveDraft.startDate}
            onChange={(event) =>
              setLeaveDraft((prev) => ({
                ...prev,
                startDate: event.target.value,
              }))
            }
          />
          <Input
            label="To"
            type="date"
            value={leaveDraft.endDate}
            onChange={(event) =>
              setLeaveDraft((prev) => ({ ...prev, endDate: event.target.value }))
            }
          />
          <Textarea
            label="Note"
            value={leaveDraft.note}
            onChange={(event) =>
              setLeaveDraft((prev) => ({ ...prev, note: event.target.value }))
            }
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingLeaveId !== null}
        onClose={() => setPendingLeaveId(null)}
        title="Remove this leave?"
        description="The days will no longer count as leave on the attendance sheet."
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={() => {
          if (pendingLeaveId) deleteAttendance(pendingLeaveId)
          setPendingLeaveId(null)
        }}
      />
    </div>
  )
}
