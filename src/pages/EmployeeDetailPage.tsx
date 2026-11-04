import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  BackButton,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Textarea,
  type BadgeVariant,
} from '@/components/ui'
import { ProfilePhotoField } from '@/components/ProfilePhotoField'
import { PayslipDocument } from '@/components/hr/PayslipDocument'
import { PayslipDownloadButton } from '@/components/hr/PayslipDownloadButton'
import {
  Banknote,
  CalendarClock,
  CalendarOff,
  Contact,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  deleteEmployee,
  formatSalary,
  updateEmployee,
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
import { buildEmployeePayslip } from '@/lib/payslip'
import { fileToProfilePictureDataUrl } from '@/lib/agencyProfile'
import { useAgencyProfile } from '@/layout/useAgencyProfile'
import { layoutConfig } from '@/config/layout'
import { hrEmployeesPath } from '@/lib/workPaths'
import { formatDisplayDate } from '@/lib/formatDate'
import type { Employee, EmployeeStatus } from '@/types/employee'
import type { LeaveType } from '@/types/hr'
import { cx } from '@/lib/cx'
import '@/styles/layout-clients.css'
import '@/styles/layout-ops.css'

const EMPLOYEE_TABS = ['profile', 'attendance', 'leave', 'payroll'] as const

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

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
]

function tabFromSearch(searchParams: URLSearchParams): string {
  const tab = searchParams.get('tab')
  return tab && EMPLOYEE_TABS.includes(tab as (typeof EMPLOYEE_TABS)[number])
    ? tab
    : 'profile'
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

function draftFromEmployee(employee: Employee) {
  return {
    name: employee.name,
    phone: employee.phone,
    email: employee.email,
    department: employee.department,
    designation: employee.designation,
    joined: employee.joined,
    salary: employee.salary,
    status: employee.status,
  }
}

function emptyOr(value: string) {
  const trimmed = value.trim()
  return trimmed ? (
    trimmed
  ) : (
    <span className="pd-client-detail__empty">-</span>
  )
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

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <h2 className="pd-client-detail__section-title">
      <span className="pd-client-detail__section-icon" aria-hidden>
        <Icon size={16} strokeWidth={2.25} />
      </span>
      {children}
    </h2>
  )
}

