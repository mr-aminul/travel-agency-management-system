export type SubAgentStatus = 'Active' | 'Inactive'

export type SubAgent = {
  id: string
  tenantId: string
  name: string
  phone: string
  email?: string
  address?: string
  licenseNumber?: string
  branch?: string
  photoUrl?: string
  status: SubAgentStatus
  createdAt: string
}

export type SubAgentDraft = Omit<
  SubAgent,
  'id' | 'tenantId' | 'createdAt' | 'status'
> & {
  status?: SubAgentStatus
}
