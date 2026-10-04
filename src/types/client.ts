import type { ServiceType } from '@/types/case'

export type { ServiceType }

export type ClientStatus = 'Active' | 'Deployed' | 'Lead' | 'Inactive'

export type Client = {
  id: string
  tenantId: string
  name: string
  phone: string
  email?: string
  address?: string
  nid?: string
  passport?: string
  avatarUrl?: string
  /** Services this client has engaged — derived from cases + intake choice. */
  services: ServiceType[]
  /** Sum of open case balances — derived from cases. */
  balance: number
  /** Count of non-completed/cancelled cases — derived from cases. */
  activeCases: number
  status: ClientStatus
  idChecked: boolean
  createdAt: string
}

export type CreateClientInput = {
  name: string
  phone: string
  email?: string
  address?: string
  nid?: string
  passport?: string
  primaryService: ServiceType
  idChecked: boolean
  /** When true, UI should immediately open a first case. */
  openFirstCase?: boolean
}

export type UpdateClientInput = Partial<
  Omit<Client, 'id' | 'tenantId' | 'createdAt'>
>
