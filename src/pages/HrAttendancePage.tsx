import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Button, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@/components/ui'
import {
  coveringRecord,
  createLeave,
  deleteAttendance,
  formatIsoDate,
  isDayAttendanceKind,
  setDayAttendance,
  useAttendance,
  useLeaveRecords,
} from '@/lib/hrAttendance'
import { useEmployees } from '@/lib/employeesStore'
import { formatDisplayDate } from '@/lib/formatDate'
import { hrEmployeePath, hrEmployeesPath } from '@/lib/workPaths'
import type { LeaveType } from '@/types/hr'
import '@/styles/layout-ops.css'

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

function todayIso() {
  return formatIsoDate(new Date())
}

function leaveDraft() {
  const date = todayIso()
  return {
    employeeId: '',
    startDate: date,
    endDate: date,
    leaveType: 'Casual' as LeaveType,
    note: '',
  }
}

function dayBadgeVariant(kind: string) {
  if (kind === 'Present') return 'completed' as const
  if (kind === 'Late') return 'pending' as const
  if (kind === 'Absent') return 'danger' as const
  return 'in-progress' as const
}

export default function HrAttendancePage() {
  const employees = useEmployees()
  const attendance = useAttendance()
  const leaveRecords = useLeaveRecords()
  const [date, setDate] = useState(todayIso)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [draft, setDraft] = useState(leaveDraft)
  const [pendingLeaveId, setPendingLeaveId] = useState<string | null>(null)

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.status === 'Active'),
    [employees],
  )
  const employeeName = useMemo(() => {
    const names = new Map(employees.map((employee) => [employee.id, employee.name]))
    return (id: string) => names.get(id) ?? id
  }, [employees])

  const leaveEmployeeOptions = activeEmployees.map((employee) => ({
    value: employee.id,
    label: employee.name,
  }))

  return (
    <div className="pd-page pd-ops" aria-label="Attendance and leave">
      <PageHeader
        title="Attendance & Leave"
        description="Mark the day for each person. Leave ranges stay visible so payroll can skip unpaid days."
        actions={
          <Button
            onClick={() => {
              setDraft({
                ...leaveDraft(),
                employeeId: activeEmployees[0]?.id ?? '',
              })
              setLeaveOpen(true)
            }}
            disabled={activeEmployees.length === 0}
          >
            <Plus size={16} /> Record leave
          </Button>
        }
      />

      <div className="pd-ops__toolbar">
        <Input
          label="Day"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>

      {activeEmployees.length === 0 ? (
        <EmptyState
          title="No active employees"
          description="Add staff on Employees before marking attendance."
          action={<Link to={hrEmployeesPath()}>Go to Employees</Link>}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeEmployees.map((employee) => {
              const covering = coveringRecord(attendance, employee.id, date)
              const onLeave = covering?.kind === 'Leave'
              return (
                <TableRow key={employee.id}>
                  <TableCell>
                    <Link to={hrEmployeePath(employee.id)}>{employee.name}</Link>
                  </TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>
                    {onLeave ? (
                      <Badge variant="in-progress">
                        Leave
                        {covering.leaveType ? ` · ${covering.leaveType}` : ''}
                      </Badge>
                    ) : (
                      <Select
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
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <section className="pd-ops__section" aria-label="Leave">
        <h2 className="pd-ops__section-title">Leave</h2>
        {leaveRecords.length === 0 ? (
          <EmptyState
            title="No leave recorded"
            description="Record a range when someone will be away."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
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
                    <Link to={hrEmployeePath(record.employeeId, 'leave')}>
                      {employeeName(record.employeeId)}
                    </Link>
                  </TableCell>
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
      </section>

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
                if (!draft.employeeId || !draft.startDate || !draft.endDate) return
                createLeave({
                  employeeId: draft.employeeId,
                  startDate: draft.startDate,
                  endDate: draft.endDate,
                  leaveType: draft.leaveType,
                  note: draft.note,
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
            label="Employee"
            options={leaveEmployeeOptions}
            value={draft.employeeId}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, employeeId: event.target.value }))
            }
          />
          <Select
            label="Type"
            options={LEAVE_TYPE_OPTIONS}
            value={draft.leaveType}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                leaveType: event.target.value as LeaveType,
              }))
            }
          />
          <Input
            label="From"
            type="date"
            value={draft.startDate}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, startDate: event.target.value }))
            }
          />
          <Input
            label="To"
            type="date"
            value={draft.endDate}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, endDate: event.target.value }))
            }
          />
          <Textarea
            label="Note"
            value={draft.note}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, note: event.target.value }))
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
