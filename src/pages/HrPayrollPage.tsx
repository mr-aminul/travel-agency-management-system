import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote } from 'lucide-react'
import { formatSalary, useEmployees } from '@/lib/employeesStore'
import { useAttendance } from '@/lib/hrAttendance'
import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import { Input } from '@/components/clients/clientShadcnFields'
import {
  chromeHeadClass,
  elevatedPageClass,
} from '@/components/clients/shadcnChrome'
import { cn } from '@/lib/utils'
import { PayslipDocument } from '@/components/hr/PayslipDocument'
import { PayslipDownloadButton } from '@/components/hr/PayslipDownloadButton'
import {
  buildPayrollLines,
  currentYearMonth,
} from '@/lib/hrPayroll'
import { buildEmployeePayslip } from '@/lib/payslip'
import { useAgencyProfile } from '@/layout/useAgencyProfile'
import { layoutConfig } from '@/config/layout'
import { hrAttendancePath, hrEmployeePath, hrEmployeesPath } from '@/lib/workPaths'
import type { Employee } from '@/types/employee'
import type { PayrollLine } from '@/types/hr'
import '@/styles/layout-invoice.css'

export default function HrPayrollPage() {
  const employees = useEmployees()
  const attendance = useAttendance()
  const agencyProfile = useAgencyProfile()
  const [yearMonth, setYearMonth] = useState(currentYearMonth)
  const [payslip, setPayslip] = useState<{
    employee: Employee
    line: PayrollLine
  } | null>(null)

  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  )

  const lines = useMemo(
    () => buildPayrollLines(employees, attendance, yearMonth),
    [employees, attendance, yearMonth],
  )

  const totalNet = lines.reduce((sum, line) => sum + line.net, 0)
  const modalPayslip = payslip
    ? buildEmployeePayslip({
        employee: payslip.employee,
        line: payslip.line,
        yearMonth,
        profile: agencyProfile,
        defaultLogoUrl: layoutConfig.brand.logoUrl,
      })
    : null

  return (
    <div className={cn(elevatedPageClass, 'gap-5')} data-elevated-canvas aria-label="Payroll">
      <h1 className="m-0 text-xl font-semibold tracking-tight">Payroll</h1>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Month"
          type="month"
          value={yearMonth}
          onChange={(event) => setYearMonth(event.target.value)}
        />
        <p className="m-0 pb-2 text-sm text-muted-foreground">
          {lines.length} people · {formatSalary(totalNet)} net
        </p>
      </div>

      {lines.length === 0 ? (
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Banknote />
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
                <TableHead className={chromeHeadClass}>Salary</TableHead>
                <TableHead className={chromeHeadClass}>Unpaid Days</TableHead>
                <TableHead className={chromeHeadClass}>Deduction</TableHead>
                <TableHead className={chromeHeadClass}>Net</TableHead>
                <TableHead className={chromeHeadClass}> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const employee = employeeById.get(line.employeeId)
                if (!employee) return null
                return (
                  <TableRow key={line.employeeId}>
                    <TableCell>
                      <Link
                        className="text-primary underline-offset-2 hover:underline"
                        to={hrEmployeePath(employee.id, 'payroll')}
                      >
                        {employee.name}
                      </Link>
                    </TableCell>
                    <TableCell>{formatSalary(line.salary)}</TableCell>
                    <TableCell>
                      {line.unpaidDays === 0 ? (
                        '-'
                      ) : (
                        <Link
                          className="text-primary underline-offset-2 hover:underline"
                          to={hrAttendancePath()}
                        >
                          {line.unpaidDays}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell>
                      {line.deduction ? formatSalary(line.deduction) : '-'}
                    </TableCell>
                    <TableCell>{formatSalary(line.net)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg"
                        onClick={() => setPayslip({ employee, line })}
                      >
                        Payslip
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={payslip !== null}
        onOpenChange={(next) => {
          if (!next) setPayslip(null)
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border border-border bg-card shadow-[var(--shadow-deep)] ring-0">
          <DialogHeader>
            <DialogTitle>
              {payslip ? `Payslip · ${payslip.employee.name}` : 'Payslip'}
            </DialogTitle>
          </DialogHeader>
          {modalPayslip ? (
            <div className="pd-invoice-page__stage overflow-auto">
              <PayslipDocument payslip={modalPayslip} />
            </div>
          ) : null}
          <DialogFooter className="border-0 bg-transparent">
            {modalPayslip ? <PayslipDownloadButton payslip={modalPayslip} /> : null}
            <Button
              variant="outline"
              className="h-9 rounded-lg"
              onClick={() => setPayslip(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
