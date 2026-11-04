export type EmployeeStatus = 'Active' | 'Inactive'

export type Employee = {
  id: string
  tenantId: string
  name: string
  phone: string
  /** Optional work contact email. */
  email: string
  department: string
  designation: string
  joined: string
  salary: number
  status: EmployeeStatus
  /** Optional profile photo (data URL or https). */
  avatarUrl?: string
}

export type EmployeeDraft = Omit<Employee, 'id' | 'tenantId' | 'status'> & {
  status?: EmployeeStatus
}

export type EmployeeUpdate = Partial<
  Omit<Employee, 'id' | 'tenantId'>
>
