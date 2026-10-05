/** Per-page access level for an employee. */
export type PageAccessLevel = 'none' | 'view' | 'edit'

export const PAGE_ACCESS_LEVELS: PageAccessLevel[] = ['none', 'view', 'edit']

export type UserPageAccess = {
  tenantId: string
  employeeId: string
  pagePath: string
  level: PageAccessLevel
}
