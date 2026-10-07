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
  passportPlaceOfIssue?: string
  /** Scan attached from the client Documents drawer. */
  passportFile?: ClientFileRef
  nidFile?: ClientFileRef
  avatarUrl?: string
  /** Sub agent who referred this client. */
  subAgentId?: string
  /** Services this client has engaged — derived from requests + intake. */
  services: ServiceType[]
  /** Sum of open service-request balances. */
  balance: number
  /** Count of non-completed/cancelled services. */
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
  passportPlaceOfIssue?: string
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
  primaryService: ServiceType
  idChecked: boolean
}

export type UpdateClientInput = Partial<
  Omit<Client, 'id' | 'tenantId' | 'createdAt'>
>
