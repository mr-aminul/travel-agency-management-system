import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  SearchField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import {
  createEmployee,
  formatSalary,
  useEmployees,
} from '@/lib/employeesStore'
import { hrEmployeePath } from '@/lib/workPaths'
import { formatDisplayDate } from '@/lib/formatDate'
import type { EmployeeDraft } from '@/types/employee'
import '@/styles/layout-ops.css'

const emptyEmployee = (): EmployeeDraft => ({
  name: '',
  phone: '',
  department: '',
  designation: '',
  joined: new Date().toISOString().slice(0, 10),
  salary: 0,
})

export default function HrPage() {
  const employees = useEmployees()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<EmployeeDraft>(emptyEmployee)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((employee) =>
      [
        employee.id,
        employee.name,
        employee.department,
        employee.designation,
        employee.phone,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [employees, query])

  return (
    <div className="pd-page pd-ops" aria-label="HR">
      <PageHeader
        title="Employees"
        description="Staff directory for case assignment. Salary is the starting number for Payroll."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> New employee
          </Button>
        }
      />

      <div className="pd-ops__toolbar">
        <SearchField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, department, or phone"
        />
        <p className="pd-ops__meta">
          {filtered.length} of {employees.length}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No employees found"
          description={
            query.trim()
              ? 'Try a different name or department.'
              : 'Add the first employee to start the staff list.'
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Salary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((employee) => (
              <TableRow
                key={employee.id}
                className="pd-ops__data-row"
                onClick={() => navigate(hrEmployeePath(employee.id))}
              >
                <TableCell>{employee.name}</TableCell>
                <TableCell className="pd-table__code">{employee.id}</TableCell>
                <TableCell>{employee.phone}</TableCell>
                <TableCell>{employee.department}</TableCell>
                <TableCell>{employee.designation}</TableCell>
                <TableCell>{formatDisplayDate(employee.joined)}</TableCell>
                <TableCell>{formatSalary(employee.salary)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New employee"
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!draft.name.trim()) return
                const created = createEmployee(draft)
                setDraft(emptyEmployee())
                setOpen(false)
                navigate(hrEmployeePath(created.id))
              }}
            >
              Create employee
            </Button>
          </>
        }
      >
        <div className="pd-ops-form pd-ops-form--2">
          <Input
            label="Name"
            value={draft.name}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, name: event.target.value }))
            }
          />
          <Input
            label="Phone"
            value={draft.phone}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, phone: event.target.value }))
            }
          />
          <Input
            label="Department"
            value={draft.department}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, department: event.target.value }))
            }
          />
          <Input
            label="Designation"
            value={draft.designation}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, designation: event.target.value }))
            }
          />
          <Input
            label="Joined"
            type="date"
            value={draft.joined}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, joined: event.target.value }))
            }
          />
          <Input
            label="Salary"
            type="number"
            value={String(draft.salary)}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                salary: Number(event.target.value) || 0,
              }))
            }
          />
        </div>
      </Modal>
    </div>
  )
}
