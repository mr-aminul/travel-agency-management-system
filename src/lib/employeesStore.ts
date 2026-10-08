import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import {
  DATA_KEYS,
  injectClientSideSeeds,
  loadJsonParsed,
  saveJson,
} from '@/lib/data'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID, TENANT_IDS } from '@/types/tenant'
import type { Employee, EmployeeDraft } from '@/types/employee'

type Listener = () => void
const STORAGE_KEY = DATA_KEYS.employeesCreated

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

const SEED_IDS = new Set(SEED_EMPLOYEES.map((item) => item.id))
const listeners = new Set<Listener>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeEmployee(value: unknown): Employee | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  if (!id || !tenantId || !name) return undefined
  return {
    id,
    tenantId,
    name,
    phone: typeof value.phone === 'string' ? value.phone : '',
    department: typeof value.department === 'string' ? value.department : '',
    designation:
      typeof value.designation === 'string' ? value.designation : '',
    joined: typeof value.joined === 'string' ? value.joined : '',
    salary:
      typeof value.salary === 'number' && Number.isFinite(value.salary)
        ? value.salary
        : 0,
    status: value.status === 'Inactive' ? 'Inactive' : 'Active',
  }
}

function readCreated(): Employee[] {
  return loadJsonParsed(STORAGE_KEY, [] as Employee[], (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map(normalizeEmployee)
      .filter((item): item is Employee => item != null)
  })
}

function persist() {
  saveJson(
    STORAGE_KEY,
    injectClientSideSeeds()
      ? employees.filter((item) => !SEED_IDS.has(item.id))
      : employees,
  )
}

function mergeWithSeeds(created: Employee[]): Employee[] {
  if (!injectClientSideSeeds()) return created
  const createdIds = new Set(created.map((item) => item.id))
  return [
    ...SEED_EMPLOYEES.filter((item) => !createdIds.has(item.id)).map((item) => ({
      ...item,
    })),
    ...created,
  ]
}

let employees: Employee[] = mergeWithSeeds(readCreated())

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

function reloadFromStorage() {
  employees = mergeWithSeeds(readCreated())
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pd-data-rehydrated', reloadFromStorage)
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
  persist()
  emit()
  return created
}

export function formatSalary(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`
}
