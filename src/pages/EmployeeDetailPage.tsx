import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card'
import { ConfirmDialog } from '@/components/shadcn/confirm-dialog'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import { FieldError } from '@/components/shadcn/field'
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
import { ProfilePhotoField } from '@/components/ProfilePhotoField'
import { PayslipDocument } from '@/components/hr/PayslipDocument'
import { PayslipDownloadButton } from '@/components/hr/PayslipDownloadButton'
import {
  ArrowLeft,
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
import { cn } from '@/lib/utils'
import '@/styles/layout-invoice.css'

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

function statusBadgeVariant(status: EmployeeStatus) {
  return status === 'Active' ? ('default' as const) : ('secondary' as const)
}

function dayBadgeVariant(kind: string) {
  if (kind === 'Present') return 'default' as const
  if (kind === 'Late') return 'secondary' as const
  if (kind === 'Absent') return 'destructive' as const
  return 'outline' as const
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
    <span className="text-muted-foreground">-</span>
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
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
        aria-hidden
      >
        <Icon size={16} strokeWidth={2.25} />
      </span>
      {children}
    </span>
  )
}

function DetailTabs({
  value,
  onValueChange,
  items,
}: {
  value: string
  onValueChange: (value: string) => void
  items: { id: string; label: ReactNode; content: ReactNode }[]
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  const updateIndicator = useCallback(() => {
    const button = buttonRefs.current.get(value)
    if (!button) return
    const next = { left: button.offsetLeft, width: button.offsetWidth }
    setIndicator((prev) =>
      prev && prev.left === next.left && prev.width === next.width ? prev : next,
    )
  }, [value])

  useLayoutEffect(() => {
    updateIndicator()
  }, [updateIndicator, items.length])

  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => updateIndicator())
    observer.observe(root)
    window.addEventListener('resize', updateIndicator)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateIndicator)
    }
  }, [updateIndicator])

  const active = items.find((item) => item.id === value) ?? items[0]

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={rootRef}
        role="tablist"
        aria-label="Employee sections"
        className="relative inline-flex h-9 max-w-full items-stretch self-start overflow-x-auto rounded-lg border border-input bg-card p-0.5"
      >
        {indicator ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-0.5 bottom-0.5 z-0 rounded-md bg-primary transition-[left,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ left: indicator.left, width: indicator.width } as CSSProperties}
          />
        ) : null}
        {items.map((item) => {
          const isActive = item.id === value
          return (
            <Button
              key={item.id}
              ref={(node) => {
                if (node) buttonRefs.current.set(item.id, node)
                else buttonRefs.current.delete(item.id)
              }}
              type="button"
              variant="ghost"
              role="tab"
              aria-selected={isActive}
              className={cn(
                'relative z-[1] h-full min-h-0 shrink-0 rounded-md px-3 text-sm font-medium shadow-none',
                isActive
                  ? 'text-primary-foreground hover:!bg-transparent hover:text-primary-foreground'
                  : 'text-muted-foreground hover:!bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)] hover:text-foreground',
              )}
              onClick={() => onValueChange(item.id)}
            >
              {item.label}
            </Button>
          )
        })}
      </div>
      <div role="tabpanel">{active?.content}</div>
    </div>
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

  const fieldClass = (isDirty: boolean) =>
    cn(
      'rounded-lg transition-[box-shadow]',
      isDirty && 'ring-1 ring-primary/40',
    )

  return (
    <div
      className={cn(elevatedPageClass, 'gap-5')}
      data-elevated-canvas
      aria-label={employee.name}
    >
      <Button variant="ghost" className="h-9 w-fit gap-1.5 rounded-lg px-2" asChild>
        <Link to={hrEmployeesPath()}>
          <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
          Employees
        </Link>
      </Button>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
        <aside
          className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-0 lg:z-[1] lg:max-h-[calc(100dvh-8.5rem)] lg:overflow-y-auto"
          aria-label="Employee profile"
        >
          <div className="flex shrink-0 flex-col items-center gap-2 text-center">
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
            <div className="flex flex-col items-center justify-center gap-1">
              <h1 className="m-0 text-[1.0625rem] font-semibold leading-tight tracking-tight">
                {displayName}
              </h1>
              <Badge variant={statusBadgeVariant(draft.status)}>{draft.status}</Badge>
              {draft.designation || draft.department ? (
                <p className="m-0 text-xs font-medium leading-snug text-muted-foreground">
                  {[draft.designation, draft.department]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              ) : null}
            </div>
          </div>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-8 w-full rounded-lg"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 size={14} strokeWidth={2.25} data-icon="inline-start" />
            Delete
          </Button>

          <dl className="m-0 flex shrink-0 flex-col overflow-hidden rounded-[0.625rem] border border-border bg-background">
            {(
              [
                ['Employee ID', <span className="font-mono text-xs">{employee.id}</span>],
                ['Phone', emptyOr(draft.phone)],
                ['Email', emptyOr(draft.email)],
                ['Department', emptyOr(draft.department)],
                ['Designation', emptyOr(draft.designation)],
                ['Salary', formatSalary(draft.salary)],
                [
                  'Joined',
                  draft.joined ? (
                    formatDisplayDate(draft.joined)
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  ),
                ],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-2 border-b border-border px-2.5 py-1.5 last:border-b-0"
              >
                <dt className="m-0 pt-0.5 text-[0.625rem] font-medium tracking-wide text-muted-foreground leading-snug">
                  {label}
                </dt>
                <dd className="m-0 min-w-0 text-[0.8125rem] font-normal leading-snug text-foreground break-words">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-2 gap-2" aria-label="Snapshot">
            <button
              type="button"
              className="flex flex-col gap-0.5 rounded-lg border border-border bg-background px-2.5 py-2 text-left transition-colors hover:bg-muted/50"
              onClick={() => selectTab('attendance')}
            >
              <span className="text-[0.625rem] font-medium tracking-wide text-muted-foreground">
                Attendance
              </span>
              <span className="text-base font-semibold">{dayMarks.length}</span>
            </button>
            <button
              type="button"
              className="flex flex-col gap-0.5 rounded-lg border border-border bg-background px-2.5 py-2 text-left transition-colors hover:bg-muted/50"
              onClick={() => selectTab('leave')}
            >
              <span className="text-[0.625rem] font-medium tracking-wide text-muted-foreground">
                Leave
              </span>
              <span className="text-base font-semibold">{leaveRecords.length}</span>
            </button>
          </div>
        </aside>

        <div className="min-w-0" aria-label="Employee workspace">
          <DetailTabs
            value={activeTab}
            onValueChange={selectTab}
            items={[
              {
                id: 'profile',
                label: <TabLabel icon={Contact}>Profile</TabLabel>,
                content: (
                  <form className="flex flex-col gap-4" onSubmit={handleSaveProfile} noValidate>
                    <Card size="sm" className="shadow-sm">
                      <CardHeader>
                        <CardTitle>
                          <SectionTitle icon={Contact}>Personal & Job Details</SectionTitle>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className={fieldClass(draft.name !== employee.name)}>
                            <Input
                              id="employee-profile-full-name"
                              label="Full Name"
                              required
                              value={draft.name}
                              onChange={(event) =>
                                updateDraft('name', event.target.value)
                              }
                            />
                          </div>
                          <div className={fieldClass(draft.status !== employee.status)}>
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
                          <div className={fieldClass(draft.phone !== employee.phone)}>
                            <Input
                              label="Phone"
                              type="tel"
                              value={draft.phone}
                              onChange={(event) =>
                                updateDraft('phone', event.target.value)
                              }
                            />
                          </div>
                          <div className={fieldClass(draft.email !== employee.email)}>
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
                            className={fieldClass(
                              draft.department !== employee.department,
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
                            className={fieldClass(
                              draft.designation !== employee.designation,
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
                          <div className={fieldClass(draft.joined !== employee.joined)}>
                            <Input
                              label="Joined"
                              type="date"
                              value={draft.joined}
                              onChange={(event) =>
                                updateDraft('joined', event.target.value)
                              }
                            />
                          </div>
                          <div className={fieldClass(draft.salary !== employee.salary)}>
                            <Input
                              label="Basic Salary"
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
                          <FieldError role="alert">{saveError}</FieldError>
                        ) : null}
                        {saveOk ? (
                          <p className="m-0 text-sm text-muted-foreground" role="status">
                            {saveOk}
                          </p>
                        ) : null}

                        {dirty ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 rounded-lg"
                              disabled={saving}
                              onClick={() => {
                                setDraft(draftFromEmployee(employee))
                                setSaveError(undefined)
                                setSaveOk(undefined)
                              }}
                            >
                              Discard Changes
                            </Button>
                            <Button type="submit" className="h-9 rounded-lg" disabled={saving}>
                              {saving ? 'Saving…' : 'Save'}
                            </Button>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  </form>
                ),
              },
              {
                id: 'attendance',
                label: <TabLabel icon={CalendarClock}>Attendance</TabLabel>,
                content: (
                  <div className="flex flex-col gap-4">
                    <Card size="sm" className="shadow-sm">
                      <CardHeader>
                        <CardTitle>
                          <SectionTitle icon={CalendarClock}>Mark Attendance</SectionTitle>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-end gap-3">
                        <Input
                          label="Day"
                          type="date"
                          value={date}
                          onChange={(event) => setDate(event.target.value)}
                        />
                        {onLeave ? (
                          <p className="m-0 pb-2 text-sm text-muted-foreground">
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
                      </CardContent>
                    </Card>

                    <Card size="sm" className="shadow-sm">
                      <CardHeader>
                        <CardTitle>
                          <SectionTitle icon={CalendarClock}>Attendance History</SectionTitle>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {dayMarks.length === 0 ? (
                          <Empty className="border-0 p-4 shadow-none">
                            <EmptyHeader>
                              <EmptyMedia variant="icon">
                                <CalendarClock />
                              </EmptyMedia>
                              <EmptyTitle>No Attendance Marked</EmptyTitle>
                            </EmptyHeader>
                            <EmptyContent />
                          </Empty>
                        ) : (
                          <div className="overflow-auto rounded-xl border">
                            <Table aria-label={`${employee.name} attendance`}>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className={chromeHeadClass}>Date</TableHead>
                                  <TableHead className={chromeHeadClass}>Status</TableHead>
                                  <TableHead className={chromeHeadClass}>Note</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dayMarks.map((record) => (
                                  <TableRow key={record.id}>
                                    <TableCell>
                                      {formatDisplayDate(record.startDate)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={dayBadgeVariant(record.kind)}>
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
                      </CardContent>
                    </Card>
                  </div>
                ),
              },
              {
                id: 'leave',
                label: <TabLabel icon={CalendarOff}>Leave</TabLabel>,
                content: (
                  <Card size="sm" className="shadow-sm">
                    <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                      <CardTitle>
                        <SectionTitle icon={CalendarOff}>Leave</SectionTitle>
                      </CardTitle>
                      <Button
                        size="sm"
                        className="h-8 rounded-lg"
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
                        Record Leave
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {leaveRecords.length === 0 ? (
                        <Empty className="border-0 p-4 shadow-none">
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <CalendarOff />
                            </EmptyMedia>
                            <EmptyTitle>No Leave Recorded</EmptyTitle>
                          </EmptyHeader>
                          <EmptyContent />
                        </Empty>
                      ) : (
                        <div className="overflow-auto rounded-xl border">
                          <Table aria-label={`${employee.name} leave`}>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
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
                    </CardContent>
                  </Card>
                ),
              },
              {
                id: 'payroll',
                label: <TabLabel icon={Banknote}>Payroll</TabLabel>,
                content: (
                  <div className="flex flex-col gap-4">
                    <Card size="sm" className="shadow-sm">
                      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                        <CardTitle>
                          <SectionTitle icon={Banknote}>Monthly Payslip</SectionTitle>
                        </CardTitle>
                        <PayslipDownloadButton payslip={payslip} />
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-end gap-3">
                          <Input
                            label="Month"
                            type="month"
                            value={yearMonth}
                            onChange={(event) => setYearMonth(event.target.value)}
                          />
                          <p className="m-0 pb-2 text-sm text-muted-foreground">
                            {monthLabel}
                          </p>
                        </div>
                        <div className="overflow-auto rounded-xl border">
                          <Table aria-label={`${employee.name} payroll`}>
                            <TableBody>
                              <TableRow>
                                <TableCell>Basic Salary</TableCell>
                                <TableCell>{formatSalary(line.salary)}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Unpaid Days</TableCell>
                                <TableCell>
                                  {line.unpaidDays === 0 ? '-' : line.unpaidDays}
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
                                <TableCell>Net Pay</TableCell>
                                <TableCell>{formatSalary(line.net)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card
                      size="sm"
                      className="shadow-sm"
                      aria-label="Payslip preview"
                    >
                      <CardContent className="pt-6">
                        <div className="pd-invoice-page__stage overflow-auto">
                          <PayslipDocument payslip={payslip} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>

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
            <div className="sm:col-span-2">
              <Textarea
                label="Note"
                value={leaveDraft.note}
                onChange={(event) =>
                  setLeaveDraft((prev) => ({ ...prev, note: event.target.value }))
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

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete ${employee.name} from the staff directory?`}
        confirmLabel="Delete Employee"
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
