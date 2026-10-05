export type UserRole = 'platform_admin' | 'agency_user'

export type TenantStatus = 'trial' | 'active' | 'suspended'

export type ModuleId =
  | 'finance'
  | 'documents'
  | 'hr'
  | 'partners'
  | 'services.touristVisa'
  | 'services.studentVisa'
  | 'services.workPermitVisa'
  | 'services.hajjUmrahVisa'
  | 'services.medicalVisa'
  | 'services.airTicket'
  | 'services.hotelBooking'
  | 'services.tourPackage'

export type Tenant = {
  id: string
  slug: string
  name: string
  status: TenantStatus
  enabledModules: ModuleId[]
}

export type TenantMemberRole = 'owner' | 'manager' | 'staff'

export type TenantMemberStatus = 'active' | 'invited' | 'disabled'

export type TenantMember = {
  id: string
  tenantId: string
  name: string
  email: string
  role: TenantMemberRole
  status: TenantMemberStatus
}

export const TENANT_IDS = {
  leisure: 'tenant-leisure',
  manpower: 'tenant-manpower',
  full: 'tenant-full',
} as const

export const DEFAULT_TENANT_ID = TENANT_IDS.full
