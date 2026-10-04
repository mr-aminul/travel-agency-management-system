export type PartnerStatus = 'Active' | 'Inactive'

export type Partner = {
  id: string
  tenantId: string
  name: string
  phone: string
  email?: string
  address?: string
  licenseNumber?: string
  branch?: string
  photoUrl?: string
  status: PartnerStatus
  createdAt: string
}

export type PartnerDraft = Omit<
  Partner,
  'id' | 'tenantId' | 'createdAt' | 'status'
> & {
  status?: PartnerStatus
}