export default function EmployeeDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const employees = useEmployees()
  const attendance = useAttendance()
  const agencyProfile = useAgencyProfile()
  const employee = employees.find((item) => item.id === id)
  const activeTab = tabFromSearch(searchParams)
  const [date, setDate] = useState(todayIso)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [pendingLeaveId, setPendingLeaveId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [yearMonth, setYearMonth] = useState(currentYearMonth)
  const [leaveDraft, setLeaveDraft] = useState({
    startDate: todayIso(),
    endDate: todayIso(),
    leaveType: 'Casual' as LeaveType,
    note: '',
  })
  const [draft, setDraft] = useState(() =>
    employee ? draftFromEmployee(employee) : null,
  )
  const [saveError, setSaveError] = useState<string | undefined>()
  const [saveOk, setSaveOk] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!employee) return
    setDraft(draftFromEmployee(employee))
    setSaveError(undefined)
    setSaveOk(undefined)
  }, [employee?.id])

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

  if (!employee || !draft) {
    return <Navigate to={hrEmployeesPath()} replace />
  }

  const covering = coveringRecord(attendance, employee.id, date)
  const onLeave = covering?.kind === 'Leave'
  const line = payrollLine(employee, attendance, yearMonth)
  const monthLabel = formatYearMonthLabel(yearMonth)
  const payslip = buildEmployeePayslip({
    employee,
    line,
    yearMonth,
    profile: agencyProfile,
    defaultLogoUrl: layoutConfig.brand.logoUrl,
  })
  const dirty =
    draft.name.trim() !== employee.name ||
    draft.phone.trim() !== employee.phone ||
    draft.email.trim() !== employee.email ||
    draft.department.trim() !== employee.department ||
    draft.designation.trim() !== employee.designation ||
    draft.joined !== employee.joined ||
    draft.salary !== employee.salary ||
    draft.status !== employee.status

  const selectTab = (tab: string) => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'profile') next.delete('tab')
    else next.set('tab', tab)
    setSearchParams(next, { replace: true })
  }

  const updateDraft = <K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
    setSaveOk(undefined)
  }

  const handleSaveProfile = (event: FormEvent) => {
    event.preventDefault()
    setSaveError(undefined)
    setSaveOk(undefined)
    if (!draft.name.trim()) {
      setSaveError('Full name is required.')
      return
    }
    setSaving(true)
    try {
      updateEmployee(employee.id, {
        name: draft.name,
        phone: draft.phone,
        email: draft.email,
        department: draft.department,
        designation: draft.designation,
        joined: draft.joined,
        salary: draft.salary,
        status: draft.status,
      })
      setSaveOk('Saved.')
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Could not save employee.',
      )
    } finally {
      setSaving(false)
    }
  }

  const displayName = draft.name.trim() || employee.name

  return (
    <div className="pd-page pd-client-detail pd-ops" aria-label={employee.name}>
      <BackButton to={hrEmployeesPath()} label="Employees" />

      <div className="pd-client-detail__layout">
        <aside className="pd-client-detail__card" aria-label="Employee profile">
          <div className="pd-client-detail__card-identity">
            <ProfilePhotoField
              name={displayName}
              fallbackName="Employee"
              kind="staff"
              value={employee.avatarUrl}
              encodeFile={fileToProfilePictureDataUrl}
              onChange={(avatarUrl) => {
                updateEmployee(employee.id, { avatarUrl })
              }}
            />
            <div className="pd-client-detail__title-row">
              <h1 className="pd-client-detail__name">{displayName}</h1>
              <Badge variant={statusBadgeVariant(draft.status)}>
                {draft.status}
              </Badge>
            </div>
            {draft.designation || draft.department ? (
              <p className="pd-client-detail__card-subtitle">
                {[draft.designation, draft.department]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
          </div>

          <div className="pd-client-detail__card-actions">
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 size={14} strokeWidth={2.25} aria-hidden />
              Delete
            </Button>
          </div>

          <dl className="pd-client-detail__card-fields">
            <div className="pd-client-detail__card-field">
              <dt>Employee ID</dt>
              <dd className="pd-table__code">{employee.id}</dd>
            </div>
            <div className="pd-client-detail__card-field">
              <dt>Phone</dt>
              <dd>{emptyOr(draft.phone)}</dd>
            </div>
            <div className="pd-client-detail__card-field">
              <dt>Email</dt>
              <dd>{emptyOr(draft.email)}</dd>
            </div>
            <div className="pd-client-detail__card-field">
              <dt>Department</dt>
              <dd>{emptyOr(draft.department)}</dd>
            </div>
            <div className="pd-client-detail__card-field">
              <dt>Designation</dt>
              <dd>{emptyOr(draft.designation)}</dd>
            </div>
            <div className="pd-client-detail__card-field">
              <dt>Salary</dt>
              <dd>{formatSalary(draft.salary)}</dd>
            </div>
            <div className="pd-client-detail__card-field">
              <dt>Joined</dt>
              <dd>
                {draft.joined ? formatDisplayDate(draft.joined) : (
                  <span className="pd-client-detail__empty">-</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="pd-client-detail__card-snapshot" aria-label="Snapshot">
            <button
              type="button"
              className="pd-client-detail__card-snap"
              onClick={() => selectTab('attendance')}
            >
              <span className="pd-client-detail__card-snap-label">Attendance</span>
              <span className="pd-client-detail__card-snap-value">
                {dayMarks.length}
              </span>
            </button>
            <button
              type="button"
              className="pd-client-detail__card-snap"
              onClick={() => selectTab('leave')}
            >
              <span className="pd-client-detail__card-snap-label">Leave</span>
              <span className="pd-client-detail__card-snap-value">
                {leaveRecords.length}
              </span>
            </button>
          </div>

          <p className="pd-client-detail__card-footer">
            Staff directory · case assignment · payroll
          </p>
        </aside>

        <div
          className={cx('pd-client-detail__main', 'pd-employee-main')}
          aria-label="Employee workspace"
        >
          <Tabs
            className="pd-client-detail__tabs"
            value={activeTab}
            onValueChange={selectTab}
            items={[
              {
                id: 'profile',
                label: <TabLabel icon={Contact}>Profile</TabLabel>,
                content: (
                  <form
                    className="pd-employee-panels"
                    onSubmit={handleSaveProfile}
                    noValidate
                  >
                    <section className="pd-client-detail__section pd-employee-panel">
                      <div className="pd-client-detail__section-head">
                        <SectionTitle icon={Contact}>
                          Personal &amp; job details
                        </SectionTitle>
                      </div>
                      <p className="pd-employee-panel__lead">
                        Edit basics used for the staff directory, case
                        assignment, and payroll.
                      </p>
                      <div className="pd-employee-profile__grid">
                        <div
                          className={cx(
                            'pd-employee-profile__field',
                            draft.name !== employee.name && 'is-dirty',
                          )}
                        >
                          <Input
                            label="Full name"
                            required
                            value={draft.name}
                            onChange={(event) =>
                              updateDraft('name', event.target.value)
                            }
                          />
                        </div>
                        <div
                          className={cx(
                            'pd-employee-profile__field',
                            draft.status !== employee.status && 'is-dirty',
                          )}
                        >
                          <Select
                            label="Status"
                            options={STATUS_OPTIONS}
                            value={draft.status}
                            onChange={(event) =>
                              updateDraft(
                                'status',
                                event.target.value as EmployeeStatus,
                              )
                            }
                          />
                        </div>
                        <div
                          className={cx(
                            'pd-employee-profile__field',
                            draft.phone !== employee.phone && 'is-dirty',
                          )}
                        >
                          <Input
                            label="Phone"
                            type="tel"
                            value={draft.phone}
                            onChange={(event) =>
                              updateDraft('phone', event.target.value)
                            }
                          />
                        </div>
                        <div
                          className={cx(
                            'pd-employee-profile__field',
                            draft.email !== employee.email && 'is-dirty',
                          )}
                        >
                          <Input
                            label="Email"
                            type="email"
                            value={draft.email}
                            onChange={(event) =>
                              updateDraft('email', event.target.value)
                            }
                          />
                        </div>
                        <div
                          className={cx(
                            'pd-employee-profile__field',
                            draft.department !== employee.department &&
                              'is-dirty',
                          )}
                        >
                          <Input
                            label="Department"
                            value={draft.department}
                            onChange={(event) =>
                              updateDraft('department', event.target.value)
                            }
                          />
                        </div>
                        <div
                          className={cx(
                            'pd-employee-profile__field',
                            draft.designation !== employee.designation &&
                              'is-dirty',
                          )}
                        >
                          <Input
                            label="Designation"
                            value={draft.designation}
                            onChange={(event) =>
                              updateDraft('designation', event.target.value)
                            }
                          />
                        </div>
                        <div
                          className={cx(
                            'pd-employee-profile__field',
                            draft.joined !== employee.joined && 'is-dirty',
                          )}
                        >
                          <Input
                            label="Joined"
                            type="date"
                            value={draft.joined}
                            onChange={(event) =>
                              updateDraft('joined', event.target.value)
                            }
                          />
                        </div>
                        <div
                          className={cx(
                            'pd-employee-profile__field',
                            draft.salary !== employee.salary && 'is-dirty',
                          )}
                        >
                          <Input
                            label="Basic salary"
                            type="number"
                            value={String(draft.salary)}
                            onChange={(event) =>
                              updateDraft(
                                'salary',
                                Number(event.target.value) || 0,
                              )
                            }
                          />
                        </div>
                      </div>

                      {saveError ? (
                        <p className="pd-field__error" role="alert">
                          {saveError}
                        </p>
                      ) : null}
                      {saveOk ? (
                        <p className="pd-ops__meta" role="status">
                          {saveOk}
                        </p>
                      ) : null}

                      {dirty ? (
                        <div className="pd-employee-panel__actions">
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={saving}
                            onClick={() => {
                              setDraft(draftFromEmployee(employee))
                              setSaveError(undefined)
                              setSaveOk(undefined)
                            }}
                          >
                            Discard changes
                          </Button>
                          <Button type="submit" disabled={saving}>
                            {saving ? 'Saving…' : 'Save'}
                          </Button>
                        </div>
                      ) : null}
                    </section>
                  </form>
                ),
              },
              {
                id: 'attendance',
                label: <TabLabel icon={CalendarClock}>Attendance</TabLabel>,
                content: (
                  <div className="pd-employee-panels">
                    <section className="pd-client-detail__section pd-employee-panel">
                      <div className="pd-client-detail__section-head">
                        <SectionTitle icon={CalendarClock}>
                          Mark attendance
                        </SectionTitle>
                      </div>
                      <p className="pd-employee-panel__lead">
                        Pick a day and set Present, Late, or Absent.
                      </p>
                      <div className="pd-employee-panel__controls">
                        <Input
                          label="Day"
                          type="date"
                          value={date}
                          onChange={(event) => setDate(event.target.value)}
                        />
                        {onLeave ? (
                          <p className="pd-ops__meta pd-employee-panel__note">
                            On leave
                            {covering.leaveType
                              ? ` · ${covering.leaveType}`
                              : ''}{' '}
                            this day. Change it from Leave.
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
                      </div>
                    </section>

                    <section className="pd-client-detail__section pd-employee-panel">
                      <div className="pd-client-detail__section-head">
                        <SectionTitle icon={CalendarClock}>
                          Attendance history
                        </SectionTitle>
                      </div>
                      {dayMarks.length === 0 ? (
                        <EmptyState
                          title="No attendance marked"
                          description="Marked days will show up here."
                        />
                      ) : (
                        <div className="pd-employee-panel__table">
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
                                  <TableCell>
                                    {formatDisplayDate(record.startDate)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={dayBadgeVariant(record.kind)}
                                    >
                                      {record.kind}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{record.note ?? '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </section>
                  </div>
                ),
              },
              {
                id: 'leave',
                label: <TabLabel icon={CalendarOff}>Leave</TabLabel>,
                content: (
                  <div className="pd-employee-panels">
                    <section className="pd-client-detail__section pd-employee-panel">
                      <div className="pd-client-detail__section-head">
                        <SectionTitle icon={CalendarOff}>Leave</SectionTitle>
                        <Button
                          size="sm"
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
                      <p className="pd-employee-panel__lead">
                        Record a range when this person will be away.
                      </p>
                      {leaveRecords.length === 0 ? (
                        <EmptyState
                          title="No leave recorded"
                          description="Leave ranges will show up here."
                        />
                      ) : (
                        <div className="pd-employee-panel__table">
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
                                  <TableCell>
                                    {formatDisplayDate(record.startDate)}
                                  </TableCell>
                                  <TableCell>
                                    {formatDisplayDate(record.endDate)}
                                  </TableCell>
                                  <TableCell>{record.note ?? '-'}</TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setPendingLeaveId(record.id)
                                      }
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
                  </div>
                ),
              },
              {
                id: 'payroll',
                label: <TabLabel icon={Banknote}>Payroll</TabLabel>,
                content: (
                  <div className="pd-employee-panels">
                    <section className="pd-client-detail__section pd-employee-panel">
                      <div className="pd-client-detail__section-head">
                        <SectionTitle icon={Banknote}>
                          Monthly payslip
                        </SectionTitle>
                        <PayslipDownloadButton payslip={payslip} />
                      </div>
                      <p className="pd-employee-panel__lead">
                        Company-branded payslip for the selected month. Download
                        as PDF with logo and agency details.
                      </p>
                      <div className="pd-employee-panel__controls">
                        <Input
                          label="Month"
                          type="month"
                          value={yearMonth}
                          onChange={(event) =>
                            setYearMonth(event.target.value)
                          }
                        />
                        <p className="pd-ops__meta pd-employee-panel__note">
                          {monthLabel}
                        </p>
                      </div>
                      <div className="pd-employee-panel__table">
                        <Table aria-label={`${employee.name} payroll`}>
                          <TableBody>
                            <TableRow>
                              <TableCell>Basic salary</TableCell>
                              <TableCell>
                                {formatSalary(line.salary)}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Unpaid days</TableCell>
                              <TableCell>
                                {line.unpaidDays === 0
                                  ? '-'
                                  : line.unpaidDays}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Deduction</TableCell>
                              <TableCell>
                                {line.deduction
                                  ? formatSalary(line.deduction)
                                  : '-'}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Net pay</TableCell>
                              <TableCell>
                                {formatSalary(line.net)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </section>

                    <section
                      className="pd-client-detail__section pd-employee-panel pd-employee-panel--payslip"
                      aria-label="Payslip preview"
                    >
                      <div className="pd-invoice-page__stage">
                        <PayslipDocument payslip={payslip} />
                      </div>
                    </section>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>

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
              setLeaveDraft((prev) => ({
                ...prev,
                endDate: event.target.value,
              }))
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

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete ${employee.name}?`}
        description="Removes this employee from the staff directory."
        confirmLabel="Delete employee"
        confirmVariant="danger"
        onConfirm={() => {
          deleteEmployee(employee.id)
          setDeleteOpen(false)
          navigate(hrEmployeesPath(), { replace: true })
        }}
      />
    </div>
  )
}
