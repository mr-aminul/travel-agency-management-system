import type { ServiceType } from '@/types/case'

export type { ServiceType }

export type ClientGender = 'Male' | 'Female' | 'Other'

export type ClientMaritalStatus = 'Single' | 'Married' | 'Divorced' | 'Widowed'

export type ClientFileRef = {
  fileId: string
  fileName: string
  mimeType?: string
}

export type Client = {
  id: string
  tenantId: string
  name: string
  banglaName?: string
  fatherName?: string
  motherName?: string
  dateOfBirth?: string
  gender?: ClientGender
  maritalStatus?: ClientMaritalStatus
  nationality?: string
  placeOfBirth?: string
  spouseName?: string
  bloodGroup?: string
  phone: string
  whatsapp?: string
  email?: string
  address?: string
  presentAddress?: string
  permanentAddress?: string
  district?: string
  upazila?: string
  education?: string
  profession?: string
  skillTrade?: string
  experience?: string
  previousOverseasExp?: string
  preferredCountry?: string
  preferredJob?: string
  /** Values for tenant-defined profile fields, keyed by field id. */
  customFields?: Record<string, string>
  expectedSalary?: string
  contractAmount?: number
  branch?: string
  nid?: string
  passport?: string
  passportExpiry?: string
  passportIssuedOn?: string
  /** Scan attached from the client Documents drawer. */
  passportFile?: ClientFileRef
  nidFile?: ClientFileRef
  avatarUrl?: string
  /** Sub agent who referred this client. */
  subAgentId?: string
  /**
   * Legacy persisted cache. Prefer `deriveClientServices(cases)`.
   * Kept so older JSON blobs still load; new writes keep this empty.
   */
  services: ServiceType[]
  /**
   * Legacy persisted cache. Prefer `deriveClientBalance(cases)`.
   * Kept so older JSON blobs still load; new writes keep this at 0.
   */
  balance: number
  /**
   * Legacy persisted cache. Prefer `deriveClientActiveCases(cases)`.
   * Kept so older JSON blobs still load; new writes keep this at 0.
   */
  activeCases: number
  idChecked: boolean
  createdAt: string
  /** When set, client is archived and hidden from the default list. */
  archivedAt?: string
}

/** Soft-deleted client kept in Trash until expiry or permanent delete. */
export type TrashedClient = {
  client: Client
  deletedAt: string
}

export type CreateClientInput = {
  name: string
  phone: string
  email?: string
  address?: string
  nid?: string
  passport?: string
  passportExpiry?: string
  passportIssuedOn?: string
  banglaName?: string
  fatherName?: string
  motherName?: string
  dateOfBirth?: string
  gender?: ClientGender
  maritalStatus?: ClientMaritalStatus
  nationality?: string
  placeOfBirth?: string
  spouseName?: string
  bloodGroup?: string
  whatsapp?: string
  presentAddress?: string
  permanentAddress?: string
  district?: string
  upazila?: string
  education?: string
  profession?: string
  skillTrade?: string
  experience?: string
  previousOverseasExp?: string
  preferredCountry?: string
  preferredJob?: string
  customFields?: Record<string, string>
  expectedSalary?: string
  contractAmount?: number
  branch?: string
  subAgentId?: string
  avatarUrl?: string
  /**
   * Public intake only: which service the person asked for.
   * Not stored on the Client row — callers open a Service file separately.
   */
  primaryService?: ServiceType
  idChecked: boolean
}

export type UpdateClientInput = Partial<
  Omit<Client, 'id' | 'tenantId' | 'createdAt'>
>
