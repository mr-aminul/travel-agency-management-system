import { useMemo, useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/shadcn/button'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import { Input as SearchInput } from '@/components/shadcn/input'
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
import { Input, Select } from '@/components/clients/clientShadcnFields'
import {
  chromeHeadClass,
  elevatedPageClass,
  floatingSheetClass,
  pureWhiteFieldClass,
  tableShellClass,
} from '@/components/clients/shadcnChrome'
import { cn } from '@/lib/utils'
import {
  createEmployee,
  formatSalary,
  useEmployees,
} from '@/lib/employeesStore'
import { hrEmployeePath } from '@/lib/workPaths'
import { formatDisplayDate } from '@/lib/formatDate'
import type { EmployeeDraft } from '@/types/employee'

const emptyEmployee = (): EmployeeDraft => ({
  name: '',
  phone: '',
  email: '',
  department: '',
  designation: '',
  joined: new Date().toISOString().slice(0, 10),
  salary: 0,
  status: 'Active',
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
    <div className={cn(elevatedPageClass, 'gap-5')} data-elevated-canvas aria-label="HR">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          className={cn(pureWhiteFieldClass, 'max-w-sm flex-1')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, department, or phone"
          aria-label="Search employees"
        />
        <p className="m-0 text-sm text-muted-foreground">
          {filtered.length} of {employees.length}
        </p>
        <Button
          className="ml-auto h-9 rounded-lg shadow-xs"
          onClick={() => setOpen(true)}
        >
          <Plus size={16} data-icon="inline-start" />
          New Employee
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No Employees Found</EmptyTitle>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      ) : (
        <div className={cn(tableShellClass, 'border-0')}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={chromeHeadClass}>Name</TableHead>
                <TableHead className={chromeHeadClass}>ID</TableHead>
                <TableHead className={chromeHeadClass}>Phone</TableHead>
                <TableHead className={chromeHeadClass}>Department</TableHead>
                <TableHead className={chromeHeadClass}>Designation</TableHead>
                <TableHead className={chromeHeadClass}>Joined</TableHead>
                <TableHead className={chromeHeadClass}>Salary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((employee) => (
                <TableRow
                  key={employee.id}
                  className="cursor-pointer"
                  onClick={() => navigate(hrEmployeePath(employee.id))}
                >
                  <TableCell>{employee.name}</TableCell>
                  <TableCell className="font-mono text-xs">{employee.id}</TableCell>
                  <TableCell>{employee.phone}</TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>{employee.designation}</TableCell>
                  <TableCell>{formatDisplayDate(employee.joined)}</TableCell>
                  <TableCell>{formatSalary(employee.salary)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false)
        }}
      >
        <SheetContent className={floatingSheetClass}>
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">New Employee</SheetTitle>
          </SheetHeader>
          <div className="grid gap-3 overflow-y-auto px-5 py-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              required
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
              label="Email"
              type="email"
              value={draft.email}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, email: event.target.value }))
              }
            />
            <Select
              label="Status"
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
              value={draft.status ?? 'Active'}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  status: event.target.value as 'Active' | 'Inactive',
                }))
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
              label="Basic Salary"
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
          <div className="mt-auto flex justify-end gap-2 border-t border-border px-5 py-4">
            <Button
              variant="outline"
              className="h-9 rounded-lg"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-9 rounded-lg"
              onClick={() => {
                if (!draft.name.trim()) return
                const created = createEmployee(draft)
                setDraft(emptyEmployee())
                setOpen(false)
                navigate(hrEmployeePath(created.id))
              }}
            >
              Create Employee
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
