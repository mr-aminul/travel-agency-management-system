export type UserRole = 'platform_admin' | 'agency_user'

export type TenantStatus = 'trial' | 'active' | 'suspended'

export type ModuleId =
  | 'finance'
  | 'documents'
  | 'hr'
  | 'subAgents'
  | 'services.touristVisa'
  | 'services.studentVisa'
  | 'services.workPermitVisa'
  | 'services.hajjUmrahVisa'
  | 'services.medicalVisa'
  | 'services.airTicket'
  | 'services.hotelBooking'
  | 'services.tourPackage'

/**
 * Agency rules — see `agencyUserRules.ts`:
 * required at create: name (+ first owner credentials in the admin UI);
 * modules/status optional.
 */
export type Tenant = {
  id: string
  slug: string
  name: string
  status: TenantStatus
  enabledModules: ModuleId[]
}

export type CreateTenantInput = {
  name: string
  /** Defaults to a slug derived from name. */
  slug?: string
  /** Defaults to trial. */
  status?: TenantStatus
  /** Optional — configure later in settings. Defaults to none. */
  enabledModules?: ModuleId[]
}

export type TenantMemberRole = 'owner' | 'manager' | 'staff'

export type TenantMemberStatus = 'active' | 'invited' | 'disabled'

/**
 * Staff user rules — see `agencyUserRules.ts`:
 * required at create: name, email, tenantId, password;
 * role defaults to staff; status defaults to active once provisioned.
 */
export type TenantMember = {
  id: string
  tenantId: string
  name: string
  email: string
  role: TenantMemberRole
  status: TenantMemberStatus
}

export type CreateTenantMemberInput = {
  tenantId: string
  name: string
  email: string
  /** Initial sign-in password (admin-set). Not persisted on the member row. */
  password: string
  /** Defaults to staff. */
  role?: TenantMemberRole
  /** Defaults to active when a password is provisioned. */
  status?: TenantMemberStatus
}

export const TENANT_IDS = {
  leisure: 'tenant-leisure',
  manpower: 'tenant-manpower',
  full: 'tenant-full',
} as const

export const DEFAULT_TENANT_ID = TENANT_IDS.full
