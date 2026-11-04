import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatSalary, useEmployees } from '@/lib/employeesStore'
import { useAttendance } from '@/lib/hrAttendance'
import {
  Button,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { PayslipDocument } from '@/components/hr/PayslipDocument'
import { PayslipDownloadButton } from '@/components/hr/PayslipDownloadButton'
import {
  buildPayrollLines,
  currentYearMonth,
  formatYearMonthLabel,
} from '@/lib/hrPayroll'
import { buildEmployeePayslip } from '@/lib/payslip'
import { useAgencyProfile } from '@/layout/useAgencyProfile'
import { layoutConfig } from '@/config/layout'
import { hrAttendancePath, hrEmployeePath, hrEmployeesPath } from '@/lib/workPaths'
import type { Employee } from '@/types/employee'
import type { PayrollLine } from '@/types/hr'
import '@/styles/layout-ops.css'
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

  const monthLabel = formatYearMonthLabel(yearMonth)
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
    <div className="pd-page pd-ops" aria-label="Payroll">
      <PageHeader
        title="Payroll"
        description="One month at a time. Unpaid leave and absences from Attendance & Leave reduce net pay."
      />

      <div className="pd-ops__toolbar">
        <Input
          label="Month"
          type="month"
          value={yearMonth}
          onChange={(event) => setYearMonth(event.target.value)}
        />
        <p className="pd-ops__meta">
          {lines.length} people · {formatSalary(totalNet)} net
        </p>
      </div>

      {lines.length === 0 ? (
        <EmptyState
          title="No active employees"
          description="Add staff on Employees before running payroll."
          action={<Link to={hrEmployeesPath()}>Go to Employees</Link>}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Unpaid days</TableHead>
              <TableHead>Deduction</TableHead>
              <TableHead>Net</TableHead>
              <TableHead> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => {
              const employee = employeeById.get(line.employeeId)
              if (!employee) return null
              return (
                <TableRow key={line.employeeId}>
                  <TableCell>
                    <Link to={hrEmployeePath(employee.id, 'payroll')}>
                      {employee.name}
                    </Link>
                  </TableCell>
                  <TableCell>{formatSalary(line.salary)}</TableCell>
                  <TableCell>
                    {line.unpaidDays === 0 ? (
                      '-'
                    ) : (
                      <Link to={hrAttendancePath()}>{line.unpaidDays}</Link>
                    )}
                  </TableCell>
                  <TableCell>
                    {line.deduction ? formatSalary(line.deduction) : '-'}
                  </TableCell>
                  <TableCell>{formatSalary(line.net)}</TableCell>
                  <TableCell>
                    <Button
                      variant="secondary"
                      size="sm"
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
      )}

      <Modal
        open={payslip !== null}
        onClose={() => setPayslip(null)}
        title={payslip ? `Payslip · ${payslip.employee.name}` : 'Payslip'}
        className="pd-employee-payslip-dialog"
        actions={
          <>
            {modalPayslip ? (
              <PayslipDownloadButton payslip={modalPayslip} />
            ) : null}
            <Button variant="secondary" onClick={() => setPayslip(null)}>
              Close
            </Button>
          </>
        }
      >
        {modalPayslip ? (
          <div className="pd-invoice-page__stage pd-employee-payslip-modal">
            <PayslipDocument payslip={modalPayslip} />
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
