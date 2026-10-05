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
    name: 'Md. Karim Ahmed',
    phone: '01711234567',
    department: 'Recruitment',
    designation: 'Recruitment Manager',
    joined: '2022-01-05',
    salary: 55000,
    status: 'Active',
  },
  {
    id: 'EMP-7002',
    tenantId: TENANT_IDS.full,
    name: 'Lima Chowdhury',
    phone: '01713445566',
    department: 'Accounts',
    designation: 'Accounts Officer',
    joined: '2023-03-12',
    salary: 38000,
    status: 'Active',
  },
  {
    id: 'EMP-7003',
    tenantId: TENANT_IDS.full,
    name: 'Sajid Hasan',
    phone: '01819667788',
    department: 'HR',
    designation: 'HR Executive',
    joined: '2024-06-01',
    salary: 32000,
    status: 'Active',
  },
  {
    id: 'EMP-7004',
    tenantId: TENANT_IDS.full,
    name: 'Tahmina Akter',
    phone: '01611882233',
    department: 'Student Services',
    designation: 'Education Counsellor',
    joined: '2023-08-20',
    salary: 35000,
    status: 'Active',
  },
  {
    id: 'EMP-7005',
    tenantId: TENANT_IDS.full,
    name: 'Rashidul Islam',
    phone: '01913556677',
    department: 'Hajj & Umrah',
    designation: 'Hajj Coordinator',
    joined: '2021-11-10',
    salary: 42000,
    status: 'Active',
  },
  {
    id: 'EMP-7006',
    tenantId: TENANT_IDS.full,
    name: 'Mehnaz Sultana',
    phone: '01552339876',
    department: 'Leisure',
    designation: 'Travel Consultant',
    joined: '2024-02-15',
    salary: 30000,
    status: 'Active',
  },
  {
    id: 'EMP-7007',
    tenantId: TENANT_IDS.full,
    name: 'Farzana Islam',
    phone: '01722990011',
    department: 'Ticketing',
    designation: 'Senior Ticketing Officer',
    joined: '2022-09-01',
    salary: 36000,
    status: 'Active',
  },
  {
    id: 'EMP-7008',
    tenantId: TENANT_IDS.full,
    name: 'Mahmudul Hasan',
    phone: '01817004455',
    department: 'Recruitment',
    designation: 'Documentation Officer',
    joined: '2025-01-12',
    salary: 28000,
    status: 'Active',
  },
  {
    id: 'EMP-7009',
    tenantId: TENANT_IDS.full,
    name: 'Anwar Hossain',
    phone: '01798881234',
    department: 'Operations',
    designation: 'Branch Supervisor',
    joined: '2020-06-18',
    salary: 40000,
    status: 'Inactive',
  },
  {
    id: 'EMP-M001',
    tenantId: TENANT_IDS.manpower,
    name: 'Rafiqul Islam',
    phone: '01715443322',
    department: 'Recruitment',
    designation: 'Recruitment Manager',
    joined: '2021-04-08',
    salary: 52000,
    status: 'Active',
  },
  {
    id: 'EMP-M002',
    tenantId: TENANT_IDS.manpower,
    name: 'Sharmin Akter',
    phone: '01819227744',
    department: 'Recruitment',
    designation: 'Documentation Officer',
    joined: '2023-07-19',
    salary: 28000,
    status: 'Active',
  },
  {
    id: 'EMP-M003',
    tenantId: TENANT_IDS.manpower,
    name: 'Kamrul Hasan',
    phone: '01614778899',
    department: 'Accounts',
    designation: 'Accounts Officer',
    joined: '2022-11-03',
    salary: 34000,
    status: 'Active',
  },
  {
    id: 'EMP-L001',
    tenantId: TENANT_IDS.leisure,
    name: 'Farzana Rahman',
    phone: '01718889900',
    department: 'Leisure',
    designation: 'Travel Consultant',
    joined: '2022-05-16',
    salary: 36000,
    status: 'Active',
  },
  {
    id: 'EMP-L002',
    tenantId: TENANT_IDS.leisure,
    name: 'Imran Chowdhury',
    phone: '01911223344',
    department: 'Ticketing',
    designation: 'Ticketing Officer',
    joined: '2024-03-04',
    salary: 28000,
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
