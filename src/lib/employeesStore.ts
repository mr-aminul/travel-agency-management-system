import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID, TENANT_IDS } from '@/types/tenant'
import type { Employee, EmployeeDraft } from '@/types/employee'

type Listener = () => void

const SEED_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-7001',
    tenantId: TENANT_IDS.full,
    name: 'Karim Manager',
    phone: '01700090001',
    department: 'Recruitment',
    designation: 'Manager',
    joined: '2022-01-05',
    salary: 45000,
    status: 'Active',
  },
  {
    id: 'EMP-7002',
    tenantId: TENANT_IDS.full,
    name: 'Lima Accounts',
    phone: '01700094002',
    department: 'Accounts',
    designation: 'Accounts Officer',
    joined: '2023-03-12',
    salary: 35000,
    status: 'Active',
  },
  {
    id: 'EMP-7003',
    tenantId: TENANT_IDS.full,
    name: 'Sajid HR',
    phone: '01700095003',
    department: 'HR',
    designation: 'HR Executive',
    joined: '2024-06-01',
    salary: 28000,
    status: 'Active',
  },
  {
    id: 'EMP-M001',
    tenantId: TENANT_IDS.manpower,
    name: 'Karim Manager',
    phone: '01700090001',
    department: 'Recruitment',
    designation: 'Manager',
    joined: '2022-01-05',
    salary: 45000,
    status: 'Active',
  },
  {
    id: 'EMP-L001',
    tenantId: TENANT_IDS.leisure,
    name: 'Lima Accounts',
    phone: '01700094002',
    department: 'Accounts',
    designation: 'Accounts Officer',
    joined: '2023-03-12',
    salary: 35000,
    status: 'Active',
  },
]

let employees: Employee[] = SEED_EMPLOYEES.map((item) => ({ ...item }))
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return employees
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function nextId(existing: string[]) {
  const nums = existing
    .map((id) => Number(id.replace(/\D/g, '').slice(-4)))
    .filter((n) => !Number.isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `EMP-${String(next).padStart(4, '0')}`
}

export function useEmployees(): Employee[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () => all.filter((item) => item.tenantId === activeId),
    [all, activeId],
  )
}

export function getEmployeeById(id?: string | null): Employee | undefined {
  const value = id?.trim()
  if (!value) return undefined
  return employees.find((item) => item.id === value)
}

/** Resolves an assignment (employee id, or legacy free-text name) to a display name. */
export function getEmployeeDisplayName(assignedTo?: string | null): string {
  const value = assignedTo?.trim()
  if (!value) return ''
  return getEmployeeById(value)?.name ?? value
}

export function employeeAssignmentOptions(
  roster: Employee[],
  selectedId?: string,
): { value: string; label: string }[] {
  return roster
    .filter(
      (employee) => employee.status === 'Active' || employee.id === selectedId,
    )
    .map((employee) => ({
      value: employee.id,
      label: employee.name,
    }))
}

export function createEmployee(draft: EmployeeDraft): Employee {
  const created: Employee = {
    ...draft,
    id: nextId(employees.map((item) => item.id)),
    tenantId: tenantId(),
    name: draft.name.trim(),
    phone: draft.phone.trim(),
    department: draft.department.trim(),
    designation: draft.designation.trim(),
    status: draft.status ?? 'Active',
  }
  employees = [created, ...employees]
  emit()
  return created
}

export function formatSalary(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`
}
