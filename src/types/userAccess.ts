/** Per-page access level for an agency user (tenant member). */
export type PageAccessLevel = 'none' | 'view' | 'edit'

export const PAGE_ACCESS_LEVELS: PageAccessLevel[] = ['none', 'view', 'edit']

export type UserPageAccess = {
  tenantId: string
  /** Tenant member id (agency user with login). */
  memberId: string
  pagePath: string
  level: PageAccessLevel
}
