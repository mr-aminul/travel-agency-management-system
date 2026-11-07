import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarOff, Plus } from 'lucide-react'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { ConfirmDialog } from '@/components/shadcn/confirm-dialog'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import { Input, Select, Textarea } from '@/components/clients/clientShadcnFields'
import {
  chromeHeadClass,
  elevatedPageClass,
  floatingSheetClass,
} from '@/components/clients/shadcnChrome'
import { cn } from '@/lib/utils'
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

const DAY_STATUS_OPTIONS = [
  { value: '__none__', label: 'Not marked' },
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
  if (kind === 'Present') return 'default' as const
  if (kind === 'Late') return 'secondary' as const
  if (kind === 'Absent') return 'destructive' as const
  return 'outline' as const
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
    <div
      className={cn(elevatedPageClass, 'gap-5')}
      data-elevated-canvas
      aria-label="Attendance and leave"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-xl font-semibold tracking-tight">Attendance & Leave</h1>
        <Button
          className="h-9 rounded-lg shadow-xs"
          onClick={() => {
            setDraft({
              ...leaveDraft(),
              employeeId: activeEmployees[0]?.id ?? '',
            })
            setLeaveOpen(true)
          }}
          disabled={activeEmployees.length === 0}
        >
          <Plus size={16} data-icon="inline-start" />
          Record Leave
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Day"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>

      {activeEmployees.length === 0 ? (
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarOff />
            </EmptyMedia>
            <EmptyTitle>No Active Employees</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" className="h-9 rounded-lg" asChild>
              <Link to={hrEmployeesPath()}>Go to Employees</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="overflow-auto rounded-xl border bg-card shadow-md">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={chromeHeadClass}>Name</TableHead>
                <TableHead className={chromeHeadClass}>Department</TableHead>
                <TableHead className={chromeHeadClass}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeEmployees.map((employee) => {
                const covering = coveringRecord(attendance, employee.id, date)
                const onLeave = covering?.kind === 'Leave'
                return (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <Link
                        className="text-primary underline-offset-2 hover:underline"
                        to={hrEmployeePath(employee.id)}
                      >
                        {employee.name}
                      </Link>
                    </TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>
                      {onLeave ? (
                        <Badge variant="outline">
                          Leave
                          {covering.leaveType ? ` · ${covering.leaveType}` : ''}
                        </Badge>
                      ) : (
                        <ShadcnSelect
                          value={covering?.kind ?? '__none__'}
                          onValueChange={(value) => {
                            if (value === '__none__') {
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
                        >
                          <SelectTrigger className="h-9 w-[10rem]" aria-label="Day status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAY_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </ShadcnSelect>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <section className="flex flex-col gap-3" aria-label="Leave">
        <h2 className="m-0 text-base font-semibold tracking-tight">Leave</h2>
        {leaveRecords.length === 0 ? (
          <Empty className="bg-card shadow-sm">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarOff />
              </EmptyMedia>
              <EmptyTitle>No Leave Recorded</EmptyTitle>
            </EmptyHeader>
            <EmptyContent />
          </Empty>
        ) : (
          <div className="overflow-auto rounded-xl border bg-card shadow-md">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={chromeHeadClass}>Employee</TableHead>
                  <TableHead className={chromeHeadClass}>Type</TableHead>
                  <TableHead className={chromeHeadClass}>From</TableHead>
                  <TableHead className={chromeHeadClass}>To</TableHead>
                  <TableHead className={chromeHeadClass}>Note</TableHead>
                  <TableHead className={chromeHeadClass}> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Link
                        className="text-primary underline-offset-2 hover:underline"
                        to={hrEmployeePath(record.employeeId, 'leave')}
                      >
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
                    <TableCell>{record.note ?? '-'}</TableCell>
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
          </div>
        )}
      </section>

      <Sheet
        open={leaveOpen}
        onOpenChange={(next) => {
          if (!next) setLeaveOpen(false)
        }}
      >
        <SheetContent className={floatingSheetClass}>
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">Record Leave</SheetTitle>
          </SheetHeader>
          <div className="grid gap-3 overflow-y-auto px-5 py-4 sm:grid-cols-2">
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
            <div className="sm:col-span-2">
              <Textarea
                label="Note"
                value={draft.note}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, note: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="mt-auto flex justify-end gap-2 border-t border-border px-5 py-4">
            <Button
              variant="outline"
              className="h-9 rounded-lg"
              onClick={() => setLeaveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-9 rounded-lg"
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
              Save Leave
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={pendingLeaveId !== null}
        onClose={() => setPendingLeaveId(null)}
        title="Remove this leave from the attendance sheet?"
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
