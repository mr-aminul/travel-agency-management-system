import { Ban, CheckCircle2, CircleOff, Eye, Pencil, Users } from 'lucide-react'
import {
  Avatar,
  Badge,
  EmptyState,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type SelectOption,
} from '@/components/ui'
import { SettingsInfo } from '@/components/settings/SettingsInfo'
import { layoutConfig } from '@/config/layout'
import { buildAccessPageColumns } from '@/lib/accessPages'
import { useEmployees } from '@/lib/employeesStore'
import {
  getPageAccessLevel,
  setPageAccessLevel,
  useUserPageAccess,
} from '@/lib/userAccessStore'
import type { PageAccessLevel } from '@/types/userAccess'

const ACCESS_OPTIONS: SelectOption[] = [
  { value: 'none', label: 'None', icon: Ban },
  { value: 'view', label: 'View', icon: Eye },
  { value: 'edit', label: 'Edit', icon: Pencil },
]

const PAGE_COLUMNS = buildAccessPageColumns(layoutConfig.navItems)

function isPageAccessLevel(value: string): value is PageAccessLevel {
  return value === 'none' || value === 'view' || value === 'edit'
}

function employeeSubtitle(designation: string, department: string): string {
  return [designation.trim(), department.trim()].filter(Boolean).join(', ')
}

export function UserAccessSection({
  title,
  info,
}: {
  title: string
  info: string
}) {
  const employees = useEmployees()
  const accessEntries = useUserPageAccess()

  if (employees.length === 0) {
    return (
      <div className="pd-settings-section">
        <header className="pd-settings-panel__header pd-settings-panel__header--flush">
          <h2 id="settings-panel-title" className="pd-settings-panel__title">
            {title}
          </h2>
          <SettingsInfo title={title} body={info} />
        </header>
        <EmptyState
          icon={Users}
          title="No employees yet"
          description="Add people under HR → Employees, then set their page access here."
        />
      </div>
    )
  }

  return (
    <div className="pd-settings-section">
      <header className="pd-settings-panel__header pd-settings-panel__header--flush">
        <h2 id="settings-panel-title" className="pd-settings-panel__title">
          {title}
        </h2>
        <SettingsInfo title={title} body={info} />
      </header>

      <div className="pd-user-access">
        <Table aria-label={title}>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Status</TableHead>
              {PAGE_COLUMNS.map((page) => (
                <TableHead key={page.id} title={page.path}>
                  {page.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <span className="pd-user-access__person">
                    <Avatar name={employee.name} size="sm" />
                    <span className="pd-user-access__person-meta">
                      <span className="pd-user-access__name">
                        {employee.name}
                      </span>
                      <span className="pd-user-access__role">
                        {employeeSubtitle(
                          employee.designation,
                          employee.department,
                        )}
                      </span>
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      employee.status === 'Active' ? 'completed' : 'on-hold'
                    }
                    icon={
                      employee.status === 'Active' ? CheckCircle2 : CircleOff
                    }
                  >
                    {employee.status}
                  </Badge>
                </TableCell>
                {PAGE_COLUMNS.map((page) => {
                  const level = getPageAccessLevel(
                    employee.id,
                    page.path,
                    accessEntries,
                  )
                  return (
                    <TableCell key={page.id} className="pd-user-access__cell">
                      <Select
                        size="sm"
                        aria-label={`${page.label} access for ${employee.name}`}
                        className={`pd-user-access__select is-${level}`}
                        value={level}
                        options={ACCESS_OPTIONS}
                        onChange={(event) => {
                          const next = event.target.value
                          if (!isPageAccessLevel(next)) return
                          setPageAccessLevel(employee.id, page.path, next)
                        }}
                      />
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
