export type EmployeeStatus = 'Active' | 'Inactive'

export type Employee = {
  id: string
  tenantId: string
  name: string
  phone: string
  department: string
  designation: string
  joined: string
  salary: number
  status: EmployeeStatus
}

export type EmployeeDraft = Omit<Employee, 'id' | 'tenantId' | 'status'> & {
  status?: EmployeeStatus
}
